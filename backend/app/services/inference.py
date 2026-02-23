"""
SafeSpeak — DistilBERT Hate Speech Inference Engine
Loads the fine-tuned .safetensors model, exports to ONNX, and runs
sub-100ms inference via ONNX Runtime singleton.
"""
import os
import re
import logging
import unicodedata
import numpy as np
import onnxruntime as ort
from pathlib import Path
from transformers import DistilBertTokenizerFast, DistilBertForSequenceClassification
import torch

logger = logging.getLogger(__name__)

# ── Label mapping (matches fine-tuning label order) ──────────────────
LABELS = ["clean", "offensive", "hate_speech", "threat"]
HATE_CONFIDENCE_THRESHOLD = float(os.getenv("HATE_SPEECH_CONFIDENCE_THRESHOLD", "0.85"))

MODEL_DIR = Path(__file__).parent.parent.parent / "ml_models" / "distilbert"
ONNX_PATH = MODEL_DIR / "model.onnx"


def export_to_onnx_if_needed():
    """Export .safetensors → ONNX once on first startup."""
    if ONNX_PATH.exists():
        return

    logger.info("[Inference] Exporting .safetensors → ONNX (one-time setup)...")

    model = DistilBertForSequenceClassification.from_pretrained(
        str(MODEL_DIR),
        num_labels=len(LABELS),
    )
    model.eval()

    tokenizer = DistilBertTokenizerFast.from_pretrained(str(MODEL_DIR))

    dummy = tokenizer(
        "sample text for export",
        return_tensors="pt",
        max_length=128,
        padding="max_length",
        truncation=True,
    )

    torch.onnx.export(
        model,
        (dummy["input_ids"], dummy["attention_mask"]),
        str(ONNX_PATH),
        input_names=["input_ids", "attention_mask"],
        output_names=["logits"],
        dynamic_axes={
            "input_ids": {0: "batch_size"},
            "attention_mask": {0: "batch_size"},
        },
        opset_version=14,
    )
    logger.info("[Inference] ONNX model exported to %s", ONNX_PATH)


class DistilBERTInference:
    """
    Singleton ONNX Runtime session for sub-100ms hate speech inference.
    Loaded once at startup, kept in memory.
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def initialize(self):
        """Load tokenizer and ONNX session. Call once at startup."""
        if self._initialized:
            return

        export_to_onnx_if_needed()

        self.tokenizer = DistilBertTokenizerFast.from_pretrained(str(MODEL_DIR))

        opts = ort.SessionOptions()
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        opts.intra_op_num_threads = 2

        self.session = ort.InferenceSession(
            str(ONNX_PATH),
            sess_options=opts,
            providers=["CPUExecutionProvider"],
        )

        self._initialized = True
        logger.info("[Inference] DistilBERT ONNX session ready.")

    def preprocess(self, text: str) -> dict:
        """Strip URLs, normalize unicode, tokenize for inference."""
        text = re.sub(r"http\S+|www\S+", "[URL]", text)
        text = unicodedata.normalize("NFKC", text).lower().strip()

        encoded = self.tokenizer(
            text,
            max_length=128,
            padding="max_length",
            truncation=True,
            return_tensors="np",
        )

        return {
            "input_ids": encoded["input_ids"].astype(np.int64),
            "attention_mask": encoded["attention_mask"].astype(np.int64),
        }

    def predict(self, text: str) -> dict:
        """
        Classify text for hate speech.
        Returns: {"label": str, "confidence": float, "flagged": bool}
        Target: < 100ms p95
        """
        inputs = self.preprocess(text)
        logits = self.session.run(["logits"], inputs)[0]
        probs = self._softmax(logits[0])
        label_idx = int(np.argmax(probs))
        label = LABELS[label_idx]
        confidence = float(probs[label_idx])

        return {
            "label": label,
            "confidence": confidence,
            "flagged": label != "clean" and confidence >= HATE_CONFIDENCE_THRESHOLD,
        }

    @staticmethod
    def _softmax(logits: np.ndarray) -> np.ndarray:
        exp = np.exp(logits - np.max(logits))
        return exp / exp.sum()


# ── Singleton instance ────────────────────────────────────────────────
distilbert = DistilBERTInference()
