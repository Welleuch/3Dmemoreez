# AI Engine — Technical Reference

> Developer reference for `backend/ai_engine/`. Contains the full inference pipeline explanation, bug history, tuning parameters, and deployment notes.

---

## 1. Architecture: Two Models, One `.safetensors` File

The `hunyuan3d-dit-v2_fp16.safetensors` checkpoint contains **two distinct neural networks**, split at load time:

```python
pipeline, vae = Hunyuan3DDiTFlowMatchingPipeline.from_single_file(ckpt_path, ...)
#  ^ DiT diffusion transformer        ^ Shape VAE decoder
```

| Component | Role | Loaded onto |
|-----------|------|-------------|
| `pipeline` (DiT) | Generates abstract latent codes from an image | `DEVICE` (CUDA) |
| `vae` (ShapeVAE) | Decodes latent codes into 3D geometry | `offload_device` (CPU by default) → **must manually call `vae.to(DEVICE)`** |

---

## 2. Correct 3-Stage Inference Chain

```python
# Stage 1: DiT Diffusion (~34s, 50 steps)
latents = pipeline(image=image, num_inference_steps=50)
# latents shape: [1, 3072, 64]

# Stage 2: VAE Forward Pass (<1s)
# REQUIRED: unscale latents before VAE forward
latents = latents / vae.scale_factor   # scale_factor = 0.9990943042622529
latents = vae(latents)                 # post_kl linear [64→1024] + transformer
# latents shape: [1, 3072, 1024]

# Stage 3: Volume Decode + Marching Cubes (~20s at octree_resolution=256)
meshes = vae.latents2mesh(
    latents,
    bounds=1.01,
    octree_resolution=256,   # 3D grid resolution (256³ = 16.7M voxels)
    mc_level=-1/512,         # Hunyuan3D-specific isosurface level
    num_chunks=8000          # query points per GPU batch (tune for VRAM)
)
```

### Why each step is mandatory

1. **`vae.to(DEVICE)`** — `from_single_file` loads VAE onto `offload_device=cpu` by design. Without this, CUDA/CPU tensor mismatch crashes the forward pass.
2. **`latents / vae.scale_factor`** — standard latent diffusion convention: DiT operates in scaled latent space; VAE decoder expects unscaled latents.
3. **`vae(latents)`** — raw DiT latents are `[1, 3072, 64]`. The `geo_decoder` inside `latents2mesh` expects `[1, 3072, 1024]`. The `post_kl` linear + transformer inside `ShapeVAE.forward()` does this projection. Skipping it = garbage geometry.
4. **`mc_level=-1/512`** — Hunyuan3D's occupancy field is calibrated to this specific isovalue (found in the commented-out `_export()` method of `pipelines.py`). Using `0.0` extracts the wrong surface (flat planes).

---

## 3. Quality vs Speed Tradeoffs

| Parameter | Value | Volume Chunks | Decode Time | STL Size | Use Case |
|-----------|-------|--------------|-------------|----------|----------|
| `octree_resolution=128` | 128³ | 215 | ~2s | ~5 MB | Fast testing |
| `octree_resolution=256` | 256³ | 2,122 | ~20s | ~34 MB | **Production** ✅ |
| `octree_resolution=384` | 384³ | ~7,200 | ~70s | ~80+ MB | High quality |
| `octree_resolution=512` | 512³ | ~17,000 | ~160s | ~200+ MB | Max quality |

**`num_chunks=8000`** — controls how many 3D query points (xyz coordinates) are batched per forward pass through the `geo_decoder`. Lower values reduce peak VRAM but increase decode time. 8000 is well-tested.

**`num_inference_steps=50`** — increasing to 100 gives marginally cleaner latents but doubles diffusion time (~68s). Not recommended for production unless quality is unsatisfactory.

---

## 4. Bug History

### Bug 1 — VAE on CPU (fixed 2026-02-20)
**Symptom:** `Expected all tensors to be on the same device, cuda:0 and cpu`  
**Root cause:** `from_single_file()` loads VAE onto `offload_device=cpu`.  
**Fix:**
```python
vae.to(DEVICE)
vae.eval()
```

### Bug 2 — Missing VAE Forward Pass (fixed 2026-02-20)
**Symptom:** `'NoneType' object has no attribute 'export'` — mesh is None.  
**Root cause:** `latents2mesh()` was called with raw `[1, 3072, 64]` latents instead of processed `[1, 3072, 1024]`. The `geo_decoder`'s cross-attention dimension mismatch was silently caught.  
**Fix:** `latents = vae(latents)` before `latents2mesh()`.

### Bug 3 — Wrong `mc_level` (fixed 2026-02-20)
**Symptom:** Generated STL opens as a flat plane.  
**Root cause:** `mc_level=0.0` extracts the wrong isosurface from Hunyuan3D's occupancy field. The field was calibrated during training for level `-1/512`.  
**Fix:** `mc_level=-1/512` (found in `pipelines.py` line ~505 in the commented-out `_export()` method).

---

## 5. Docker Container

### Dockerfile key decisions
- **Base:** `python:3.10-slim` (not a heavy CUDA base image) — PyTorch CUDA wheels are installed directly, resulting in a much smaller image.
- **PyTorch:** Nightly wheels from `https://download.pytorch.org/whl/nightly/cu128` for `sm_120` (Blackwell) support.
- **System deps:** `libxext6 libsm6 libxrender1` required for `pymeshlab` in a headless environment.

### Volume mounts (`docker-compose.yml`)
```yaml
volumes:
  - ./models:/app/models          # model weights (never baked into image)
  - ./hy3dgen:/app/hy3dgen        # vendored library (hot-reload friendly)
```

### Testing
```powershell
# Full automated build + test + teardown
python test_docker_simulation.py

# Or manual trigger (no webhook receiver needed)
$payload = @{session_id='test'; asset_id='a'; image_url='<url>'; webhook_url='http://host.docker.internal:9999/webhook'} | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri 'http://localhost:8000/generate-3d' -Body $payload -ContentType 'application/json'
```

---

## 6. Preprocessing: Background Removal (TODO)

Hunyuan3D-V2 performs **significantly better** when the input image has a clean, single-subject composition with a white or transparent background. Real user photos contain complex backgrounds that bleed into the 3D geometry.

**Recommended approach:** Run `rembg` (U²-Net model) inside `main.py` immediately after downloading the image, before passing to the pipeline.

```python
from rembg import remove
from PIL import Image

# After downloading image_bytes:
image_rgba = remove(image_bytes)   # returns RGBA PNG bytes
image = Image.open(io.BytesIO(image_rgba)).convert("RGB")
```

**Alternative:** Cloudflare AI Workers has a `background-removal` model — this could be run at the Worker level before the image URL is even sent to the AI engine, keeping the Python container lighter.

---

## 7. Observed Performance (local GPU)

| Step | Time |
|------|------|
| Model cold load (first start) | ~25s |
| DiT Diffusion (50 steps, `sm_8x`) | ~34s |
| VAE forward pass | <1s |
| Volume Decoding at 256³ | ~20s |
| Marching Cubes | <1s |
| Webhook upload | <1s |
| **Total per mesh (warm)** | **~55 seconds** |
