# 3Dmemoreez — Troubleshooting Guide

> Last updated: 2026-02-26

This document captures **recurring bugs** with their root causes and fixes so they don't need to be re-diagnosed in new chat sessions.

---

## ❌ Error 1 — "Failed to crystallize form: Failed to fetch"

### Symptom
The frontend at `http://localhost:5173` shows this alert when submitting hobbies:
```
Failed to crystallize form: Failed to fetch
```

### Root Cause
The frontend's `API_BASE_URL` points to `http://localhost:8787` (wrangler dev).
`wrangler dev --remote` takes **2–5+ minutes** to fully negotiate its remote Cloudflare preview tunnel before it starts proxying requests. During that window, every `fetch()` to port 8787 fails instantly with a network error.

### Affected Files
- `src/App.jsx` — `API_BASE_URL` constant (line ~26)
- `src/components/ThreeSceneViewer.jsx` — `API_BASE_URL` constant (line ~16)

### ✅ Fix (Permanent)
**Do NOT use `localhost:8787` for development.** The Worker is always deployed to production and should be called directly:

```js
// src/App.jsx AND src/components/ThreeSceneViewer.jsx
const API_BASE_URL = 'https://3d-memoreez-orchestrator.walid-elleuch.workers.dev';
```

This is the correct current state of both files. **Do not revert this to `localhost:8787`.**

### Why wrangler dev --remote is NOT needed
- The Cloudflare Worker is deployed via `npx wrangler deploy` any time `backend/src/index.js` changes.
- `wrangler dev --remote` is only useful for breakpoint debugging with DevTools — which we don't need day-to-day.
- The production Worker URL always works, has access to D1/R2/AI bindings, and has zero startup delay.

### Startup Checklist (to avoid this error)
```
You do NOT need to run: npx wrangler dev --remote
You DO need to run:
  1. .\venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000 --reload  (in backend/ai_engine)
  2. npx localtunnel --port 8000 --subdomain 3dmemoreez-ai                    (in project root)
  3. docker-compose up -d                                                     (in backend/slicer - for pricing)
  4. npm run dev                                                                (in project root)
```

---

## ❌ Error 2 — Box / Wall Artifact in 3D Mesh

### Symptom
The 3D mesh in the viewer has a flat rectangular box/wall extruded behind the sculpture.

### Root Cause (Two layers)
1. **Upstream (image):** Flux generates photorealistic renders with dark gradient backgrounds. Even after rembg removes them, semi-transparent fringe pixels survive at the border.
2. **Preprocessing (main.py):** The image was composited onto a **solid white canvas** (`Image.new("RGBA", ..., (255,255,255,255))`) and then converted to **RGB** — destroying the alpha channel. Hunyuan3D saw a solid white 512×512 rectangle and extruded its border as a geometry wall.

### ✅ Fix Applied
**Flux/Llama prompts** (in `backend/src/index.js`):
- System prompt now explicitly demands: `PURE WHITE background, no gradient, no shadows, isolated object`
- A hard-coded suffix appended to every Flux prompt: `", gray matte clay sculpture, pure white studio background, product photography, isolated object, no shadows, no gradient, flat even lighting"`

**Preprocessing** (in `backend/ai_engine/main.py`):
- rembg model changed from `u2net` → **`isnet-general-use`** (sharper edge detection, better on dark/gradient BGs)
- Canvas changed from `(255,255,255,255)` solid white → **`(0,0,0,0)` fully transparent**
- No longer converts to RGB — passes **RGBA image directly to Hunyuan3D**
- `α=0` background pixels tell Hunyuan3D "empty space — don't reconstruct"
- `α=255` subject pixels tell Hunyuan3D "reconstruct this geometry"

### Key Code Pattern (must stay this way)
```python
# ✅ CORRECT — transparent canvas, RGBA output
canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))   # alpha=0 background
canvas.paste(rgba_image, (paste_x, paste_y), rgba_image)
image = canvas  # KEEP AS RGBA — do NOT convert to RGB

# ❌ WRONG — caused the box artifact
canvas = Image.new("RGBA", (512, 512), (255, 255, 255, 255))  # solid white
image = canvas.convert("RGB")  # destroys alpha → Hunyuan3D sees solid rectangle → box wall
```

---

## ❌ Error 3 — `logger` NameError at AI Engine Startup

### Symptom
The AI engine (uvicorn) crashes on startup with:
```
NameError: name 'logger' is not defined
```

### Root Cause
In `main.py`, the `rembg` import block `try/except` referenced `logger` before `logging.basicConfig()` and `logger = getLogger(...)` were defined.

### ✅ Fix Applied
Logging setup was moved **above** the `rembg` try/except block. Correct order in `main.py`:
```python
import logging

# ✅ Define logger FIRST
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AI-Engine")

# THEN import rembg (can now use logger in except)
try:
    from rembg import remove, new_session
    REMBG_SESSION = new_session("isnet-general-use")
    REMBG_AVAILABLE = True
    logger.info("rembg loaded with model: isnet-general-use")
except ImportError:
    REMBG_AVAILABLE = False
    logger.warning("rembg not installed, background removal will be skipped.")
```

---

## ❌ Error 4 — Localtunnel Drops / AI Engine Unreachable

### Symptom
Concept is selected, 3D generation never completes, asset stays in `processing` forever in D1.

### Root Cause
The localtunnel connection to `https://3dmemoreez-ai.loca.lt` dropped silently. The Cloudflare Worker's `ctx.waitUntil()` swallows the error.

### ✅ Workaround (Manual Re-trigger)
```powershell
# 1. Restart the tunnel
npx localtunnel --port 8000 --subdomain 3dmemoreez-ai

# 2. Verify tunnel is live
Invoke-RestMethod https://3dmemoreez-ai.loca.lt/health

# 3. Manually re-trigger generation (fill in actual IDs)
Invoke-RestMethod -Uri "https://3dmemoreez-ai.loca.lt/generate-3d" -Method POST `
  -Headers @{"Content-Type"="application/json";"bypass-tunnel-reminder"="true"} `
  -Body '{"image_url":"<full_image_url>","webhook_url":"https://3d-memoreez-orchestrator.walid-elleuch.workers.dev/api/webhook/runpod","session_id":"<session_id>","asset_id":"<asset_id>"}'
```

### Real Fix (Future)
- Deploy AI engine to **RunPod Serverless** — eliminates localtunnel entirely
- Or use **ngrok** with a fixed persistent URL (paid tier)

---

## ❌ Error 5 — rembg `isnet-general-use` Not Downloaded

### Symptom
AI engine starts but first `generate-3d` request fails because the isnet model weights aren't cached.

### Root Cause
`isnet-general-use` is a ~179MB ONNX model that downloads on first use. If the venv is fresh or the cache is cleared, it downloads at request time which is slow/may time out.

### ✅ Fix — Pre-download before starting the server
```powershell
# Run once after fresh venv setup
cd backend\ai_engine
.\venv\Scripts\python.exe -c "from rembg import new_session; new_session('isnet-general-use'); print('Done')"
```

This caches the model at `~/.u2net/isnet-general-use.onnx` (or similar). After this the engine loads it instantly at startup.

---
 
 ## ❌ Error 6 — Engraving Clipped or Missing
 
 ### Symptom
 Text appears "half-buried" or completely missing on the circular pedestal.
 
 ### Root Cause
 Flat text geometry does not naturally follow a curved surface. Thin text float in the air at the edges of the word (the "Ruler against a Bottle" effect).
 
 ### ✅ Fix Applied (Cylindrical Wrapping)
 **Don't use flat subtraction.** The system now uses **Cylindrical Vertex Wrapping**:
 - `csgEngine.js` contains a `wrapGeometry` function.
 - It bends the text vertices to a perfect polar arc matching the pedestal radius.
 - Engraving depth is set to a constant **0.4mm** (0.04 units) for high-quality FDM printing.
 
 ---
 
 ## ❌ Error 7 — CSG Mismatch: "Attribute uv not available"
 
 ### Symptom
 The CSG union fails silently or crashes the browser when merging the figurine and pedestal.
 
 ### Root Cause
 Different geometries (STLs vs. Three.js primitives) have different vertex attributes. If one mesh has UV coordinates and the other doesn't, the CSG evaluator crashes.
 
 ### ✅ Fix Applied (Attribute Normalization)
 **Unified Format Enforcement**:
 - The engine now forces all geometries (STLs, Text, Primitives) to a **non-indexed** format using `.toNonIndexed()`.
 - This prevents the `TypeError: Cannot read properties of undefined (reading 'push')` or `(reading 'array')` which happens when the CSG engine tries to merge indexed and non-indexed meshes.
 - `evaluator.attributes = ['position', 'normal']` is set globally to ignore UVs/Colors that might be missing in one of the parts.

---

## ❌ Error 8 — Slicer Returns 0g / "Value out of range: fill_density"

### Symptom
Slicer returns `"material_grams": 0.0` even though G-code is generated (~22MB).

### Root Cause
Two issues:
1. **Missing filament density:** Without `--filament-density=1.24` (PLA), PrusaSlicer can't calculate grams. The gcode shows `filament_density = 0`.
2. **Wrong support flag:** `--supports-enable` is not a valid PrusaSlicer CLI option.

### ✅ Fix Applied (`backend/slicer/main.py`)
```python
SLICER_CONFIG = {
    "nozzle_diameter": 0.4,
    "layer_height": 0.2,  # Updated from 0.25mm for accurate estimates
    "infill": "20%",
    "filament_type": "PLA",
    "filament_density": 1.24,  # ← ADD THIS (PLA density in g/cm³)
    ...
}

# CLI command:
"--support-material" if SLICER_CONFIG["support_material"] else "--no-support-material"
```

### Key CLI Options for PrusaSlicer
- `--fill-density=20%` (percentage format)
- `--filament-density=1.24` (required for gram calculation)
- `--support-material` / `--no-support-material` (NOT `--supports-enable`)
- `--layer-height=0.25`
- `--nozzle-diameter=0.4`

---

## ❌ Error 9 — Slicer Model Dimensions Wrong / Off by ~25x

### Symptom
Slicer produces vastly incorrect material estimates (e.g., 790g instead of ~80g for a 100mm model).

### Root Cause
**STL files don't store unit metadata.** Hunyuan3D exports in inches, but trimesh reads them as millimeters.

- trimesh reports: `1.95 × 1.99 × 0.95` (interprets as mm)
- Actual size: `1.95 × 1.99 × 0.95` inches = `49.6 × 50.5 × 24.2` mm

### ✅ Fix Applied (`backend/slicer/main.py`)
```python
# STL files don't store units - Hunyuan3D exports in inches
# Convert from inches to mm (1 inch = 25.4mm)
current_dims_mm = raw_extents * 25.4  # [X, Y, Z] in mm

# Scale so the largest dimension fits within TARGET_HEIGHT_MM
max_dim = max(current_dims_mm)
scale_factor = TARGET_HEIGHT_MM / max_dim
combined_scale = 25.4 * scale_factor
scaled_mesh.apply_scale(combined_scale)
```

### Key Insight
- STL files have NO unit information
- Hunyuan3D outputs in inches (most 3D apps default to inches)
- Must multiply by 25.4 to convert to mm
- Then scale to target height (100mm)

## ❌ Error 10 — Model "Explodes" into Spikes or Disappears on Zoom/Orbit

### Symptom
While orbiting the camera or zooming in the 3D Studio, the figurine suddenly transforms into crazy long spikes or vanishes entirely.

### Root Cause
**In-place Geometry Corruption**: The `three-stl-loader` caches geometry objects. The previous code was calling `geom.translate()` directly on those cached objects. Every time the component re-rendered (on zoom/camera move), it would "stack" translations.
- Result 1: Coordinates became so large they hit `NaN` or infinity (spikes).
- Result 2: The model was pushed thousands of units away from the camera (disappearing).

### ✅ Fix Applied
1. **Safe Centering**: In `ThreeSceneViewer.jsx`, the centering logic now checks `if (Math.abs(center.x) > 0.001 ...)` to only apply the translation **once**.
2. **Read-Only Clones**: In `csgEngine.js`, the figurine geometry is now **cloned** (`figurineMesh.geometry.clone()`) before being used for CSG. This ensures the loader's cache remains untouched and stable.

---

## ❌ Error 11 — "Price/Currency Mismatch" on PayPal Redirect

### Symptom
Checkout shows `19.10€`, but the PayPal/Stripe page shows `$24.20` or a different amount.

### Root Cause
The backend `create-session` logic had hardcoded USD as the currency and an outdated shipping fee (9.00€ vs the new 3.90€).

### ✅ Fix Applied
Synced `backend/src/index.js` with the frontend constants:
- `currency: 'eur'`
- `shippingFee: 3.90`

---

## ❌ Error 12 — Double Pedestal / "Stacked" Geometry

### Symptom
When navigating back from Checkout to the 3D Studio, a new pedestal is generated underneath the existing one (which already had engraving).

### Root Cause
**Manifold Overwrite**: Previously, the system saved the merged (figuiring + pedestal) STL back into the same database column (`stl_r2_path`) used for the raw figurine. 
- Step 1: User finishes studio -> Merged model is saved to `stl_r2_path`.
- Step 2: User goes back -> Studio loads `stl_r2_path` (the merged model).
- Step 3: Studio code sees "A figurine" and adds a pedestal to it. Since the "figurine" already had a pedestal, it now has two.

### ✅ Fix Applied
1. **Dual-Path DB Schema**: Added `final_stl_r2_path` column to the `Assets` table.
2. **Raw-Priority Studio**: The `ThreeSceneViewer` is now hardcoded to **always load the original `stl_r2_path`**. This ensures the studio ALWAYS starts with the clean, raw character.
3. **State Persistence**: Engraving text (`line1`, `line2`) was lifted to `App.jsx` state. Even if the component remounts, the text is preserved and applied to the clean raw model.

---

## 🚀 Correct Local Dev Startup (Definitive)

Run these in order. Each in its own terminal:

```powershell
# Terminal 1 — AI Engine (from backend/ai_engine/)
.\venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Localtunnel (from project root)
npx localtunnel --port 8000 --subdomain 3dmemoreez-ai

# Terminal 3 — Frontend (from project root)
npm run dev
```

**Then open:** `http://localhost:5173`

**Worker:** Always calls `https://3d-memoreez-orchestrator.walid-elleuch.workers.dev` directly — no wrangler dev needed.

**To deploy Worker changes:** Run `npx wrangler deploy` from `backend/` after editing `backend/src/index.js`.

### Verify everything is alive before testing:
```powershell
# Worker health
Invoke-RestMethod https://3d-memoreez-orchestrator.walid-elleuch.workers.dev/api/health
# Expected: {"status":"ok"}

# AI Engine via tunnel
Invoke-RestMethod https://3dmemoreez-ai.loca.lt/health
# Expected: {"status":"ok","gpu":true,"import_success":true}
```

---

## ❌ Error 13 — Cloudflare Worker Timeouts / `AiError: 3046`

### Symptom
When generating initial concept images or clicking "Explore More Concepts", the request spins for ~2 minutes and fails with a `500` error. Cloudflare logs show:
```
AiError: 3046: Request timeout
```

### Root Cause
The `/api/generate` endpoint runs 4 Flux generations in parallel using `Promise.allSettled()`. If the Cloudflare AI pipeline gets busy, executing 4 diffusion models simultaneously takes longer than the internal Worker API limits, and the gateway forcefully cuts the connection. 

### ✅ Current Workarounds & Fixes Let to Attempt
1. **Llama Speedup:** The system prompt for Llama 3 was clamped (max_tokens: 800) to ensure the LLM step happens near-instantly, leaving more time for Flux.
2. **Background Inserts:** Writing the 4 images to the D1 database and generating R2 paths is now offloaded to `ctx.waitUntil(...)` so that database latency doesn't add to the wait time.
3. **Database Schema Fix:** Added required columns (`title`, `type`, `score`) to `Assets` table so the background `batch()` insert doesn't fatally crash with `SQLITE_ERROR`.
4. **The Ultimate Fix (Pending):** If this continues, the Worker shouldn't try to generate 4 images synchronously. It must be refactored to use Server-Sent Events (SSE) to stream images to the frontend as they finish, bypassing the 120-second hard timeout.
