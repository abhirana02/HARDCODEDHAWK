import json
import math
import os
import re
import subprocess
import shutil
import tempfile
from pathlib import Path

# Your existing AI wrapper (no direct groq import needed here)
try:
    from .config.base import settings
    from .ai.hawk_ai import safe_groq_completion
except ImportError:
    from config.base import settings
    from ai.hawk_ai import safe_groq_completion

# ------------------------------------------------------------------
# Optimization & Exclusion Constants (FIXED TYPOS)
# ------------------------------------------------------------------
MAX_FILE_SIZE_BYTES = 1.5 * 1024 * 1024    # 1.5 MB per file
MAX_TOTAL_REPO_MB = 100                    # Prevent OOM
MAX_FILES_TO_SCAN = 2500                   # Cap for monoliths

DEFAULT_IGNORE_DIRS = {
    ".git", ".venv", "venv", "node_modules", "__pycache__",
    ".idea", ".vscode", "dist", "build", "coverage", "vendor"
}

IGNORED_EXTENSIONS = {   # <-- FIXED: was "EXPECTIONS"
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".pdf",
    ".zip", ".tar", ".gz", ".7z", ".rar", ".exe", ".dll",
    ".so", ".dylib", ".min.js", ".min.css", ".map", ".mp4",
    ".mp3", ".ttf", ".woff", ".woff2", ".eot", ".db", ".sqlite"
}

SELF_IGNORE_FILES = {
    "scanner.py", "language_detector.py", "rules.py", "config.py",
    ".env", ".env.local", ".env.development", ".env.production",
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml"
}

# ------------------------------------------------------------------
# SECRET PATTERNS (original, kept intact)
# ------------------------------------------------------------------
SECRET_PATTERNS = {
    "AWS Access Key": r"(?i)AKIA[0-9A-Z]{16}",
    "Generic API Key / Secret": r"(?i)(api[_-]?key|secret[_-]?key|access[_-]?token|password)\s*[:=]\s*['\"]([a-zA-Z0-9_\-]{16,})['\"]",
    "GitHub Personal Access Token": r"ghp_[a-zA-Z0-9]{36}",
    "Slack Token": r"xox[baprs]-[0-9a-zA-Z]{10,48}",
    "Private Key": r"-----BEGIN (RSA|OPENSSH|PRIVATE) KEY-----"
}

# ------------------------------------------------------------------
# NEW: VULNERABILITY PATTERNS (SAST for SQLi, XSS, RCE, LFI)
# ------------------------------------------------------------------
VULN_PATTERNS = {
    "SQL Injection": {
        "regex": r"(?i)(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|WHERE)\s+.*?\$_(GET|POST|REQUEST|COOKIE)\[",
        "severity": "High"
    },
    "XSS (Cross-Site Scripting)": {
        "regex": r"(?i)(echo|print|print_r|printf|vprintf|die|exit)\s*.*?\$_(GET|POST|REQUEST)\[",
        "severity": "High"
    },
    "Command Injection": {
        "regex": r"(?i)(exec|system|passthru|shell_exec|popen|proc_open)\s*\(.*?\$_(GET|POST|REQUEST)\[",
        "severity": "Critical"
    },
    "File Inclusion (LFI/RFI)": {
        "regex": r"(?i)(include|require|include_once|require_once)\s*\(.*?\$_(GET|POST|REQUEST)\[",
        "severity": "High"
    },
    "Hardcoded Credentials (generic)": {
        "regex": r"(?i)(password|passwd|pwd|secret)\s*=\s*['\"][^'\"]{4,}['\"]",
        "severity": "Critical"
    }
}

# ------------------------------------------------------------------
# Helper Functions (you already have mask_secret, entropy, etc.)
# ------------------------------------------------------------------
def mask_secret(secret_str):
    if len(secret_str) <= 8:
        return "*******"
    return secret_str[:4] + "..." + secret_str[-4:]

def calculate_shannon_entropy(data):
    if not data:
        return 0
    entropy = 0
    for x in set(data):
        p_x = float(data.count(x)) / len(data)
        entropy -= p_x * math.log(p_x, 2)
    return entropy

def is_suspicious_entropy_string(word):
    # keep your original filter
    CODE_KEYWORDS = [
        "http://", "https://", "SELECT", "INSERT", "UPDATE",
        "r\"(?i)", "r'(?i)'", "LANGUAGE_MAP", "SECRET_PATTERNS"   # <-- fixed typo
    ]
    if any(kw in word for kw in CODE_KEYWORDS):
        return False
    has_digit = any(c.isdigit() for c in word)
    has_alpha = any(c.isalpha() for c in word)
    if not (has_digit and has_alpha):
        return False
    return calculate_shannon_entropy(word) > 4.8

# ------------------------------------------------------------------
# STEP 1: Git History Scan (NEW)
# ------------------------------------------------------------------
def scan_git_history(repo_path):
    """Scan all historical diffs for secret patterns."""
    findings = []
    try:
        output = subprocess.check_output(
            ['git', 'log', '-p', '--all'],
            cwd=repo_path,
            text=True,
            stderr=subprocess.DEVNULL,
            timeout=30
        )
        # Use the same secret regex + entropy on the entire diff
        for secret_type, pattern in SECRET_PATTERNS.items():
            for match in re.finditer(pattern, output):
                # Extract surrounding lines for context
                start = max(0, match.start() - 100)
                end = min(len(output), match.end() + 100)
                snippet = output[start:end]
                findings.append({
                    "severity": "Critical",
                    "type": f"{secret_type} (in Git history)",
                    "file": "GIT_HISTORY",
                    "line": 0,
                    "description": f"Secret leaked in historical commit: {mask_secret(match.group())}",
                    "snippet": snippet.strip()
                })
    except Exception as e:
        print(f"[Git history scan skipped] {e}")
    return findings

# ------------------------------------------------------------------
# STEP 2: Directory Scan (YOUR original, but extended with vuln patterns)
# ------------------------------------------------------------------
def scan_directory(repo_path):
    """Recursively scan files for secrets + vulnerabilities + entropy."""
    findings = []
    skipped_files = []
    total_size_mb = 0
    file_count = 0

    if not os.path.exists(repo_path):
        return [], [], "Repository path does not exist."

    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in DEFAULT_IGNORE_DIRS]

        for file in files:
            if file in SELF_IGNORE_FILES:
                continue
            ext = os.path.splitext(file)[1].lower()
            if ext in IGNORED_EXTENSIONS or file.endswith(".min.js"):
                continue

            file_path = os.path.join(root, file)
            relative_path = os.path.relpath(file_path, repo_path)

            # Resource limits
            try:
                file_size = os.path.getsize(file_path)
                total_size_mb += file_size / (1024 * 1024)
                if total_size_mb > MAX_TOTAL_REPO_MB:
                    print(f"[Scanner] Stopped: total repo size > {MAX_TOTAL_REPO_MB} MB")
                    return findings, skipped_files, None
                if file_size > MAX_FILE_SIZE_BYTES:
                    size_mb = round(file_size / (1024 * 1024), 2)
                    skipped_files.append({
                        "file": relative_path,
                        "size": f"{size_mb} MB",
                        "reason": f"Exceeded size limit of {MAX_FILE_SIZE_BYTES/(1024*1024):.1f} MB"
                    })
                    continue
            except:
                continue

            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    for line_num, line in enumerate(f, start=1):
                        line_str = line.strip()
                        if not line_str:
                            continue

                        # ---- Secret patterns ----
                        for secret_type, pattern in SECRET_PATTERNS.items():
                            if re.search(pattern, line_str):
                                findings.append({
                                    "severity": "Critical",
                                    "type": secret_type,
                                    "file": relative_path,
                                    "line": line_num,
                                    "description": f"Hardcoded secret detected: {mask_secret(line_str)}",
                                    "snippet": line_str
                                })

                        # ---- Vulnerability patterns (NEW) ----
                        for vuln_name, vuln_info in VULN_PATTERNS.items():
                            if re.search(vuln_info["regex"], line_str):
                                findings.append({
                                    "severity": vuln_info["severity"],
                                    "type": vuln_name,
                                    "file": relative_path,
                                    "line": line_num,
                                    "description": f"Potential {vuln_name} pattern detected",
                                    "snippet": line_str
                                })

                        # ---- Entropy (High randomness) ----
                        words = line_str.split()
                        for word in words:
                            clean_word = word.strip("'\"=:,;()[]{}")
                            if len(clean_word) > 20 and is_suspicious_entropy_string(clean_word):
                                findings.append({
                                    "severity": "Medium",
                                    "type": "High Entropy String",
                                    "file": relative_path,
                                    "line": line_num,
                                    "description": f"High randomness string: {mask_secret(clean_word)}",
                                    "snippet": line_str
                                })

                file_count += 1
                if file_count >= MAX_FILES_TO_SCAN:
                    print(f"[Scanner] Reached file cap {MAX_FILES_TO_SCAN}. Stopping.")
                    return findings, skipped_files, None

            except Exception:
                continue

    return findings, skipped_files, None

# ------------------------------------------------------------------
# STEP 3: Per‑Finding AI Validation (NEW – uses Groq)
# ------------------------------------------------------------------
def validate_finding_with_groq(finding, api_key):
    """Ask Groq if a detected secret is real or a placeholder."""
    if not api_key or "YOUR" in api_key.upper() or "gsk_" not in api_key:
        finding["ai_confidence"] = 50
        finding["ai_verdict"] = "Not validated (no valid API key)"
        return finding

    prompt = f"""
You are a security auditor. Analyze this detected potential secret:
File: {finding.get('file')}
Line: {finding.get('line')}
Snippet: {finding.get('snippet', '')}

Is this a real, active credential or a placeholder/test/example?
Return JSON: {{"is_real": true/false, "confidence": 0-100, "reason": "brief"}}
"""
    try:
        # Use your existing safe_groq_completion (which handles fallback)
        messages = [{"role": "user", "content": prompt}]
        response_text = safe_groq_completion(messages, temperature=0.1, max_tokens=100)
        result = json.loads(response_text)
        finding["ai_confidence"] = result.get("confidence", 50)
        finding["ai_verdict"] = "Real" if result.get("is_real") else "False Positive"
        if not result.get("is_real"):
            # Downgrade severity for false positives
            finding["severity"] = "Informational"
    except Exception as e:
        finding["ai_confidence"] = 50
        finding["ai_verdict"] = f"Validation error: {str(e)}"
    return finding

# ------------------------------------------------------------------
# STEP 4: Health Score & Severity Distribution (updated)
# ------------------------------------------------------------------
def calculate_severity_distribution(findings):
    """Count severity levels (Critical, High, Medium, Low, Informational)."""
    dist = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0, "Informational": 0}
    for f in findings:
        sev = f.get("severity", "Low")
        if sev in dist:
            dist[sev] += 1
        else:
            dist["Low"] += 1
    return dist

def compute_health_score(distribution):
    """Weighted penalty: Critical -25, High -15, Medium -5, Low -1, Info 0."""
    weights = {"Critical": 25, "High": 15, "Medium": 5, "Low": 1, "Informational": 0}
    penalty = sum(distribution.get(k, 0) * weights.get(k, 0) for k in weights)
    # Cap penalty at 100, then invert to get health (100 - penalty)
    health = max(0, min(100, 100 - penalty))
    return round(health, 1)

# ------------------------------------------------------------------
# STEP 5: Hygiene Check (your original, kept)
# ------------------------------------------------------------------
def check_repository_hygiene(repo_path):
    """YOUR original hygiene checks."""
    hygiene_issues = []
    root_env = os.path.join(repo_path, ".env")
    if os.path.exists(root_env):
        hygiene_issues.append({
            "type": "Hygiene",
            "file": ".env",
            "severity": "High",
            "description": "Exposed .env file found in root."
        })
    gitignore_path = os.path.join(repo_path, ".gitignore")
    if not os.path.exists(gitignore_path):
        hygiene_issues.append({
            "type": "Hygiene",
            "file": ".gitignore",
            "severity": "Medium",
            "description": "Missing .gitignore file."
        })
    else:
        try:
            with open(gitignore_path, "r", encoding="utf-8", errors="ignore") as f:
                if ".env" not in f.read():
                    hygiene_issues.append({
                        "type": "Hygiene",
                        "file": ".gitignore",
                        "severity": "Medium",
                        "description": ".env not ignored in .gitignore."
                    })
        except:
            pass
    return hygiene_issues

# ------------------------------------------------------------------
# MASTER ORCHESTRATOR – run_full_scan (updated)
# ------------------------------------------------------------------
def run_full_scan(repo_path):
    """Full pipeline: clone? (if URL given) or accept local path."""
    # If it's a URL, clone to temp dir (or use your existing clone logic)
    # For simplicity, assume repo_path is a local directory.
    # (You can add an optional URL parameter to clone)

    # 1. Hygiene
    hygiene = check_repository_hygiene(repo_path)

    # 2. Directory scan (secrets + vulns + entropy)
    findings, skipped_files, error = scan_directory(repo_path)
    if error:
        return {"error": error}

    # 3. Git history scan (if .git exists)
    git_findings = []
    if os.path.isdir(os.path.join(repo_path, ".git")):
        git_findings = scan_git_history(repo_path)
    findings.extend(git_findings)

    # 4. AI validation on each finding (limit to 30 to save tokens)
    api_key = getattr(settings, "GROQ_API_KEY", os.environ.get("GROQ_API_KEY", ""))
    if api_key and "YOUR" not in api_key.upper():
        print("[AI] Validating top 30 findings...")
        # Prioritize secrets & critical findings
        findings.sort(key=lambda x: 0 if x.get("severity") in ["Critical","High"] else 1)
        for i, f in enumerate(findings[:30]):
            findings[i] = validate_finding_with_groq(f, api_key)

    # 5. Severity distribution & Health score
    dist = calculate_severity_distribution(findings)
    health_score = compute_health_score(dist)
    risk_score = 100 - health_score  # inverse

    # 6. AI Summary (your original, with more context)
    ai_summary = generate_ai_summary(findings, hygiene, skipped_files)

    # 7. Return structured result
    return {
        "status": "success",
        "repo_path": repo_path,
        "scores": {
            "health_score": health_score,
            "risk_score": risk_score,
            "exposed_secrets": sum(1 for f in findings if f.get("type") in SECRET_PATTERNS or "entropy" in f.get("type","").lower()),
            "hygiene_flags": len(hygiene),
            "files_scanned": len(set(f.get("file") for f in findings if f.get("file") != "GIT_HISTORY"))  # approximate
        },
        "severity_distribution": dist,
        "ai_summary": ai_summary,
        "hygiene_issues": hygiene,
        "findings": findings,
        "skipped_files": skipped_files
    }

# ------------------------------------------------------------------
# AI Summary (your original, slightly tweaked)
# ------------------------------------------------------------------
def generate_ai_summary(findings, hygiene, skipped_files=None):
    """Your existing function, but now includes vulnerability counts."""
    api_key = getattr(settings, "GROQ_API_KEY", os.environ.get("GROQ_API_KEY", ""))
    if not api_key or "YOUR" in api_key.upper() or "gsk_" not in api_key:
        return "AI Insights (Offline Mode): No valid GROQ_API_KEY set in backend/.env."

    skipped_count = len(skipped_files) if skipped_files else 0
    total_findings = len(findings)
    critical = sum(1 for f in findings if f.get("severity") == "Critical")
    high = sum(1 for f in findings if f.get("severity") == "High")
    medium = sum(1 for f in findings if f.get("severity") == "Medium")
    low = sum(1 for f in findings if f.get("severity") == "Low")

    prompt = f"""
You are a Senior Cybersecurity Auditor.

Scan summary:
- Total findings: {total_findings} (Critical: {critical}, High: {high}, Medium: {medium}, Low: {low})
- Hygiene issues: {len(hygiene)}
- Skipped large files: {skipped_count}

Provide a 2‑sentence executive risk assessment and 3 bullet‑pointed actionable remediation steps.
"""
    try:
        messages = [{"role": "user", "content": prompt}]
        return safe_groq_completion(messages, temperature=0.2, max_tokens=250).strip()
    except Exception as e:
        return f"AI Insights (Offline Mode): {str(e)}"