FROM python:3.11-slim

# Install system dependencies for Tesseract OCR, WeasyPrint, and ONNX Runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libpango-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    curl \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Layer 1: Install ML dependencies first (changes rarely, cached) ──
COPY requirements-docker.txt .
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu \
    torch==2.3.0+cpu && \
    pip install --no-cache-dir onnxruntime==1.18.0 transformers==4.40.2 safetensors==0.4.3 onnx==1.16.0

# ── Layer 2: Install remaining dependencies ──────────────────────────
RUN pip install --no-cache-dir -r requirements-docker.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
