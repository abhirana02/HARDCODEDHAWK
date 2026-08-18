import os
import re
import math
from groq import Groq

try:
    from .config.base import settings
    from .ai.hawk_ai import safe_groq_completion
except ImportError:
    from config.base import settings
    from ai.hawk_ai import safe_groq_completion

# ------------------------------------------------------------------
# Optimization & Exclusion Constants
# ------------------------------------------------------------------
MAX_FILE_SIZE_BYTES = 1.5 * 1024 * 1024  # 1.5 MB limit per file

DEFAULT_IGNORE_DIRS = {
    ".git", ".venv", "venv", "node_modules", "__pycache__", 
    ".idea", ".vscode", "dist", "build", "coverage", "vendor"
}

IGNORED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".pdf",
    ".zip", ".tar", ".gz", ".7z", ".rar", ".exe", ".dll",
    ".so", ".dylib", ".min.js", ".min.css", ".map", ".mp4",
    ".mp3", ".ttf", ".woff", ".woff2", ".eot", ".db", ".sqlite"
}

# Ignore internal engine files, lockfiles, & env files to prevent false positives and credential leakage
SELF_IGNORE_FILES = {
    "scanner.py", "language_detector.py", "rules.py", "config.py",
    ".env", ".env.local", ".env.development", ".env.production",
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml"
}

# Common non-secret code indicators to skip during entropy checks
CODE_KEYWORDS = [
    "http://", "https://", "SELECT", "INSERT", "UPDATE", 
    "r\"(?i)", "r'(?i)", "LANGUAGE_MAP", "SECRET_PATTERNS"
]

# ------------------------------------------------------------------
# Regex Patterns for Secret Detection
# ------------------------------------------------------------------
SECRET_PATTERNS = {
    "AWS Access Key": r"(?i)AKIA[0-9A-Z]{16}",
    "Generic API Key / Secret": r"(?i)(api[_-]?key|secret[_-]?key|access[_-]?token|password)\s*[:=]\s*['\"]([a-zA-Z0-9_\-]{16,})['\"]",
    "GitHub Personal Access Token": r"ghp_[a-zA-Z0-9]{36}",
    "Slack Token": r"xox[baprs]-[0-9a-zA-Z]{10,48}",
    "Private Key": r"-----BEGIN (RSA|OPENSSH|PRIVATE) KEY-----"
}


def mask_secret(secret_str):
    """Masks secret strings so sensitive values are not rendered in plain text."""
    if len(secret_str) <= 8:
        return "*******"
    return secret_str[:4] + "..." + secret_str[-4:]


def calculate_shannon_entropy(data):
    """Calculates the Shannon entropy of a string to detect randomness."""
    if not data:
        return 0
    entropy = 0
    for x in set(data):
        p_x = float(data.count(x)) / len(data)
        entropy -= p_x * math.log(p_x, 2)
    return entropy


def is_suspicious_entropy_string(word):
    """Filters out common false positive code syntax before checking entropy."""
    if any(kw in word for kw in CODE_KEYWORDS):
        return False
    
    has_digit = any(c.isdigit() for c in word)
    has_alpha = any(c.isalpha() for c in word)
    
    if not (has_digit and has_alpha):
        return False

    return calculate_shannon_entropy(word) > 4.8


def check_repository_hygiene(repo_path):
    """Checks basic security hygiene in the repository root."""
    hygiene_issues = []
    
    root_env_path = os.path.join(repo_path, ".env")
    if os.path.exists(root_env_path):
        hygiene_issues.append({
            "type": "Hygiene",
            "file": ".env",
            "severity": "High",
            "description": "Exposed .env file found in root directory. Sensitive environment variables should not be tracked."
        })

    gitignore_path = os.path.join(repo_path, ".gitignore")
    if not os.path.exists(gitignore_path):
        hygiene_issues.append({
            "type": "Hygiene",
            "file": ".gitignore",
            "severity": "Medium",
            "description": "Missing .gitignore file in root repository."
        })
    else:
        try:
            with open(gitignore_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                if ".env" not in content:
                    hygiene_issues.append({
                        "type": "Hygiene",
                        "file": ".gitignore",
                        "severity": "Medium",
                        "description": ".env is not explicitly ignored in .gitignore."
                    })
        except Exception:
            pass

    return hygiene_issues


def scan_directory(repo_path):
    """Recursively scans files for regex patterns and high-entropy strings."""
    findings = []
    skipped_files = []

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

            try:
                file_size = os.path.getsize(file_path)

                # Track skipped files exceeding size limit for user transparency
                if file_size > MAX_FILE_SIZE_BYTES:
                    size_mb = round(file_size / (1024 * 1024), 2)
                    print(f"[Scanner] Skipped large file ({size_mb} MB): {relative_path}")
                    skipped_files.append({
                        "file": relative_path,
                        "size": f"{size_mb} MB",
                        "reason": f"Exceeded size limit of {MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB"
                    })
                    continue

                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    for line_num, line in enumerate(f, start=1):
                        line_str = line.strip()

                        for secret_type, pattern in SECRET_PATTERNS.items():
                            if re.search(pattern, line_str):
                                findings.append({
                                    "severity": "Critical",
                                    "type": secret_type,
                                    "file": relative_path,
                                    "line": line_num,
                                    "description": f"Hardcoded secret detected: {mask_secret(line_str)}"
                                })

                        words = line_str.split()
                        for word in words:
                            clean_word = word.strip("'\"=:,;()[]{}")
                            if len(clean_word) > 20 and is_suspicious_entropy_string(clean_word):
                                findings.append({
                                    "severity": "Medium",
                                    "type": "High Entropy String",
                                    "file": relative_path,
                                    "line": line_num,
                                    "description": f"High randomness string detected: {mask_secret(clean_word)}"
                                })

            except Exception:
                continue

    return findings, skipped_files, None


def generate_ai_summary(findings, hygiene, skipped_files=None):
    """Generates security insights using Groq API via self-healing model cascade."""
    api_key = getattr(settings, "GROQ_API_KEY", os.environ.get("GROQ_API_KEY", ""))

    if not api_key or "YOUR" in api_key.upper():
        return "AI Insights (Offline Mode): GROQ_API_KEY missing. Please configure your key in backend/.env."

    skipped_count = len(skipped_files) if skipped_files else 0

    if not findings and not hygiene:
        prompt = (
            f"Analyze this repository scan report: No hardcoded secrets or hygiene issues were detected. "
            f"Total skipped large files: {skipped_count}. "
            "Provide a concise, 2-sentence executive summary praising the repository security."
        )
    else:
        sample_findings = findings[:5]
        summary_payload = {
            "total_findings_count": len(findings),
            "total_hygiene_count": len(hygiene),
            "total_skipped_files": skipped_count,
            "sample_findings": sample_findings,
            "hygiene_issues": hygiene
        }

        prompt = (
            f"You are a Senior Cybersecurity Auditor analyzing scan results:\n"
            f"Summary: {summary_payload}\n\n"
            f"Provide a 2-sentence executive risk assessment and 3 bullet-pointed remediation steps."
        )

    try:
        messages_payload = [{"role": "user", "content": prompt}]
        # Executes completion via the fallback model list
        response_text = safe_groq_completion(messages_payload, temperature=0.2, max_tokens=250)
        return response_text.strip()
    except Exception as e:
        print(f"[Groq AI Error Detailed Log]: {e}")
        return f"AI Insights (Offline Mode): Unable to reach Groq API ({str(e)})."


def run_full_scan(repo_path):
    """Executes full security analysis on target repository."""
    hygiene = check_repository_hygiene(repo_path)
    findings, skipped_files, error = scan_directory(repo_path)

    if error:
        return {"error": error}

    total_issues = len(findings) + len(hygiene)
    critical_count = sum(1 for f in findings if f.get("severity") == "Critical")
    
    risk_score = min(100, (critical_count * 25) + (total_issues * 10))
    health_score = max(0, 100 - risk_score)

    ai_summary = generate_ai_summary(findings, hygiene, skipped_files)

    return {
        "status": "success",
        "repo_path": repo_path,
        "scores": {
            "health_score": health_score,
            "risk_score": risk_score
        },
        "ai_summary": ai_summary,
        "hygiene_issues": hygiene,
        "findings": findings,
        "skipped_files": skipped_files
    }