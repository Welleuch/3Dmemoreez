# ==========================================
# STAGE 1: Download & Extract AppImage
# ==========================================
FROM ubuntu:22.04 AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sLk "https://github.com/prusa3d/PrusaSlicer/releases/download/version_2.8.1/PrusaSlicer-2.8.1+linux-x64-older-distros-GTK3-202409181354.AppImage" -o prusa-slicer.AppImage && \
    chmod +x prusa-slicer.AppImage && \
    ./prusa-slicer.AppImage --appimage-extract && \
    rm prusa-slicer.AppImage


# ==========================================
# STAGE 2: Minimal Runtime
# ==========================================
FROM ubuntu:22.04

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install the absolute minimum libraries required by the PrusaSlicer binaries.
# Note: Even in headless mode, the generic AppImage build links against GTK and WebKit.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    libgl1 \
    libglu1-mesa \
    libglib2.0-0 \
    libx11-6 \
    libxrender1 \
    libsm6 \
    libxext6 \
    libgomp1 \
    libegl1 \
    curl \
    libgtk-3-0 \
    libatk1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libcairo-gobject2 \
    libpango-1.0-0 \
    libcairo2 \
    libwayland-egl1 \
    libdbus-1-3 \
    libfontconfig1 \
    libwebkit2gtk-4.0-37 \
    libsoup2.4-1 \
    && rm -rf /var/lib/apt/lists/*

# Link python to python3
RUN ln -s /usr/bin/python3 /usr/bin/python

# Copy the extracted binaries from the builder stage
COPY --from=builder /app/squashfs-root /app/squashfs-root

# Fix the internal wrapper script to APPEND to LD_LIBRARY_PATH instead of overwriting it, 
# so it can find the system libraries we installed (like GTK).
RUN sed -i 's/export LD_LIBRARY_PATH="$DIR\/bin"/export LD_LIBRARY_PATH="$DIR\/bin:$LD_LIBRARY_PATH"/' /app/squashfs-root/usr/bin/prusa-slicer

ENV PATH="/app/squashfs-root/usr/bin:$PATH"

RUN mkdir -p /input /output

COPY main.py requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

EXPOSE 8001

CMD ["python3", "main.py"]
