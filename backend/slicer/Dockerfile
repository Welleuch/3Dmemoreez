FROM ubuntu:22.04

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    curl \
    wget \
    libgl1-mesa-glx \
    libglu1-mesa \
    libglib2.0-0 \
    libx11-6 \
    libxrender1 \
    libsm6 \
    libxext6 \
    libgomp1 \
    libgtk-3-0 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libegl1 \
    libwebkit2gtk-4.0-37 \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sLk "https://github.com/prusa3d/PrusaSlicer/releases/download/version_2.8.1/PrusaSlicer-2.8.1+linux-x64-older-distros-GTK3-202409181354.AppImage" -o prusa-slicer.AppImage && \
    chmod +x prusa-slicer.AppImage && \
    ./prusa-slicer.AppImage --appimage-extract && \
    rm prusa-slicer.AppImage

ENV PATH="/app/squashfs-root/usr/bin:$PATH"

RUN mkdir -p /input /output

COPY main.py requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

EXPOSE 8001

CMD ["python3", "main.py"]
