"""
SafeSpeak — Tesseract OCR Pipeline
Preprocesses images and extracts text for hate speech analysis.
"""
import re
import logging
import cv2
import numpy as np
import pytesseract
from PIL import Image

logger = logging.getLogger(__name__)


def preprocess_image_for_ocr(image_bytes: bytes) -> np.ndarray:
    """
    Preprocess image for optimal OCR accuracy.
    Pipeline: Grayscale → Gaussian blur (denoise) → Otsu's threshold.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Failed to decode image. Ensure the file is a valid image format.")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    denoised = cv2.GaussianBlur(gray, (3, 3), 0)
    _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    return thresh


def extract_text(image_bytes: bytes) -> dict:
    """
    Extract text from an image using Tesseract OCR.

    Returns:
        {
            "text": str,            — Cleaned extracted text
            "avg_ocr_confidence": float,  — Average word-level confidence
            "low_quality": bool,    — True if confidence < 60%
        }
    """
    try:
        processed = preprocess_image_for_ocr(image_bytes)
        pil_img = Image.fromarray(processed)

        raw_text = pytesseract.image_to_string(pil_img, lang="eng", config="--psm 6")

        # Post-process: clean common OCR artifacts
        cleaned = re.sub(r"[|\\]{2,}", "", raw_text)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()

        # Get word-level confidence data
        confidence_data = pytesseract.image_to_data(
            pil_img, output_type=pytesseract.Output.DICT
        )
        confs = [c for c in confidence_data["conf"] if c != -1]
        avg_confidence = sum(confs) / len(confs) if confs else 0

        logger.info(
            "[OCR] Extracted %d chars, avg confidence: %.1f%%",
            len(cleaned),
            avg_confidence,
        )

        return {
            "text": cleaned,
            "avg_ocr_confidence": avg_confidence,
            "low_quality": avg_confidence < 60,
        }

    except Exception as exc:
        logger.error("[OCR] Text extraction failed: %s", exc)
        return {
            "text": "",
            "avg_ocr_confidence": 0,
            "low_quality": True,
        }
