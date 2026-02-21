# AI Engine — Technical Reference

> Developer reference for `backend/ai_engine/`. Contains the full inference pipeline explanation, bug history, tuning parameters, and deployment notes.
>
> Last updated: 2026-02-21

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

### Bug 4 — `logger` NameError at Startup (fixed 2026-02-21)
**Symptom:** `NameError: name 'logger' is not defined` on cold start.
**Root cause:** The `rembg` import `try/except` block referenced `logger` before `logging.basicConfig()` and `logger = getLogger()` were defined.
**Fix:** Move logging setup to the very top of `main.py`, before the rembg import block.

### Bug 5 — Box / Wall Artifact in 3D Mesh (fixed 2026-02-21)
**Symptom:** Every generated mesh had a flat rectangular box/wall extruded behind the sculpture.
**Root causes (two layers):**
1. Flux images had dark gradient backgrounds → rembg (`u2net`) failed to fully strip them
2. Preprocessing composited subject onto solid white RGBA canvas → `.convert("RGB")` destroyed alpha → Hunyuan3D saw a solid white 512×512 rectangle and extruded its border as a wall

**Fix (two layers):**
1. Llama system prompt and Flux prompt suffix now force pure white product-photography style backgrounds
2. Canvas changed from `(255,255,255,255)` solid → `(0,0,0,0)` transparent. RGBA image passed directly to pipeline. No RGB conversion.

---

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

## 6. Preprocessing: Background Removal ✅ IMPLEMENTED

Hunyuan3D-V2 performs significantly better when the input image has a clean, isolated subject on a **transparent** background. Dark or gradient backgrounds get interpreted as geometry and extruded into wall artifacts.

### Current pipeline in `process_3d()` (`main.py`)

```python
from rembg import remove, new_session
REMBG_SESSION = new_session("isnet-general-use")  # sharper edges than u2net on dark BGs

# 1. Remove background → RGBA
rgba_image = remove(raw_image, session=REMBG_SESSION)

# 2. Log isolation quality
transparent_pct = np.sum(alpha < 10) / total_pixels * 100
logger.info(f"[REMBG-VERIFY] Transparent BG: {transparent_pct:.1f}%")
# ⚠️ Warning fires if < 20% is transparent — indicates BG removal failure

# 3. Strict alpha threshold: 0 or 255, no fringe
data[:, :, 3] = np.where(alpha < 200, 0, 255)

# 4. Clear 20px border (kill any remaining edge noise)
draw.rectangle([0, 0, w, 20], fill=(0,0,0,0))  # etc.

# 5. Crop to bounding box → scale to 75% of 512x512
rgba_image = rgba_image.crop(bbox).resize((new_w, new_h), Image.Resampling.LANCZOS)

# 6. ⚠️ CRITICAL: Transparent canvas — NOT white!
# alpha=0 background tells Hunyuan3D "empty space, don't reconstruct"
canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))   # ← must be transparent
canvas.paste(rgba_image, (paste_x, paste_y), rgba_image)
image = canvas  # ← Pass RGBA directly. DO NOT convert to RGB.
```

### Why RGBA and NOT RGB
If you call `.convert("RGB")`, the alpha channel is destroyed and the entire white 512×512 canvas becomes solid. Hunyuan3D then treats the rectangular border as geometry and extrudes it into a box/wall around the sculpture. The RGBA alpha channel is the signal that tells the model which pixels are foreground (α=255) vs background (α=0).

### Why `isnet-general-use` and NOT `u2net`
- `isnet-general-use` is trained specifically for sharp salient-object detection
- Handles dark and gradient backgrounds far better than `u2net`
- Model weights: ~179MB, cached at `~/.u2net/isnet-general-use.onnx` after first download
- Pre-download before first request: `python -c "from rembg import new_session; new_session('isnet-general-use')"`

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
