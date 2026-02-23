"""
SafeSpeak — LLM Service with Fallback Chain
Primary: Groq API (Llama 3.3 70B)
Fallback: Google Gemini 1.5 Flash
Last Resort: Template-based generation (no LLM)
"""
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Initialize LLM clients ──────────────────────────────────────────
_groq_client = None
_gemini_configured = False


def _get_groq_client():
    """Lazy-initialize the Groq client."""
    global _groq_client
    if _groq_client is None and settings.GROQ_API_KEY:
        from groq import Groq
        _groq_client = Groq(api_key=settings.GROQ_API_KEY)
    return _groq_client


def _ensure_gemini():
    """Lazy-configure the Gemini client."""
    global _gemini_configured
    if not _gemini_configured and settings.GEMINI_API_KEY:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _gemini_configured = True


def generate_template_summary(flagged_messages: list[dict]) -> str:
    """
    Template-based fallback when both LLM APIs are unavailable.
    Generates a structured text summary without AI assistance.
    """
    total = len(flagged_messages)
    hate_count = sum(1 for m in flagged_messages if m.get("label") == "hate_speech")
    threat_count = sum(1 for m in flagged_messages if m.get("label") == "threat")
    offensive_count = sum(1 for m in flagged_messages if m.get("label") == "offensive")

    summary = f"""ABUSE REPORT SUMMARY (Auto-Generated)

Total flagged messages analyzed: {total}

Breakdown by category:
• Hate Speech: {hate_count} messages
• Direct Threats: {threat_count} messages
• Offensive Language: {offensive_count} messages

This report contains {total} messages that were automatically flagged by SafeSpeak's
AI detection system with a confidence threshold of {settings.HATE_SPEECH_CONFIDENCE_THRESHOLD * 100:.0f}%.

The messages are listed in chronological order in the evidence section below.
Each entry includes the timestamp, anonymized sender ID, message content,
classification label, and confidence score.

DISCLAIMER: This report was generated automatically by SafeSpeak's AI system.
Classification results should be reviewed by a human before taking action.
The AI system may produce false positives or miss certain types of harmful content."""

    return summary


async def call_groq_with_fallback(prompt: str, system: str) -> str:
    """
    Call the LLM with a 3-tier fallback chain:
    1. Groq API (Llama 3.3 70B Versatile)
    2. Google Gemini 1.5 Flash
    3. Template-based fallback (no LLM)
    """
    # ── Try 1: Groq Llama 3.3 70B ────────────────────────────────
    if settings.GROQ_API_KEY:
        groq_client = _get_groq_client()
        if groq_client:
            try:
                response = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt},
                    ],
                    max_tokens=2048,
                    timeout=15,
                )
                logger.info("[LLM] Groq response received successfully.")
                return response.choices[0].message.content

            except Exception as groq_err:
                logger.warning("[LLM] Groq failed: %s. Trying Gemini...", groq_err)
    else:
        logger.info("[LLM] Groq API key not set, skipping.")

    # ── Try 2: Gemini 1.5 Flash ──────────────────────────────────
    if settings.GEMINI_API_KEY:
        _ensure_gemini()
        try:
            import google.generativeai as genai
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(
                f"{system}\n\n{prompt}",
                request_options={"timeout": 15},
            )
            logger.info("[LLM] Gemini response received successfully.")
            return response.text

        except Exception as gemini_err:
            logger.warning("[LLM] Gemini failed: %s. Using template fallback.", gemini_err)
    else:
        logger.info("[LLM] Gemini API key not set, skipping.")

    # ── Try 3: Template-based fallback (no LLM) ──────────────────
    logger.info("[LLM] Both APIs unavailable. Using template-based fallback.")
    return generate_template_summary([])


async def generate_chatbot_response(
    extracted_text: str,
    classification: dict,
    user_message: str = "",
    session_history: list[dict] | None = None,
) -> str:
    """
    Generate a contextual chatbot response for screenshot analysis
    or follow-up questions about hate speech.
    """
    if session_history is None:
        session_history = []

    system_prompt = """You are SafeSpeak's AI assistant — an expert on online safety,
hate speech identification, and digital abuse reporting.

Your role:
- Analyze text extracted from screenshots for hate speech patterns
- Explain classification results in clear, empathetic language
- Guide users on how to report abuse and protect themselves
- Be supportive and non-judgmental

Always respond in a structured format with:
1. Analysis of the content
2. Classification explanation
3. Recommended actions
4. Supportive closing

Keep responses concise but thorough. Maximum 300 words."""

    if extracted_text and classification:
        user_prompt = f"""Analyze this text extracted from a screenshot:

Extracted Text: "{extracted_text}"

AI Classification Result:
- Label: {classification.get('label', 'unknown')}
- Confidence: {classification.get('confidence', 0):.0%}
- Flagged: {classification.get('flagged', False)}

{f'User follow-up question: {user_message}' if user_message else 'Provide your initial analysis and recommendations.'}"""
    else:
        user_prompt = user_message

    return await call_groq_with_fallback(user_prompt, system_prompt)
