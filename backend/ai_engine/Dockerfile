
# -----------------------------------------------------------------------------
# LEAN RUNPOD DOCKERFILE FOR BLACKWELL (RTX 5090)
# -----------------------------------------------------------------------------
# Strategy: Use python:3.10-slim as base to minimize bloat.
# Rely on PyTorch Nightly Wheels (cu128) which bundle necessary CUDA runtimes.
# Total Size Estimate: ~3-4GB (vs 10GB+ for nvcr.io content)
# -----------------------------------------------------------------------------

FROM python:3.10-slim

# Set working directory
WORKDIR /app

# 1. Install System Dependencies
# - libgl1-mesa-glx: Required for Trimesh/OpenCV
# - build-essential: Required for compiling extensions (like mcubes if no wheel)
# - git, curl: Standard utilities
# NOTE: libgl1-mesa-glx not available in some slim distros, using libgl1 + mesa-utils
# ADDED: libxext6, libgl1-mesa-glx (force install via specific packages to satisfy pymeshlab/qt)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    libxext6 \
    libsm6 \
    libxrender1 \
    curl \
    git \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Install PyTorch Nightly (CUDA 12.8 / sm_120 Support)
# We install this first to leverage Docker caching for the heavy layer
RUN pip install --no-cache-dir --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu128

# 3. Install Python Dependencies
# We copy only requirements first to cache this layer
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy Application Code
COPY hy3dgen /app/hy3dgen
COPY main.py /app/main.py
COPY runpod_handler.py /app/runpod_handler.py
COPY configs /app/configs

# 5. Environment Config
ENV PYTHONPATH=/app
ENV IS_DOCKER=true

# Expose port
EXPOSE 8000

# Start Server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
