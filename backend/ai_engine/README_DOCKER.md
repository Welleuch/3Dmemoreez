
# 3Dmemoreez AI Engine - Docker Implementation

## Base Image
We use **`nvcr.io/nvidia/pytorch:25.01-py3`** (or later) as the base image.
*   **Release Date:** January 2025+
*   **CUDA Version:** 12.8 (or version compatible with Blackwell/sm_120)
*   **PyTorch Version:** Optimized build including kernels for `sm_120` (NVIDIA Blackwell) and `sm_89` (Ada Lovelace).

## Why this image?
Standard PyTorch builds (e.g., via pip) often lag in supporting the very latest GPU architectures due to binary size constraints or CUDA version mismatches. NVIDIA's NGC containers are the official reference for bleeding-edge hardware support.

## Dependencies
*   **PyTorch/Torchvision/Torchaudio:** PRE-INSTALLED. We do *not* reinstall these via pip to avoid overwriting the optimized version with a generic, incompatible one.
*   **Other libraries:** Installed via `pip` (e.g., `diffusers`, `trimesh`, `rembg`).
    *   *Note:* `onednn`, `onnxruntime-gpu` and others are installed, but we rely on the container's environment to provide necessary CUDA shared libraries.

## Build Instructions
```bash
docker build -t 3dmemoreez-ai-engine .
```

## Run Instructions (Local)
Ensure you have the latest NVIDIA Drivers (r550+) installed on your host machine for Blackwell support.
```bash
docker compose up
```

## Verification
To verify `sm_120` support inside the container:
1.  Start the container.
2.  Exec into it:
    ```bash
    docker exec -it <container_id> python -c "import torch; print(torch.cuda.get_arch_list())"
    ```
3.  Look for `sm_120` in the output list.
