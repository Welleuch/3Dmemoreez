# 3Dmemoreez — Product Specification

> Last updated: 2026-02-25
> Status: **Phase 7 (Admin Dashboard + Fulfillment) Complete ✅ | Phase 5 (RunPod GPU Deployment) — NEXT**

---

## 1. Project Vision

An end-to-end **"Sentiment-to-Physical"** platform that transforms personal hobbies and fun facts into unique, 3D-printed gifts. The user journey goes from typing three hobbies to receiving a confirmation email with their personalized figurine in production.

The platform prioritizes:
- **Joyful surprise** — the AI-generated figurines are unexpected and emotionally resonant
- **Physical printability** — every mesh is FDM-optimized (flat base, no overhangs > 45°, minimum wall thickness 2mm)
- **End-to-end automation** — ideation → mesh → slicing → pricing → payment → fulfillment notification, zero manual steps

---

## 2. Technical Stack

| Layer | Technology | Status |
|---|---|---|
| **Frontend** | React (Vite) + React Three Fiber | ✅ Live |
| **3D Geometry Engine** | three-bvh-csg (in-browser) | ✅ Complete |
| **AI Orchestration** | Cloudflare Workers (Llama 3 + Flux Schnell) | ✅ Deployed |
| **Image Preprocessing** | rembg `isnet-general-use` (local, in AI engine) | ✅ Working |
| **Mesh Generation** | Hunyuan3D-V2-FP16 via local venv/uvicorn | ✅ Working |
| **Slicing Engine** | PrusaSlicer CLI in local Docker container | ✅ Working |
| **Storage** | Cloudflare R2 (images, STL, G-code) | ✅ Active |
| **Database** | Cloudflare D1 (sessions, assets, orders) | ✅ Active |
| **Dev Bridge** | Native 127.0.0.1 loopback (Worker ↔ Python/Docker) | ✅ Complete |
| **Testing** | Vitest + Playwright + pytest | ✅ Complete |
| **CI/CD** | GitHub Actions | ✅ Active |
| **Payment** | Stripe Hosted Checkout (Cards, PayPal, Express) | ✅ Complete |
| **Email** | Resend (transactional) | ✅ Complete |

---

## 3. Full App Pipeline (Input → Payment → Confirmation)

### Stage 1 — Input (`FactsInputForm`)
- User fills 3 hobby/fact fields
- Submits → `POST /api/generate` to Cloudflare Worker
- Worker calls Llama 3 (system prompt with DfAM constraints + pure white studio background mandate)
- Worker calls Flux Schnell × 4 in parallel (each prompt + hard-coded FLUX_SUFFIX for white BG)
- 4 images stored in R2 → returned as concept list

### Stage 2 — Concept Gallery (`ConceptCardGrid`)
- 4 concept cards displayed (2 Literal, 2 Artistic)
- User clicks "Initiate Blueprint" on chosen concept
- `POST /api/session/select` → triggers async Hunyuan3D generation via `127.0.0.1:8000` (Local native bridge)

### Stage 3 — 3D Studio (`ThreeSceneViewer`)
- Frontend polls `/api/session/status` every 3 seconds
- While polling: spinning placeholder animation
- On `status = 'completed'`: STL loaded from R2 into React Three Fiber viewer
- User can:
  - **Rotate/zoom** the mesh (OrbitControls)
  - **Type engraving text** → carved into pedestal in real-time via Manifold WASM
- **"Finalize Print" button** triggers:
  1. In-browser: `Manifold.union(AI_Mesh, Engraved_Pedestal)` → merged watertight STL
  2. Upload final STL to Slicer Engine → get G-code + print stats
  3. Cache pricing + slicer math to `localStorage` (prevents re-slicing on Stripe cancel)
  4. Navigate to Checkout

### Stage 4 — Checkout (`Checkout`)
- Displays final 3D render thumbnail
- Shows slicer output:
  - **Material used** (grams of PLA)
  - **Print duration** (hours:minutes)
  - **Estimated cost** breakdown:
    - Material cost (material_weight_g × €0.03/g)
    - Service fee (flat €12)
    - Shipping (flat €8 EU, €18 international)
- User enters email + shipping address
- Chooses Payment Method (Card, Apple Pay, Google Pay, PayPal, Bank Transfer)
- All payment methods route securely via **Stripe Hosted Checkout**
- Supports seamless cancellation/back-navigation: Returning to `/checkout` intercepts the URL and restores cached session data instead of falling back to the 3D scene.
- On payment confirmation:
  - D1 `Orders` table updated: `status = 'paid'`
  - G-code + final STL stored in R2
  - **Confirmation email sent via Resend** to customer (order summary + 3D render image)
  - **Admin notification email** to owner (order details + G-code download link)

### Stage 5 — Admin Fulfillment (`/admin`)
- Protected route (token-gated)
- Lists all `status = 'paid'` orders
- Per order: download G-code + reference image
- On print complete: mark `status = 'shipped'` → triggers shipping notification email

---

## 4. AI Engine: Mandatory GPU Architecture (Current)

> Running locally via `venv/uvicorn`. Docker image exists but not required for local dev.

**Model:** `hunyuan3d-dit-v2_fp16.safetensors`
**Hardware:** RTX 5060 (sm_89 / Ada), CUDA

### 4.1 Preprocessing Pipeline (rembg)
```python
# isnet-general-use: sharper salient edges than u2net on dark/gradient BGs
REMBG_SESSION = new_session("isnet-general-use")

# Critical: transparent canvas → RGBA to Hunyuan3D (alpha=0 = ignore background)
canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))  # NOT white
image = canvas  # DO NOT convert to RGB → causes box/wall artifact
```

### 4.2 Inference Chain
1. **DiT Diffusion** — 50 steps → latents `[1, 3072, 64]` (~34s)
2. **VAE Forward** — unscale by `scale_factor`, project to `[1, 3072, 1024]` (<1s)
3. **Volume Decode** — 256³ marching cubes at `mc_level=-1/512` (~20s)
4. **Output** — ~34MB STL, ~674k triangles, ~55s total

---

## 5. Slicer Engine Architecture

### What PrusaSlicer CLI Does
- Takes the final merged STL (AI mesh + engraved pedestal)
- Outputs: G-code file + JSON stats (print time, material weight in grams)
- Slicing time for a ~34MB / 674k triangle model: **5–30 seconds** on a 4-core CPU
- CLI command used:
```bash
prusa-slicer-console \
  --slice \
  --layer-height 0.2 \
  --fill-density 15 \
  --filament-type PLA \
  --first-layer-temperature 215 \
  --temperature 210 \
  --bed-temperature 60 \
  --export-gcode \
  --output /output/model.gcode \
  /input/model.stl
```

### 5.1 Local Docker Image (Development & Testing)

**Base image:** `ubuntu:22.04` + PrusaSlicer AppImage (headless)  
**Port:** `8001`  
**API:** Simple FastAPI wrapper accepting STL, returning G-code + stats JSON  
**Volume mounts:** `./input`, `./output`

This is what we build first — fully functional locally before any cloud deployment.

---

### 5.2 Deployment Decision: Cloudflare Containers vs RunPod

| Dimension | Cloudflare Containers | RunPod Serverless |
|---|---|---|
| **Type** | Docker containers, scale-to-zero, co-located with Worker | Docker containers, scale-to-zero, GPU cloud |
| **CPU** | Up to 4 vCPU / 12 GiB RAM per instance | CPU pods available (mainly GPU-focused) |
| **Pricing** | **$0.000020/vCPU-second** (~$0.072/vCPU-hour). 375 vCPU-min free/month with $5 plan | ~$0.01–0.03/hr for CPU pods (estimated, not publicly listed for CPU-only serverless) |
| **Cold start** | Fast (container pre-pulled, edge-warm) | 500ms–10s depending on image size |
| **Max execution time** | No hard wall-clock limit (scale-to-zero after idle) | No hard limit (pay per second) |
| **Slicing cost per order** | ~30s × 2 vCPU = 60 vCPU-seconds = **$0.0012** per slice | ~30s × CPU = est. **$0.001–0.003** per slice |
| **Integration** | Native with Worker (service binding, no public URL needed) | Requires HTTP endpoint + auth headers |
| **Complexity** | Low (Wrangler config, same Cloudflare account) | Medium (RunPod dashboard, API key management) |
| **Status** | Open beta (stable, public since June 2025) | Production-ready |
| **Image size limit** | Max ~4 GB container | No stated limit |
| **Network egress** | Free (same CF network) | Free (no egress fee) |
| **GPU support** | ❌ No | ✅ Yes (for future texture generation etc.) |

### 🏆 Decision: **Cloudflare Containers for Slicer, RunPod for GPU mesh generation**

**Rationale:**
- The slicer is a **pure CPU workload** (30s, no GPU needed). Cloudflare Containers are cheaper, simpler to integrate (service bindings = no public URL), and co-locate with the existing Worker.
- The mesh generation (Hunyuan3D) is a **GPU-mandatory workload** → stays on RunPod when moving to cloud.
- Both services scale to zero — no idle costs.
- Cost per order: ~$0.001 for slicing + ~$0.17 for GPU mesh generation (RTX 4090 Flex, ~55s at $1.10/hr) = **< $0.20 in compute cost per order** — excellent margin.

---

## 6. Manifold WASM — In-Browser Geometry Operations

### What it does
- Runs entirely client-side (no server round-trip for geometry ops)
- **Pedestal generation**: Creates a parametric box/plinth sized to the model's bounding box
- **Engraving**: `Text3D` mesh → `Manifold.difference(pedestal, text_mesh)` → carved letters
- **Final merge**: `Manifold.union(ai_model_mesh, engraved_pedestal)` → single watertight STL for slicing

### Implementation flow
```js
// 1. Model loaded from R2 → STLLoader → BufferGeometry
// 2. Compute bounding box → create pedestal via Manifold
// 3. User types engraving → Text3D → Manifold.difference()
// 4. On "Finalize Print" → Manifold.union → export watertight STL → POST to slicer
```

---

## 7. Data Schema (D1 Database — Current + Extended)

```sql
-- Existing tables (live)
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
    status TEXT DEFAULT 'generated',  -- generated | processing | completed | failed
    stl_r2_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- To add (Phase 4)
CREATE TABLE Orders (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    user_email TEXT,
    status TEXT DEFAULT 'pending',  -- pending | paid | printing | shipped
    price_cents INTEGER,
    material_grams REAL,
    print_duration_minutes INTEGER,
    gcode_r2_path TEXT,
    final_stl_r2_path TEXT,
    tracking_number TEXT,
    stripe_payment_intent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 8. Pricing Model

| Item | Rate |
|---|---|
| Material (Gray PLA) | €0.03 / gram |
| Service fee (AI + design) | €12.00 flat |
| Shipping EU | €8.00 flat |
| Shipping International | €18.00 flat |
| **Typical total (EU, ~40g model)** | **€21.20** |
| **Compute cost per order** | **< €0.20** |
| **Gross margin** | **> 99%** |

Formula: `price = (material_grams × 0.03) + 12.00 + shipping`

---

## 9. Design Guidelines

- **Aesthetic:** "Deep Glass & Space" — dark background, glassmorphism panels, purple/violet accent (`#8b5cf6`)
- **Typography:** ExtraBold/Black italic headers + Light body text. Google Fonts: Outfit or Inter
- **Motion:** Smooth transitions (Framer Motion), auto-rotate in 3D viewer, micro-animations on hover
- **Layout:** Max-width containers, generous padding ("Breathing Room"), vertical-axis centered
- **Mobile:** Responsive step nav (icon-only on small screens), touch-optimized OrbitControls

---

## 10. Implementation Phases

| Phase | Description | Status |
|---|---|---|
| 1 | Cloudflare Worker + Llama + Flux + React UI | ✅ Complete |
| 2 | Local AI Engine Bridge (Hunyuan3D, ComfyUI-free) | ✅ Complete |
| 3 | Background removal (rembg isnet), RGBA fix, Flux/Llama prompt fix | ✅ Complete |
| **4a** | **three-bvh-csg engraving (Text3D → difference → union)** | ✅ Complete |
| **4b** | **PrusaSlicer Docker image (local test)** | ✅ Complete |
| **4c** | **Checkout UI + pricing display from slicer output** | ✅ Complete |
| **4d** | **Stripe payment + Resend confirmation emails** | ✅ Complete |
| **Testing** | **Comprehensive test infrastructure (unit, integration, E2E)** | ✅ Complete |
| 5 | RunPod deployment for GPU mesh generation | ⏳ Later |
| 6 | Cloudflare Containers for slicer (production) | ⏳ Later |
| 7 | Admin dashboard (`/admin`) + fulfillment flow | ✅ Complete |