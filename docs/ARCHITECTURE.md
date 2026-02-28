# 3Dmemoreez — System Architecture Map

> Last updated: 2026-02-27 (Post-Phase 17)

---

## 1. High-Level Data Flow

```
[User Browser]
   │
   │  POST /api/generate (hobbies)
   ▼
[Cloudflare Worker] ──────────────────────────────────────────────
   │  • Cloudflare AI: Llama-3 (system prompt → DfAM-compliant image prompts)
   │  • Cloudflare AI: Flux Schnell × 4 (image generation)
   │  • Stores images in R2
   │  • Stores asset rows in D1 (status: 'generated')
   │  • Supports Concept Appending: Multiple `/api/generate` calls allowed per session.
   │  • Returns concept list to browser
   │
   │  POST /api/session/select (user picks an image)
   ▼
[Cloudflare Worker]
   │  • Sets asset status = 'processing' in D1
   │  • Fires async POST → 127.0.0.1:8000 → Docker AI Engine (Local Dev)
   │
   │  (fire-and-forget via ctx.waitUntil)
   ▼
[Local Loopback → 127.0.0.1]
   │
   ▼
[Local AI Engine — 127.0.0.1:8000 (Docker)]
   │  • Downloads image from R2 via /api/assets/{key}
   │  • rembg (isnet-general-use) background removal → RGBA transparent canvas
   │  • Runs Hunyuan3D-V2 3-stage inference (GPU — RTX 5060)
   │  • POSTs STL binary to webhook
   │
   │  POST /api/webhook/runpod (STL binary + session_id + asset_id)
   ▼
[Cloudflare Worker — PRODUCTION URL]
   │  • Receives multipart/form-data STL binary
   │  • Stores STL in R2 → key: models___SESSION___ASSET.stl
   │  • Updates D1: status = 'completed', stl_r2_path = key
   │
   │  (frontend polls every 3s)
   ▼
[User Browser — polls /api/session/status]
   │  • Detects status = 'completed'
   │  • Fetches RAW STL via /api/assets/{stl_r2_path}
   │  • Loads and renders in React Three Fiber
   ▼
[3D Studio Geometry Engine]
   │  • BVH-CSG: High-performance boolean operations in browser.
   │  • Persistence: Engraving text (line1/line2) lifted to App state to survive navigation.
   │  • Raw-First Loading: Studio always loads raw STL to prevent "stacked pedestal" recursion.
   │  • High-Stability Normalization: .toNonIndexed() applied to all meshes.
   │  • Strict Attribute Filter: Evaluator forced to ['position', 'normal'] to prevent crashes.
   │  • Rounded Safety Pedestal: Custom LatheGeometry rounded cylinder.
   │  • Cylindrical Vertex Wrapping: Text bent to match pedestal arc.
   │  • Constant-Depth Engraving: 0.4mm depth for structural FDM compliance.
   ▼
[3D Viewer + Rounded Pedestal + Engraving]
   │
   │  Background Pre-Slicing (1.5s debounce after text change)
   │  • POST /api/assets/upload-final (Manifold STL)
   │  • POST /api/slice (Trigger RunPod) → Returns job_id
   │  • GET /api/slice/status?job_id=XYZ (Frontend polls every 3s)
   ▼
[Wait for "Finalize Print"]
   │  • If Job = COMPLETED, Instant Redirect to Checkout
   │  • If Job = POLLING, Show Dynamic Loading UI until finished
   ▼
[Checkout]
```

---

## 2. Endpoint Reference

### Cloudflare Worker — Production
`https://3d-memoreez-orchestrator.walid-elleuch.workers.dev`

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/generate` | Llama → Flux → 4 images → D1/R2 |
| `POST` | `/api/session/select` | Mark asset 'processing', trigger AI engine |
| `GET` | `/api/session/status` | Poll asset completion status |
| `POST` | `/api/webhook/runpod` | Receive STL from AI engine → R2 + D1 |
| `POST` | `/api/assets/upload-final` | Frontend uploads merged manifold mesh to R2 |
| `POST` | `/api/slice` | Trigger RunPod Asynchronous Slicer (`/run`) |
| `GET` | `/api/slice/status` | Poll RunPod Slicer job status + R2 G-code upload |
| `GET` | `/api/assets/{key}` | Serve image/STL/G-code from R2 |

**Query params for `/api/session/status`:**
- `session_id` (required) — UUID of the user session
- `asset_id` (optional) — UUID of the specific concept image chosen

### Local AI Engine (Docker)
`http://127.0.0.1:8000`

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/generate-3d` | Accepts `{image_url, webhook_url, session_id, asset_id}` → starts background inference |
| `GET` | `/health` | Returns `{"status": "ok"}` + model load state |

**Request body for `/generate-3d`:**
```json
{
  "image_url": "http://127.0.0.1:8787/api/assets/concepts___SESSION___ASSET.png",
  "webhook_url": "https://3d-memoreez-orchestrator.walid-elleuch.workers.dev/api/webhook/runpod",
  "session_id": "UUID",
  "asset_id": "UUID"
}
```

---

## 3. Component Map

```
3Dmemoreez/
├── src/                          ← React Frontend (Vite)
│   ├── App.jsx                   ← Step router (Input → Gallery → Studio → Checkout)
│   ├── components/
│   │   ├── FactsInputForm.jsx    ← Step 1: Hobby/fact input
│   │   ├── ConceptCardGrid.jsx   ← Step 2: 4 AI concept images
│   │   ├── ThreeSceneViewer.jsx  ← Step 3: 3D Studio (polls status, loads STL)
│   │   └── Checkout.jsx          ← Step 4: Order confirmation
│   ├── lib/
│   │   ├── csgEngine.js          ← BVH-CSG: pedestal union, wrapping & engraving
│   │   └── api.js                ← API client for Cloudflare Worker
│   └── index.css                 ← Global design tokens (Deep Glass & Space theme)
│
├── backend/
│   ├── src/
│   │   └── index.js              ← Cloudflare Worker (ALL API logic)
│   ├── ai_engine/
│   │   ├── main.py               ← FastAPI server + inference + preprocessing
│   │   ├── Dockerfile            ← PyTorch nightly cu128 (sm_89 + sm_120 support)
│   │   ├── docker-compose.yml    ← GPU passthrough + model volume mount
│   │   ├── requirements.txt      ← Python dependencies
│   │   ├── hy3dgen/              ← Vendored Hunyuan3D library (stripped from ComfyUI)
│   │   │   ├── shapegen/
│   │   │   │   ├── pipelines.py  ← Hunyuan3DDiTFlowMatchingPipeline
│   │   │   │   ├── models/       ← DiT + ShapeVAE model definitions
│   │   │   │   └── postprocessors.py
│   │   │   └── utils/
│   │   └── models/               ← Volume mount: hunyuan3d-dit-v2_fp16.safetensors
│   └── wrangler.toml             ← Cloudflare Worker config (D1 + R2 + AI bindings)
│
└── docs/
    ├── specification.md          ← Vision, tech stack, UX flow
    ├── TODO.md                   ← Phase-by-phase task tracking
    ├── ARCHITECTURE.md           ← This file
    ├── ai_engine.md              ← AI engine deep-dive (bugs, params, perf, preprocessing)
    ├── SESSION_STATE.md          ← Current session state (for new chat handoff)
    └── TROUBLESHOOTING.md        ← Recurring errors + exact fixes (READ FIRST in new chat)
```

---

## 4. Cloudflare Resources

| Resource | Name | ID / Binding |
|----------|------|-------|
| Worker | `3d-memoreez-orchestrator` | `walid-elleuch.workers.dev` |
| D1 Database | `3d_memoreez_db` | `523fa7d4-eb3c-4310-aabc-a591fb5bc0fb` |
| R2 Bucket | `3d-memoreez-assets` | env binding: `ASSETS_BUCKET` |
| AI Gateway | Cloudflare AI | env binding: `AI` |

### D1 Schema (actual, as deployed)

```sql
CREATE TABLE Sessions (
    id TEXT PRIMARY KEY,
    current_step TEXT DEFAULT 'input',
    hobbies_json TEXT,
    selected_concept_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    title TEXT,
    type TEXT,
    score INTEGER,
    image_url TEXT,
    status TEXT DEFAULT 'generated',   -- generated | processing | completed | failed
    stl_r2_path TEXT,
    final_stl_r2_path TEXT, -- Added for manifold model storage
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Note:** The spec mentions `updated_at` on Assets but it does NOT exist in the live DB. Use `created_at` for ordering.

---

## 5. Key Environment Variables

| Variable | Where | Value |
|----------|-------|-------|
| `IS_DOCKER` | Docker container | `true` |
| `MODEL_PATH` | Docker container | `/app/models/hunyuan3d-dit-v2_fp16.safetensors` |
| `AI_ENGINE_URL` | `index.js` (hardcoded) | `https://3dmemoreez-ai.loca.lt/generate-3d` |

---

## 6. Local Dev Startup Checklist (Definitive)

**You only need 3 terminals.** The Worker runs on production — no wrangler dev needed.

```powershell
# Terminal 1 — AI Engine (from backend/ai_engine/)
.\venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Localtunnel (from project root)
npx localtunnel --port 8000 --subdomain 3dmemoreez-ai

# Terminal 3 — Frontend (from project root)
npm run dev
```

**Frontend:** `http://localhost:5173`  
**Worker:** `https://3d-memoreez-orchestrator.walid-elleuch.workers.dev` (always live, called directly)

**To deploy Worker changes:** `cd backend && npx wrangler deploy`

**Verify everything is alive before clicking:**
```powershell
# Worker health
Invoke-RestMethod https://3d-memoreez-orchestrator.walid-elleuch.workers.dev/api/health
# Expected: {"status":"ok"}

# AI Engine via tunnel
Invoke-RestMethod https://3dmemoreez-ai.loca.lt/health
# Expected: {"status":"ok","gpu":true,"import_success":true}
```

> ⚠️ See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common errors and fixes.
