# 3Dmemoreez — Troubleshooting Guide

> Last updated: 2026-02-21

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
  3. npm run dev                                                                (in project root)
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
 
 ### ✅ Fix Applied
 **Attribute Sanitization**:
 - The engine now stripped away all attributes except `position` and `normal` before any CSG operation.
 - `evaluator.attributes = ['position', 'normal']` is set globally.
 - Both the text and figurine geometries are passed through a sanitizer that creates a clean `BufferGeometry` with only these two attributes.
 
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
