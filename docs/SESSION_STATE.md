# 3Dmemoreez — Session State
# For handoff to a new chat session

> Last updated: 2026-02-21
> ⚠️ For recurring bugs and their fixes, see: **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**

---

## 🏆 Current Milestone: Full Pipeline Working — Clean Meshes ✅

The full end-to-end pipeline works without artifacts. Here's what was achieved this session:

**Screenshot evidence:** "Corporate Champion" figurine — clean white sculpture on a pedestal, no box wall artifact, FDM RIGIDITY OK + TOPOLOGY PURIFIED shown in viewer.

---

## ✅ What Works Right Now (Complete Feature Set)

1. **Full pipeline end-to-end:** Hobbies → Llama → Flux × 4 → Concept gallery → User selects → Hunyuan3D → STL → R2 → 3D viewer
2. **Image generation quality:** Images look like gray matte clay sculptures on a pure white product-photography background (correct for 3D printing)
3. **Background removal:** `rembg` with `isnet-general-use` isolates the subject cleanly. RGBA image passed directly to Hunyuan3D — no box wall artifact
4. **Mesh generation:** Hunyuan3D-V2 on RTX 5060 GPU, ~55 seconds, ~34MB STL, ~674k triangles
5. **3D Viewer:** React Three Fiber with STLLoader, auto-rotation, orbit controls, pedestal, cortex engraving input
6. **Backend:** Cloudflare Worker handles all API routing, D1 sessions, R2 assets, webhook receiving
7. **Polling:** Frontend polls every 3 seconds, detects `status = 'completed'`, loads STL from R2

---

## ⚠️ Known Limitations / Open Issues

### Issue 1 — Localtunnel Instability
**Problem:** `localtunnel` can drop intermittently. The `ctx.waitUntil()` in the Worker swallows the error. Asset stays in `processing` forever.

**Workaround:** Re-start tunnel + manually re-trigger generation. See `TROUBLESHOOTING.md` Error 4.

**Real fix:** Deploy AI engine to **RunPod Serverless** (Phase 3 next step).

### Issue 2 — AI Engine Not Deployed (Localtunnel Dependency)
The AI engine runs locally on a GPU machine exposed via localtunnel. This is development-only infrastructure. Production requires RunPod or similar GPU cloud.

### Issue 3 — Box Artifact (Minimal, Under Observation)
The previous full box/wall artifact is ✅ **fixed**. There may be minor framing in some edge cases (very dark images). The verification logging in `main.py` will flag any degraded isolations at runtime.

---

## 📁 Key Files

| File | Purpose | Status |
|------|---------|--------|
| `backend/src/index.js` | Cloudflare Worker — ALL API logic | ✅ Deployed to production |
| `backend/ai_engine/main.py` | FastAPI — rembg → Hunyuan3D → webhook | ✅ Running locally |
| `backend/ai_engine/hy3dgen/` | Vendored Hunyuan3D library | ✅ ComfyUI-free |
| `src/App.jsx` | Step router + API_BASE_URL | ✅ Points to production worker |
| `src/components/ThreeSceneViewer.jsx` | 3D Studio + polling | ✅ Working |
| `src/components/ConceptCardGrid.jsx` | 4-image concept gallery | ✅ Working |
| `src/lib/manifold.js` | Manifold WASM pedestal + engraving | 🟡 Basic pedestal works, engraving partial |

---

## 🔧 Current State of Key Configurations

### `backend/src/index.js` — Flux Prompt Strategy
```js
// Llama system prompt forces: pure white background, gray matte clay sculpture,
// product photography style, no shadows, no gradient
const systemPrompt = `...PURE WHITE background (#FFFFFF)... gray matte clay sculpture...`

// Hard-coded suffix appended to EVERY Flux prompt
const FLUX_SUFFIX = ", gray matte clay sculpture, pure white studio background, product photography, isolated object, no shadows, no gradient, flat even lighting, professional product shot";
```

### `backend/ai_engine/main.py` — Preprocessing State
```python
# rembg model (sharp edge detection on dark/gradient BGs)
REMBG_SESSION = new_session("isnet-general-use")

# Critical: transparent canvas, RGBA output — NOT RGB
canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))  # transparent, NOT white
canvas.paste(rgba_image, (paste_x, paste_y), rgba_image)
image = canvas  # RGBA passed directly to Hunyuan3D — DO NOT convert to RGB
```

### `src/App.jsx` + `src/components/ThreeSceneViewer.jsx`
```js
// Always use production worker — DO NOT change to localhost:8787
const API_BASE_URL = 'https://3d-memoreez-orchestrator.walid-elleuch.workers.dev';
```

---

## 🚀 Next Steps (Priority Order)

### 🔴 Priority 1 — RunPod Deployment (eliminates localtunnel)
- [ ] Push Docker image to Docker Hub / RunPod Registry
- [ ] Configure RunPod Network Volume for model weights (`/workspace/models`)
- [ ] Deploy as RunPod Serverless endpoint
- [ ] Add `RUNPOD_ENDPOINT_URL` as Cloudflare Worker secret
- [ ] Update `AI_ENGINE_URL` in `index.js` from localtunnel → RunPod URL
- [ ] **Result:** No more localtunnel. Production-grade pipeline.

### 🟡 Priority 2 — Phase 4: Geometry Studio (Manifold)
- [ ] Engraving feature: `Text3D` mesh from user input → `Manifold.difference` carve
- [ ] Final export: `Manifold.union` → merged pedestal + gift → single watertight STL

### 🟡 Priority 3 — Phase 5: Slicing & Checkout
- [ ] PrusaSlicer CLI on RunPod worker → G-code generation
- [ ] Volume analysis → weight estimate → pricing
- [ ] Stripe/PayPal checkout integration

### 🟢 Priority 4 — UI Polish
- [ ] Noise/film grain background overlay
- [ ] Cursor-following glow effects on glass containers
- [ ] Stagger-animate header characters for editorial reveal

---

## 🏃 Local Dev Startup (Definitive — 3 Terminals Only)

```powershell
# Terminal 1 — AI Engine (from backend/ai_engine/)
.\venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Localtunnel (from project root)
npx localtunnel --port 8000 --subdomain 3dmemoreez-ai

# Terminal 3 — Frontend (from project root)
npm run dev
```

**Open:** `http://localhost:5173`

**DO NOT start** `npx wrangler dev --remote` — it's slow, unnecessary, and causes "Failed to fetch" errors. See `TROUBLESHOOTING.md`.

**To deploy Worker changes after editing `backend/src/index.js`:**
```powershell
cd backend
npx wrangler deploy
```

**Verify alive:**
```powershell
Invoke-RestMethod https://3d-memoreez-orchestrator.walid-elleuch.workers.dev/api/health
Invoke-RestMethod https://3dmemoreez-ai.loca.lt/health
```
