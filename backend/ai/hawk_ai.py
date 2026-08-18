import os
from groq import Groq

try:
    from ..config.base import settings
except ImportError:
    from config.base import settings

client = Groq(api_key=settings.GROQ_API_KEY)

def safe_groq_completion(messages, temperature=0.3, max_tokens=750):
    model_cascade = getattr(
        settings, 
        "GROQ_MODEL_CASCADE", 
        [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "openai/gpt-oss-120b"
        ]
    )
    
    last_error = None
    
    for model_name in model_cascade:
        try:
            completion = client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return completion.choices[0].message.content
        except Exception as e:
            # Catch all model errors (400, 404, rate limits) and attempt the next model
            print(f"[Hawk AI] Model '{model_name}' encountered error: {e}. Cascading...")
            last_error = e
            continue

    raise Exception(f"All models in Groq cascade failed. Last error: {last_error}")


def generate_hawk_ai_response(user_message, live_context=None):
    if live_context is None:
        live_context = {}

    default_system = (
        "You are Hawk AI, an expert security assistant.\n"
        "Provide responses strictly using clean, structured Markdown format."
    )
    system_prompt = live_context.get('system_prompt', default_system)

    scan_status = live_context.get('SCAN_STATUS', 'Unknown')
    health_score = live_context.get('HEALTH_SCORE', 100)
    risk_score = live_context.get('RISK_SCORE', 0)
    findings = live_context.get('FINDINGS') or live_context.get('findings') or []
    hygiene_issues = live_context.get('HYGIENE_ISSUES') or live_context.get('hygiene_issues') or []
    repo = live_context.get('CURRENT_INPUT', 'Unknown')

    context_str = f"""
    --- CURRENT SCAN CONTEXT SNAPSHOT ---
    Target Repository/Path: {repo}
    Scan Status: {scan_status}
    Health Score: {health_score}/100
    Risk Score: {risk_score}
    Total Critical/High Secrets Detected: {len(findings)}
    Total Hygiene Issues (e.g. .gitignore): {len(hygiene_issues)}

    Detailed Findings Data:
    {findings}

    Code Hygiene Issues:
    {hygiene_issues}
    ------------------------------------
    """

    messages_payload = [
        {"role": "system", "content": f"{system_prompt}\n\n{context_str}"},
        {"role": "user", "content": user_message}
    ]

    try:
        return safe_groq_completion(messages_payload, temperature=0.3, max_tokens=750)
    except Exception as err:
        print(f"Hawk AI Execution Failure: {err}")
        return f"Error communicating with Hawk AI engine: {str(err)}"