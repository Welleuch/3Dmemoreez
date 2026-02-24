 and add 

* [x] **Initial Setup:** Initialize a Vite project with React and Tailwind CSS.
* [x] **3D Environment:** Set up a basic `Canvas` using React Three Fiber and `@react-three/drei`.
* [x] **Layout:** Build the multi-step wizard UI (Input -> Selection -> 3D View -> Checkout).
* [x] **Mobile Optimization:** Ensure fully responsive design and touch-optimized 3D controls.
* [x] **Holistic Design Overhaul:** Rethink typography, spacing, and component coherence for a truly elegant experience.
    *   [x] Refactor `index.css` with consistent type scale and spacing tokens.
    *   [x] Overhaul `FactsInputForm` layout and typography.
    *   [x] Refresh `ConceptCardGrid` for better rhythm and imagery.
    *   [x] Unify Button and Input components with "Breathing Room" padding.
* [ ] **Atmospheric Polish:** Add tactile textures and micro-interactions.
    *   [ ] Implement a subtle noise/film grain background overlay.
    *   [ ] Add cursor-following glow effects for the glass containers.
    *   [ ] Stagger-animate header characters for "editorial" reveal.
* [ ] **PWA Support:** Configure manifest and icons for mobile home screen installation.

## Phase 2: The Ideation Engine (2D AI)

* [x] **Prompt Orchestration:** Implement the Cloudflare Worker to handle the Llama 3 system prompt (DfAM logic).
* [x] **Image Generation:** Connect the Worker to Flux Schnell to generate the 4 concept variations.
* [x] **Frontend Integration:** Create the `FactsInputForm` and the `ConceptCardGrid` to display generated images.
* [x] **Selection State:** Save the user's selected image and session data to D1.

## Phase 3: The 3D Sculptor (AI 3D Pipeline)

* [x] **Local GPU Bridge:** Build `main.py` FastAPI engine to bridge Hunyuan3D-DiT-v2.
* [x] **CUDA Optimization:** Configure RTX 5060 + Torch 2.5.1+cu121 for specialized 3D inference.
* [x] **ComfyUI Decoupling — COMPLETE:** Fully removed ComfyUI dependency from the Hunyuan3D engine.
    *   [x] Vendorized `hy3dgen` package into `backend/ai_engine/hy3dgen/`.
    *   [x] Replaced all ComfyUI-specific imports with pure Python equivalents (`tqdm`, `torch.cuda.empty_cache`, `tempfile`).
    *   [x] Converted ALL relative imports to absolute imports across all 72 Python files.
    *   [x] Fixed incorrect `hy3dgen.utils` → `hy3dgen.shapegen.utils` path in 3 autoencoder modules.
    *   [x] Engine now loads and serves on `http://0.0.0.0:8000` with **zero ComfyUI dependencies**.
* [x] **Public Bridge:** Set up `localtunnel` + `wrangler dev --remote` for end-to-end testing between Cloudflare and Local GPU.
* [x] **Local GPU Resolution:** PIVOT to Docker Container to support high-end hardware.
    *   [x] Create Dockerfile with `python:3.10-slim` base + PyTorch Nightly cu128 wheels.
    *   [x] Create `docker-compose.yml` for local GPU passthrough.
    *   [x] **Blackwell/Ada Hardware Support:** Resolve `sm_120` kernel mismatch for RTX 50/4090.
        *   [x] Verify `torch.cuda.get_arch_list()` includes `sm_120`.
        *   [x] **Disable CPU Fallback:** Hardcoded mandatory GPU access in `main.py`.
* [x] **3-Stage Inference Pipeline Fixed — COMPLETE:** Three compounding bugs resolved.
    *   [x] **Bug 1:** `vae.to(DEVICE)` after load — `from_single_file()` places VAE on CPU by default.
    *   [x] **Bug 2:** `latents = vae(latents)` forward pass added — `post_kl + transformer` required before `latents2mesh()`.
    *   [x] **Bug 3:** `mc_level=-1/512` — Hunyuan3D-specific isosurface level (NOT 0.0).
    *   [x] `latents = latents / vae.scale_factor` applied before VAE forward pass.
* [x] **Production Settings Validated:**
    *   [x] `octree_resolution=256`, `mc_level=-1/512`, `num_chunks=8000`
    *   [x] Output: **33.7 MB STL**, ~674k triangles, **~55s total generation time**
* [x] **Automated Testing:** `test_docker_simulation.py` — pytest-based end-to-end test with local webhook server.
    *   [x] Webhook receives STL binary, saves as `test_result.stl` on host.
    *   [x] Assertion: file size > 100 bytes. `MAX_WAIT_TIME=300s`.
* [x] **Async Communication:** Implement the Webhook in Cloudflare Worker and Python `requests` feedback.
* [x] **Frontend Polling:** Updated frontend to poll D1 database for "completed" 3D status.
* [x] **Asset Management:** Mesh uploading from local bridge to Cloudflare R2 via Webhook binary transfer.
* [x] **Background Removal (Preprocessing) ✅ COMPLETE (2026-02-21):** `rembg` with `isnet-general-use` integrated. Box artifact eliminated.
    *   [x] rembg model: `u2net` → **`isnet-general-use`** (sharper edges on dark/gradient BGs)
    *   [x] Verification logging: transparent%, opaque%, fringe% logged after every rembg run. Warning if < 20% transparent.
    *   [x] Canvas changed from solid white `(255,255,255,255)` → **transparent `(0,0,0,0)`** — RGBA passed directly to Hunyuan3D
    *   [x] **Box/wall artifact eliminated** — confirmed with "Corporate Champion" figurine (clean mesh, no extrusion)
    *   [x] **Flux/Llama prompts fixed** — system prompt forces pure white product photography; FLUX_SUFFIX appended to every generation
* [ ] **RunPod Serverless Deployment:** Push the verified Docker image to RunPod.
    *   [ ] **Container Registry:** Push image to Docker Hub or RunPod Registry.
    *   [ ] **Network Volume:** Mount `/workspace/models` for weights (avoid re-download every cold start).
    *   [ ] **Startup Script:** Ensure fast cold-start using volume mount (`< 30s` target).
    *   [ ] **Endpoint URL:** Wire RunPod endpoint URL into Cloudflare Worker secret (`RUNPOD_ENDPOINT_URL`).
    *   [ ] **Removes localtunnel dependency** — the root cause of all "Failed to fetch" instability.

## Phase 4a: Manifold Geometry Studio — Engraving (✅ COMPLETE)

 and add 

* [x] **Initial Setup:** Initialize a Vite project with React and Tailwind CSS.
* [x] **3D Environment:** Set up a basic `Canvas` using React Three Fiber and `@react-three/drei`.
* [x] **Layout:** Build the multi-step wizard UI (Input -> Selection -> 3D View -> Checkout).
* [x] **Mobile Optimization:** Ensure fully responsive design and touch-optimized 3D controls.
* [x] **Holistic Design Overhaul:** Rethink typography, spacing, and component coherence for a truly elegant experience.
    *   [x] Refactor `index.css` with consistent type scale and spacing tokens.
    *   [x] Overhaul `FactsInputForm` layout and typography.
    *   [x] Refresh `ConceptCardGrid` for better rhythm and imagery.
    *   [x] Unify Button and Input components with "Breathing Room" padding.
* [ ] **Atmospheric Polish:** Add tactile textures and micro-interactions.
    *   [ ] Implement a subtle noise/film grain background overlay.
    *   [ ] Add cursor-following glow effects for the glass containers.
    *   [ ] Stagger-animate header characters for "editorial" reveal.
* [ ] **PWA Support:** Configure manifest and icons for mobile home screen installation.

## Phase 2: The Ideation Engine (2D AI)

* [x] **Prompt Orchestration:** Implement the Cloudflare Worker to handle the Llama 3 system prompt (DfAM logic).
* [x] **Image Generation:** Connect the Worker to Flux Schnell to generate the 4 concept variations.
* [x] **Frontend Integration:** Create the `FactsInputForm` and the `ConceptCardGrid` to display generated images.
* [x] **Selection State:** Save the user's selected image and session data to D1.

## Phase 3: The 3D Sculptor (AI 3D Pipeline)

* [x] **Local GPU Bridge:** Build `main.py` FastAPI engine to bridge Hunyuan3D-DiT-v2.
* [x] **CUDA Optimization:** Configure RTX 5060 + Torch 2.5.1+cu121 for specialized 3D inference.
* [x] **ComfyUI Decoupling — COMPLETE:** Fully removed ComfyUI dependency from the Hunyuan3D engine.
    *   [x] Vendorized `hy3dgen` package into `backend/ai_engine/hy3dgen/`.
    *   [x] Replaced all ComfyUI-specific imports with pure Python equivalents (`tqdm`, `torch.cuda.empty_cache`, `tempfile`).
    *   [x] Converted ALL relative imports to absolute imports across all 72 Python files.
    *   [x] Fixed incorrect `hy3dgen.utils` → `hy3dgen.shapegen.utils` path in 3 autoencoder modules.
    *   [x] Engine now loads and serves on `http://0.0.0.0:8000` with **zero ComfyUI dependencies**.
* [x] **Public Bridge:** Set up `localtunnel` + `wrangler dev --remote` for end-to-end testing between Cloudflare and Local GPU.
* [x] **Local GPU Resolution:** PIVOT to Docker Container to support high-end hardware.
    *   [x] Create Dockerfile with `python:3.10-slim` base + PyTorch Nightly cu128 wheels.
    *   [x] Create `docker-compose.yml` for local GPU passthrough.
    *   [x] **Blackwell/Ada Hardware Support:** Resolve `sm_120` kernel mismatch for RTX 50/4090.
        *   [x] Verify `torch.cuda.get_arch_list()` includes `sm_120`.
        *   [x] **Disable CPU Fallback:** Hardcoded mandatory GPU access in `main.py`.
* [x] **3-Stage Inference Pipeline Fixed — COMPLETE:** Three compounding bugs resolved.
    *   [x] **Bug 1:** `vae.to(DEVICE)` after load — `from_single_file()` places VAE on CPU by default.
    *   [x] **Bug 2:** `latents = vae(latents)` forward pass added — `post_kl + transformer` required before `latents2mesh()`.
    *   [x] **Bug 3:** `mc_level=-1/512` — Hunyuan3D-specific isosurface level (NOT 0.0).
    *   [x] `latents = latents / vae.scale_factor` applied before VAE forward pass.
* [x] **Production Settings Validated:**
    *   [x] `octree_resolution=256`, `mc_level=-1/512`, `num_chunks=8000`
    *   [x] Output: **33.7 MB STL**, ~674k triangles, **~55s total generation time**
* [x] **Automated Testing:** `test_docker_simulation.py` — pytest-based end-to-end test with local webhook server.
    *   [x] Webhook receives STL binary, saves as `test_result.stl` on host.
    *   [x] Assertion: file size > 100 bytes. `MAX_WAIT_TIME=300s`.
* [x] **Async Communication:** Implement the Webhook in Cloudflare Worker and Python `requests` feedback.
* [x] **Frontend Polling:** Updated frontend to poll D1 database for "completed" 3D status.
* [x] **Asset Management:** Mesh uploading from local bridge to Cloudflare R2 via Webhook binary transfer.
* [x] **Background Removal (Preprocessing) ✅ COMPLETE (2026-02-21):** `rembg` with `isnet-general-use` integrated. Box artifact eliminated.
    *   [x] rembg model: `u2net` → **`isnet-general-use`** (sharper edges on dark/gradient BGs)
    *   [x] Verification logging: transparent%, opaque%, fringe% logged after every rembg run. Warning if < 20% transparent.
    *   [x] Canvas changed from solid white `(255,255,255,255)` → **transparent `(0,0,0,0)`** — RGBA passed directly to Hunyuan3D
    *   [x] **Box/wall artifact eliminated** — confirmed with "Corporate Champion" figurine (clean mesh, no extrusion)
    *   [x] **Flux/Llama prompts fixed** — system prompt forces pure white product photography; FLUX_SUFFIX appended to every generation
* [ ] **RunPod Serverless Deployment:** Push the verified Docker image to RunPod.
    *   [ ] **Container Registry:** Push image to Docker Hub or RunPod Registry.
    *   [ ] **Network Volume:** Mount `/workspace/models` for weights (avoid re-download every cold start).
    *   [ ] **Startup Script:** Ensure fast cold-start using volume mount (`< 30s` target).
    *   [ ] **Endpoint URL:** Wire RunPod endpoint URL into Cloudflare Worker secret (`RUNPOD_ENDPOINT_URL`).
    *   [ ] **Removes localtunnel dependency** — the root cause of all "Failed to fetch" instability.

## Phase 4a: Manifold Geometry Studio — Engraving (✅ COMPLETE)

* [x] **Text3D Mesh Generation:** Create `TextGeometry` mesh from user input string in `ThreeSceneViewer.jsx`
* [x] **Cylindrical Vertex Wrapping:** Use polar transformation to "bend" text around the pedestal arc.
* [x] **CSG Subtraction:** `evaluator.evaluate(pedestal, text, SUBTRACTION)` → constant-depth carved engraving (0.4mm).
* [x] **Live Preview:** Engrave updates in real-time as user types with hot-swapping to prevent "ghost" models.
* [x] **Unified Union:** `evaluator.evaluate(pedestal, figurine, ADDITION)` → single watertight merged geometry.

## Phase 4b: PrusaSlicer Docker Image (Local) — ✅ COMPLETE

* [x] **Dockerfile:** Ubuntu 22.04 + PrusaSlicer AppImage (headless/CLI build)
* [x] **FastAPI wrapper:** Accepts STL file → runs `prusa-slicer-console --slice` → returns G-code + stats JSON
    * [x] **Accurate Weight Calculation:** Fixed discrepancy (125g vs 83g) by parsing G-code line-by-line to extract support material. 
    * [x] **Ratio-based Math:** Total material = `(Object Extrusion + Support Extrusion)`. Support material grams calculated by the ratio of extrusion lengths.
* [x] **docker-compose.yml:** Port 8001, volume mounts for input/output STLs
* [x] **Cloudflare Worker route:** `POST /api/slice` → forwards STL to slicer (localtunnel) → returns `{stats, gcode_r2_path}`
* [x] **R2 storage:** Store G-code in R2 under `gcode___SESSION___ASSET.gcode`

> **Note:** STL files don't store units. Hunyuan3D exports in inches - must multiply by 25.4 to get mm. Scale to 100mm based on largest dimension.
* [ ] **Cloudflare Worker secret:** Add `RUNPOD_ENDPOINT_URL`
* [ ] **Replace localtunnel:** Update `AI_ENGINE_URL` in `index.js` from localtunnel → RunPod endpoint
* [ ] **Test end-to-end:** Verify full pipeline without localtunnel

## Phase 6: Production Deployment — Slicer (Cloudflare Containers)

> Decision rationale: Slicer is CPU-only (~30s), co-located with CF Worker (service binding, no public URL), cheaper than RunPod for CPU work ($0.0012/slice).

* [ ] **Push slicer Docker image** to registry
* [ ] **Cloudflare Containers config** in `wrangler.toml`
* [ ] **Service binding** in Worker: call slicer container directly without HTTP round-trip
* [ ] **Replace localtunnel slicer:** Update Worker to use container binding instead of `localhost:8001`

## Phase 7: Admin Dashboard + Fulfillment

* [ ] **Admin route** `/admin` — token-gated (static secret in CF Worker)
* [ ] **Order list:** Paid orders with status, email, price, created_at
* [ ] **Per-order actions:** Download G-code, download final STL, view reference image
* [ ] **Mark shipped:** Updates D1 `status = 'shipped'` → triggers Resend shipping notification email with tracking number

---

## Phase 8: Testing Infrastructure — ✅ COMPLETE (2026-02-23)

* [x] **Test Framework Setup:** Vitest + Playwright + pytest configuration
* [x] **Unit Tests:** 
    * [x] React component tests (FactsInputForm)
    * [x] CSG geometry engine tests
    * [x] AI preprocessing tests (Python)
    * [x] Slicer logic tests (Python)
* [x] **Integration Tests:**
    * [x] Cloudflare Worker API endpoints
    * [x] D1 database operations
    * [x] R2 storage operations
    * [x] CORS and error handling
* [x] **E2E Tests:**
    * [x] Full user journey structure
    * [x] Cross-browser testing setup
    * [x] Mobile responsiveness tests
* [x] **CI/CD Pipeline:**
    * [x] GitHub Actions workflow
    * [x] Automated test execution
    * [x] Coverage reporting (Codecov)
* [x] **Test Fixtures:**
    * [x] Mock data objects
    * [x] MSW mock server
    * [x] Sample test files
* [x] **Documentation:**
    * [x] Comprehensive testing guide
    * [x] Quick start guide
    * [x] Testing architecture diagrams
    * [x] Practical examples
    * [x] New feature checklist

**Test Coverage:** ~50% (target: 80%+)
**Test Execution Time:** ~4 minutes (target: < 6 minutes)
**Documentation:** 8 comprehensive guides created

---

## Phase 9: Live Notifications & Email Fulfillment (Next Immediate Goal)

* [ ] **Email Infrastructure:** Update `.dev.vars` with real `RESEND_API_KEY` and verify domain.
* [ ] **Provider Alerts:** Construct the email template to send G-code link, STL link, and shipping addresses to the admin (`walid.elleuch@outlook.de`) instantly upon payment. Include the reference image and snapshot of the 3D model.
* [ ] **Client Receipt:** Construct the final customer receipt template with an appealing layout, the selected 2D concept, a snapshot of the 3D model (with pedestal/engraving), and order details.

---

## Phase 10: Multi-Payment Deployments (Upcoming)

* [ ] **Local Stripe configuration:** Update `.dev.vars` with live Stripe API keys.
* [ ] **Apple Pay & Google Pay:** Configure and verify Stripe wallet elements for instant checkout.
* [ ] **PayPal Integration:** Implement PayPal as an alternative checkout path.
* [ ] **Bank Transfers:** Implement SEPA / ACH support for high-value operations.
