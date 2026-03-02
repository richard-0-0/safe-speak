"""
SafeSpeak — Tesseract OCR Pipeline
Preprocesses images and extracts text for hate speech analysis.
Uses multiple preprocessing strategies and picks the best result.
"""
import re
import logging
import cv2
import numpy as np
import pytesseract
from PIL import Image

logger = logging.getLogger(__name__)


def _try_ocr(img: np.ndarray) -> tuple[str, float]:
    """Run OCR on a preprocessed image and return (text, avg_confidence)."""
    pil_img = Image.fromarray(img)
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
    
    return cleaned, avg_confidence


def preprocess_strategies(image_bytes: bytes) -> list[np.ndarray]:
    """
    Generate multiple preprocessed versions of the image.
    Different strategies work better for different screenshot styles
    (dark mode, light mode, colored backgrounds, etc.)
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Failed to decode image. Ensure the file is a valid image format.")

    results = []

    # Strategy 1: Grayscale + Otsu (good for light backgrounds)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    denoised = cv2.GaussianBlur(gray, (3, 3), 0)
    _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    results.append(thresh)

    # Strategy 2: Inverted Otsu (good for dark backgrounds/dark mode)
    _, thresh_inv = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    results.append(thresh_inv)

    # Strategy 3: Adaptive threshold (good for uneven lighting)
    adaptive = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    results.append(adaptive)

    # Strategy 4: Plain grayscale (let Tesseract handle it)
    results.append(gray)

    # Strategy 5: Resize + grayscale (helps with small text)
    h, w = gray.shape
    if w < 1000:
        scaled = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
        results.append(scaled)

    return results


def extract_text(image_bytes: bytes) -> dict:
    """
    Extract text from an image using Tesseract OCR.
    Tries multiple preprocessing strategies and picks the best result.

    Returns:
        {
            "text": str,            — Cleaned extracted text
            "avg_ocr_confidence": float,  — Average word-level confidence
            "low_quality": bool,    — True if confidence < 60%
        }
    """
    try:
        strategies = preprocess_strategies(image_bytes)

        best_text = ""
        best_confidence = 0
        best_strategy = -1

        for i, processed_img in enumerate(strategies):
            text, confidence = _try_ocr(processed_img)
            # Pick the strategy that extracts the most text with reasonable confidence
            # Score = text_length * confidence to balance both factors
            score = len(text) * (confidence / 100) if confidence > 0 else 0
            best_score = len(best_text) * (best_confidence / 100) if best_confidence > 0 else 0

            if score > best_score:
                best_text = text
                best_confidence = confidence
                best_strategy = i

        logger.info(
            "[OCR] Best strategy: %d, extracted %d chars, avg confidence: %.1f%%",
            best_strategy,
            len(best_text),
            best_confidence,
        )

        return {
            "text": best_text,
            "avg_ocr_confidence": best_confidence,
            "low_quality": best_confidence < 60,
        }

    except Exception as exc:
        logger.error("[OCR] Text extraction failed: %s", exc)
        return {
            "text": "",
            "avg_ocr_confidence": 0,
            "low_quality": True,
        }
