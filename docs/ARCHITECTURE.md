# 3Dmemoreez — System Architecture Map

> Last updated: 2026-02-20

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
   │  • Stores 4 images in R2
   │  • Stores 4 asset rows in D1 (status: 'generated')
   │  • Returns concept list to browser
   │
   │  POST /api/session/select (user picks an image)
   ▼
[Cloudflare Worker]
   │  • Sets asset status = 'processing' in D1
   │  • Fires async POST → localtunnel → Docker AI Engine
   │
   │  (fire-and-forget via ctx.waitUntil)
   ▼
[Localtunnel → https://3dmemoreez-ai.loca.lt]
   │
   ▼
[Docker AI Engine — localhost:8000]
   │  • Downloads image from R2 via /api/assets/{key}
   │  • Runs rembg background removal (Super-Purge pipeline)
   │  • Runs Hunyuan3D-V2 3-stage inference
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
   │  • Fetches STL via /api/assets/{stl_r2_path}
   │  • Loads and renders in React Three Fiber
   ▼
[3D Viewer + Pedestal + Engraving]
```

---

## 2. Endpoint Reference

### Cloudflare Worker — Production
`https://3d-memoreez-orchestrator.walid-elleuch.workers.dev`

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `POST` | `/api/generate` | Llama → Flux → 4 images → D1/R2 | None |
| `POST` | `/api/session/select` | Mark asset 'processing', trigger AI engine | None |
| `GET` | `/api/session/status` | Poll asset completion status | None |
| `POST` | `/api/webhook/runpod` | Receive STL from AI engine → R2 + D1 | None |
| `GET` | `/api/assets/{key}` | Serve image/STL from R2 | None |

**Query params for `/api/session/status`:**
- `session_id` (required) — UUID of the user session
- `asset_id` (optional) — UUID of the specific concept image chosen

### Local AI Engine (Docker)
`http://localhost:8000` (tunneled via `https://3dmemoreez-ai.loca.lt`)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/generate-3d` | Accepts `{image_url, webhook_url, session_id, asset_id}` → starts background inference |
| `GET` | `/health` | Returns `{"status": "ok"}` + model load state |

**Request body for `/generate-3d`:**
```json
{
  "image_url": "https://3d-memoreez-orchestrator.walid-elleuch.workers.dev/api/assets/concepts___SESSION___ASSET.png",
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
│   │   └── manifold.js           ← Manifold WASM: pedestal gen + engraving (in progress)
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
    ├── ai_engine.md              ← AI engine deep-dive (bugs, params, perf)
    └── SESSION_STATE.md          ← Current session state (for new chat handoff)
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
    image_url TEXT,
    status TEXT DEFAULT 'generated',   -- generated | processing | completed | failed
    stl_r2_path TEXT,
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

## 6. Local Dev Startup Checklist

Run these 4 things in separate terminals:

```powershell
# 1. Docker AI Engine (GPU)
cd backend/ai_engine
docker compose up

# 2. Localtunnel (expose port 8000)
npx localtunnel --port 8000 --subdomain 3dmemoreez-ai

# 3. Cloudflare Worker (local dev with remote bindings)
cd backend
npx wrangler dev --remote --port 8787

# 4. Frontend (Vite)
npm run dev
```

**Verify tunnel is alive before clicking a concept image:**
```powershell
Invoke-RestMethod https://3dmemoreez-ai.loca.lt/health
```
