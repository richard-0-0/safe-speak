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


async def classify_flagged_message(text: str) -> str:
    """
    Sub-classify a flagged message into: hate_speech, threat, or offensive.
    Called only when DistilBERT has already flagged the message.
    Returns one of: 'hate_speech', 'threat', 'offensive'
    """
    VALID_LABELS = {"hate_speech", "threat", "offensive"}

    system = """You are a content classification engine. Your ONLY job is to classify a harmful message into exactly one of these three categories:

1. hate_speech — targets someone based on race, religion, gender, sexuality, disability, or ethnicity.
2. threat — contains a direct or implied threat of violence, harm, or intimidation.
3. offensive — contains insults, slurs, profanity, or abusive language that does not fit the above two categories.

RULES:
- Reply with ONLY ONE WORD: hate_speech, threat, or offensive.
- Do not add any explanation, punctuation, or extra text.
- If unsure, reply with: offensive"""

    prompt = f'Classify this message: "{text}"'

    try:
        result = await call_groq_with_fallback(prompt, system)
        label = result.strip().lower().replace(" ", "_")
        # Clean up any extra text the LLM might add
        for valid in VALID_LABELS:
            if valid in label:
                return valid
        logger.warning("[LLM] Sub-classification returned unexpected: '%s'. Defaulting to 'offensive'.", label)
        return "offensive"
    except Exception as e:
        logger.error("[LLM] Sub-classification failed: %s. Defaulting to 'offensive'.", e)
        return "offensive"


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

    system_prompt = """You are SafeSpeak's AI safety assistant. You help people understand whether messages or screenshots contain harmful content like hate speech, threats, or bullying.

IMPORTANT FORMATTING RULES — follow these strictly:
- Do NOT use any markdown formatting. No asterisks, no bold (**), no headers (#), no bullet symbols.
- Write in plain, simple English as if you are talking to a friend.
- Use short sentences and short paragraphs.
- Separate sections with a blank line, not with symbols or headers.
- Use numbered lists (1, 2, 3) only when listing steps. Do not use dashes or bullet points.
- Keep your response under 200 words.

Your response should cover these areas in this order:
1. What the message says and whether it is harmful (1-2 sentences).
2. Why it was classified the way it was (1 sentence).
3. What the person can do about it (2-3 practical steps).
4. A short encouraging closing line.

Tone: Warm, calm, supportive. Never judgmental. Speak like a caring counselor, not a robot."""

    if extracted_text and classification:
        label = classification.get('label', 'unknown')
        confidence = classification.get('confidence', 0)
        flagged = classification.get('flagged', False)

        status = "harmful" if flagged else "safe"
        confidence_pct = f"{confidence:.0%}"

        user_prompt = f"""Here is a message that was analyzed by our AI:

Message: "{extracted_text}"

Our AI thinks this message is {status} (confidence: {confidence_pct}, category: {label}).

{f'The user is asking: {user_message}' if user_message else 'Please explain this result and give advice on what to do next.'}

Remember: write in plain text only, no markdown, no bold, no special formatting."""
    else:
        user_prompt = user_message + "\n\nRemember: write in plain text only, no markdown, no bold, no special formatting."

    return await call_groq_with_fallback(user_prompt, system_prompt)
