import os
import json
import shutil
import tempfile
import subprocess
from pathlib import Path
from dotenv import load_dotenv

# 1. Load .env explicitly BEFORE importing routes that depend on GROQ_API_KEY
backend_env = Path(__file__).resolve().parent / '.env'
root_env = Path(__file__).resolve().parent.parent / '.env'

if backend_env.exists():
    load_dotenv(dotenv_path=backend_env)
elif root_env.exists():
    load_dotenv(dotenv_path=root_env)
else:
    load_dotenv()

from git import Repo
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

try:
    from .config.base import settings
    from .scanner import run_full_scan
    from .api.hawk_ai_routes import hawk_ai_bp
except ImportError:
    from config.base import settings
    from scanner import run_full_scan
    from api.hawk_ai_routes import hawk_ai_bp

project_root = Path(__file__).resolve().parent.parent
frontend_dist = project_root / "frontend" / "dist"
app = Flask(__name__, static_folder=str(frontend_dist) if frontend_dist.exists() else None, static_url_path="/")

# 3. Enable CORS for all API routes so Vite/React UI can talk to Flask
CORS(app, resources={r"/api/*": {"origins": "*"}})

# 4. Register the HawkAI Assistant Blueprint
app.register_blueprint(hawk_ai_bp)

app.config["SECRET_KEY"] = getattr(settings, "SECRET_KEY", "default-secret-key")
app.config["MAX_CONTENT_LENGTH"] = getattr(settings, "MAX_UPLOAD_SIZE", 16 * 1024 * 1024)

# --- OPTIMIZATION MATRIX THRESHOLDS ---
MAX_REPO_SIZE_MB = 200
MAX_FILE_SIZE_MB = 1.5
MAX_FILE_COUNT = 10000

IGNORED_DIRS = {
    "node_modules", ".venv", "venv", ".git", "dist", "build",
    "__pycache__", ".idea", ".vscode", "coverage", "vendor"
}

IGNORED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".pdf",
    ".zip", ".tar", ".gz", ".7z", ".rar", ".exe", ".dll",
    ".so", ".dylib", ".min.js", ".min.css", ".map", ".mp4",
    ".mp3", ".ttf", ".woff", ".woff2", ".db", ".sqlite"
}


def is_git_url(path_str):
    """Helper to check if the provided path is an HTTP/HTTPS Git URL."""
    path_str = path_str.strip()
    return (
        path_str.startswith("http://") or 
        path_str.startswith("https://") or 
        path_str.endswith(".git")
    )


def check_repo_limits(target_path):
    """
    PRE-SCAN GUARDRAIL CHECK:
    Validates total repo size (<200MB) and total file count (<10,000 files)
    before running heavy scanner processes.
    """
    total_size_bytes = 0
    total_files = 0
    max_size_bytes = MAX_REPO_SIZE_MB * 1024 * 1024

    for root, dirs, files in os.walk(target_path):
        # Skip ignored directories early during directory traversal
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]

        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in IGNORED_EXTENSIONS or file.endswith(".min.js"):
                continue

            total_files += 1
            file_path = os.path.join(root, file)

            try:
                total_size_bytes += os.path.getsize(file_path)
            except OSError:
                continue

            # Threshold Check 1: Exceeded Max Repo Size (200 MB)
            if total_size_bytes > max_size_bytes:
                return {
                    "allowed": False,
                    "error": f"Repository size exceeds maximum allowed limit of {MAX_REPO_SIZE_MB}MB."
                }

            # Threshold Check 2: Exceeded Max File Count (10,000 files)
            if total_files > MAX_FILE_COUNT:
                return {
                    "allowed": False,
                    "error": f"Repository contains more than {MAX_FILE_COUNT:,} scannable files."
                }

    return {
        "allowed": True, 
        "files": total_files, 
        "size_mb": round(total_size_bytes / (1024 * 1024), 2)
    }


def normalize_semgrep_findings(data):
    """Convert Semgrep JSON into the dashboard's findings schema."""
    findings = []
    for item in (data or {}).get("results", []) or []:
        extra = item.get("extra", {})
        severity = extra.get("severity", "ERROR").upper()
        if severity in {"ERROR", "CRITICAL"}:
            normalized_severity = "Critical"
        elif severity in {"WARNING", "HIGH"}:
            normalized_severity = "High"
        else:
            normalized_severity = "Medium"

        findings.append({
            "type": item.get("check_id", extra.get("category", "Code vulnerability")),
            "severity": normalized_severity,
            "file": item.get("path", "Unknown"),
            "line": item.get("start", {}).get("line", 1),
            "match": extra.get("lines", "").strip(),
            "description": extra.get("message", "Potential code vulnerability detected"),
        })
    return findings


def normalize_trivy_findings(data):
    """Convert Trivy JSON into the dashboard's hygiene_issues schema."""
    issues = []
    for result in (data or {}).get("Results", []) or []:
        target_name = result.get("Target", "Unknown")

        for vuln in result.get("Vulnerabilities", []) or []:
            issues.append({
                "issue": f"{vuln.get('PkgName', 'Dependency')} ({vuln.get('VulnerabilityID', 'VULN')})",
                "severity": vuln.get("Severity", "Medium").capitalize(),
                "file": target_name,
                "description": f"Installed version: {vuln.get('InstalledVersion', 'unknown')} | Fixed version: {vuln.get('FixedVersion', 'not specified')}",
            })

        for secret in result.get("Secrets", []) or []:
            issues.append({
                "issue": secret.get("Title", "Secret detected"),
                "severity": secret.get("Severity", "High").capitalize(),
                "file": target_name,
                "description": f"Secret found at line {secret.get('StartLine', 1)}."
            })
    return issues


def run_semgrep(target_path):
    """Executes Semgrep SAST scan with CLI performance exclusions."""
    try:
        cmd = [
            "semgrep", "scan",
            "--config=auto",
            "--json",
            "--quiet",
            "--exclude=node_modules",
            "--exclude=.venv",
            "--exclude=.git",
            "--exclude=dist",
            "--exclude=build",
            "--exclude=*.min.js",
            "--exclude=*.pdf",
            "--max-target-bytes=1500000",
            target_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

        if not result.stdout:
            return {"results": []}

        data = json.loads(result.stdout)
        return data if isinstance(data, dict) else {"results": []}
    except Exception as e:
        print(f"[HardcodedHawk] Error running Semgrep: {e}")
        return {"results": []}


def run_trivy(target_path):
    """Executes Trivy filesystem scan with CLI directory skip flags."""
    try:
        cmd = [
            "trivy", "fs",
            "--format", "json",
            "--skip-dirs", "node_modules,.venv,.git,dist,build,vendor",
            "--skip-files", "*.min.js,*.pdf,*.zip",
            target_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

        if not result.stdout:
            return {"Results": []}

        data = json.loads(result.stdout)
        return data if isinstance(data, dict) else {"Results": []}
    except Exception as e:
        print(f"[HardcodedHawk] Error running Trivy: {e}")
        return {"Results": []}


@app.route("/")
def home():
    if frontend_dist.exists() and (frontend_dist / "index.html").exists():
        return send_from_directory(str(frontend_dist), "index.html")

    return {
        "project": "HardcodedHawk",
        "version": "1.0",
        "environment": getattr(settings, "FLASK_ENV", "development"),
        "status": "Running",
    }


@app.route("/<path:path>")
def serve_frontend(path):
    if frontend_dist.exists() and path and (frontend_dist / path).exists():
        return send_from_directory(str(frontend_dist), path)
    if frontend_dist.exists() and (frontend_dist / "index.html").exists():
        return send_from_directory(str(frontend_dist), "index.html")
    return jsonify({"error": "Frontend build not found"}), 404


@app.route("/api/scan", methods=["POST"])
def scan():
    data = request.get_json() or {}
    
    # Check for 'repo_path' or fallback to 'path' for UI compatibility
    raw_path = data.get("repo_path") or data.get("path") or ""
    raw_path = raw_path.strip()

    if not raw_path:
        return jsonify({"error": "Repository path or Git URL is required"}), 400

    temp_dir = None
    target_scan_path = raw_path

    try:
        # If input is a Public Git URL, clone it to a temp folder first
        if is_git_url(raw_path):
            temp_dir = tempfile.mkdtemp(prefix="hawk_repo_")
            print(f"[HardcodedHawk] Cloning remote repository {raw_path} into {temp_dir}...")
            
            # Shallow clone (depth=1) for faster download
            Repo.clone_from(raw_path, temp_dir, depth=1)
            target_scan_path = temp_dir

        # 1. OPTIMIZATION MATRIX PRE-SCAN CHECK
        guard = check_repo_limits(target_scan_path)
        if not guard["allowed"]:
            print(f"[HardcodedHawk Guardrail Block]: {guard['error']}")
            return jsonify({"error": guard["error"]}), 400

        print(f"[HardcodedHawk Metrics] Scannable Files: {guard['files']} | Total Size: {guard['size_mb']} MB")

        # 2. Call your existing full pipeline scanner engine
        print(f"[HardcodedHawk] Executing scan pipeline on: {target_scan_path}")
        result = run_full_scan(target_scan_path)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        # 3. Run real CLI scanners when available and merge them into the existing result schema
        print("[HardcodedHawk] Running CLI scanner integration (Semgrep + Trivy)...")
        semgrep_data = run_semgrep(target_scan_path)
        trivy_data = run_trivy(target_scan_path)

        semgrep_results = normalize_semgrep_findings(semgrep_data)
        trivy_results = normalize_trivy_findings(trivy_data)

        # 4. Combine findings into existing findings list
        existing_findings = result.get("findings", [])
        existing_hygiene = result.get("hygiene_issues", [])
        combined_findings = existing_findings + semgrep_results
        combined_hygiene = existing_hygiene + trivy_results
        result["findings"] = combined_findings
        result["hygiene_issues"] = combined_hygiene

        # 5. Recalculate health & risk scores based on new combined issues count
        total_issues = len(combined_findings) + len(combined_hygiene)
        risk_score = min(100, total_issues * 5)
        health_score = max(0, 100 - risk_score)

        if "scores" in result:
            result["scores"]["risk_score"] = risk_score
            result["scores"]["health_score"] = health_score
        else:
            result["riskScore"] = risk_score
            result["healthScore"] = health_score

        # 6. Append Engine notes to AI summary
        extra_summary = f"\n\n[Multi-Engine Integration] Core Engine Scan Completed. Analyzed target codebase with Semgrep + Trivy integration."
        if "ai_summary" in result and result["ai_summary"]:
            result["ai_summary"] += extra_summary
        else:
            result["ai_summary"] = extra_summary.strip()

        return jsonify(result)

    except Exception as e:
        print(f"[HardcodedHawk Error] {str(e)}")
        return jsonify({"error": f"Failed to clone/scan repository: {str(e)}"}), 500

    finally:
        # Clean up temporary folder after scan completes
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
            print(f"[HardcodedHawk] Successfully cleaned up temporary directory: {temp_dir}")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)