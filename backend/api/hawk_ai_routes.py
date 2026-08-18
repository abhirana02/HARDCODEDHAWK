from flask import Blueprint, request, jsonify

try:
    from ..ai.hawk_ai import generate_hawk_ai_response
except ImportError:
    from ai.hawk_ai import generate_hawk_ai_response

hawk_ai_bp = Blueprint('hawk_ai', __name__)

# Structured System Prompt to enforce clean formatting and eliminate UI variable echo
SYSTEM_PROMPT = """You are Hawk AI, an elite cybersecurity assistant integrated into the Hardcoded Hawk security dashboard.

CRITICAL FORMATTING & STYLE RULES:
1. Use clear, structured Markdown (bold text, bullet points, concise lists, and code blocks where applicable).
2. NEVER echo raw UI state strings or variable names mechanically (e.g., do NOT say "HEALTH_SCORE", "DETAILED_FINDINGS", or "RISK_SCORE"). Speak naturally like a security auditor.
3. Deduplicate repeating findings automatically.
4. Keep answers authoritative, professional, direct, and actionable.
5. ALWAYS insert double newlines between sections, paragraphs, and list items so every item sits cleanly on its own line.

When summarizing scan results, follow this structured format:

### 🛡️ Scan Overview

* **Health Score:** [Score]/100
* **Risk Rating:** [Low/Medium/High] ([Risk Score])
* **Secrets Found:** [Count] hardcoded secrets detected

### 🔍 Key Findings & Hygiene

* **[Severity]** [Issue Name]: [Brief executive explanation]

### 💡 Remediation Steps

1. [Actionable step 1]

2. [Actionable step 2]
"""

@hawk_ai_bp.route('/api/chat', methods=['POST'])
@hawk_ai_bp.route('/api/hawk-ai', methods=['POST'])
def hawk_ai_chat():
    try:
        data = request.get_json() or {}
        user_message = data.get('message', '')
        
        # Fallback to handle both camelCase (liveContext) and snake_case (live_context)
        live_context = data.get('liveContext') or data.get('live_context') or {}

        # Attach system instructions into context
        live_context['system_prompt'] = SYSTEM_PROMPT

        # Call AI helper function
        bot_reply = generate_hawk_ai_response(user_message, live_context)
        return jsonify({"reply": bot_reply}), 200

    except Exception as e:
        print(f"HawkAI Route Error: {e}")
        return jsonify({"reply": f"Server error processing HawkAI request: {str(e)}"}), 500