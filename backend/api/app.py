from flask import Flask, request, jsonify
from flask_cors import CORS
from api.hawk_ai_routes import hawk_ai_bp  # Imported HawkAI blueprint

app = Flask(__name__)
# Enable CORS for frontend running on localhost (Vite/React default ports)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Register HawkAI Blueprint
app.register_blueprint(hawk_ai_bp)

@app.route('/api/scan', methods=['POST'])
def handle_scan():
    try:
        data = request.get_json() or {}
        repo_path = data.get('repo_path', '')

        if not repo_path:
            return jsonify({"status": "error", "message": "Repository path is required"}), 400

        # --- RUN YOUR BACKEND ANALYZERS HERE ---
        # 1. Regex & High-Entropy Secret Detection
        # 2. Hygiene Checker (.gitignore, .env checks)
        # 3. External Scanner Execution (Trivy / Semgrep)
        # 4. Ollama AI Summary Generation
        # --------------------------------------

        # Simulated response structure matching your dashboard UI
        response_payload = {
            "status": "success",
            "repoPath": repo_path,
            "scores": {
                "health_score": 88,
                "risk_score": 12
            },
            "findings": [
                {
                    "id": "SEC-001",
                    "type": "Secret Detected",
                    "severity": "HIGH",
                    "file": ".env",
                    "description": "Potential AWS Access Key exposed"
                }
            ],
            "ai_summary": "Scan completed. Identified 1 potential secret file exposure in working directory."
        }

        return jsonify(response_payload), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)