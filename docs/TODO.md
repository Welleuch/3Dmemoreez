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
* [x] **Public Bridge -> Local Loopback:** Replaced fragile `localtunnel` instances with native `127.0.0.1` Wrangler bindings to guarantee stable local communication between the frontend, Cloudflare orchestrator, and local Slicer/AI engines.
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
    *   [x] **Removes localtunnel dependency** — the root cause of all "Failed to fetch" instability (Already completed via native 127.0.0.1 bindings).

## Phase 4a: Manifold Geometry Studio — Engraving (✅ COMPLETE)

* [x] **Text3D Mesh Generation:** Create `TextGeometry` mesh from user input string in `ThreeSceneViewer.jsx`
* [x] **Cylindrical Vertex Wrapping:** Use polar transformation to "bend" text around the pedestal arc.
* [x] **CSG Subtraction:** `evaluator.evaluate(pedestal, text, SUBTRACTION)` → constant-depth carved engraving (0.4mm).
* [x] **Live Preview:** Engrave updates in real-time as user types with hot-swapping to prevent "ghost" models.
* [x] **Unified Union:** `evaluator.evaluate(pedestal, figurine, ADDITION)` → single watertight merged geometry.

## Phase 4b: PrusaSlicer Docker Image (Optimized) — ✅ COMPLETE

* [x] **Multi-Stage Build:** Uses Ubuntu 22.04 builder to extract AppImage securely at build-time.
* [x] **Headless Optimization:** Verified PrusaSlicer 2.8.1 (GTK3) can run in pure headless mode without `xvfb-run` overhead.
* [x] **Dynamic Linker Patch:** Applied `sed` patch to `/usr/bin/prusa-slicer` wrapper to properly append to `LD_LIBRARY_PATH` instead of overwriting it, ensuring system graphics libraries are found.
* [x] **FastAPI wrapper:** Accepts STL file → runs `prusa-slicer --slice` → returns G-code + stats JSON
    * [x] **Accurate Weight Calculation:** Fixed discrepancy (125g vs 83g) by parsing G-code line-by-line to extract support material. 
    * [x] **Ratio-based Math:** Total material = `(Object Extrusion + Support Extrusion)`. Support material grams calculated by the ratio of extrusion lengths.
* [x] **docker-compose.yml:** Port 8001, volume mounts for input/output STLs
* [x] **Cloudflare Worker route:** `POST /api/slice` → forwards STL to slicer (local or container) → returns `{stats, gcode_r2_path}`
* [x] **R2 storage:** Store G-code in R2 under `gcode___SESSION___ASSET.gcode`
* [x] **Scaling Verification:** Confirmed cold-starts are instant as all extraction is done during build.

## Phase 6: Production Deployment — Slicer (RunPod Serverless) — ✅ COMPLETE (2026-02-27)

> Decision rationale: Due to Cloudflare Worker's strict 30-second execution limit for synchronous HTTP requests, the 30.5-second Slicing process was timing out. We transitioned the CPU-heavy PrusaSlicer container to RunPod Serverless `/run` (Async) endpoints to bypass timeouts.

* [x] **Push slicer Docker image** to RunPod Container Registry
* [x] **RunPod Serverless config:** Deployed PrusaSlicer API to a GPU/CPU serverless endpoint
* [x] **Asynchronous Execution:** Worker calls `/api/slice` → RunPod `/run` endpoint (returns job_id instantly)
* [x] **Frontend Polling Architecture:** Built `/api/slice/status` orchestrator route. Frontend polls every 3s until job completes and G-code is uploaded to R2.

## Phase 7: Admin Dashboard + Fulfillment

* [x] **Admin route** `/admin` — token-gated (static secret in CF Worker)
* [x] **Order list:** Paid orders with status, email, price, created_at
* [x] **Per-order actions:** Download G-code, download final STL, view reference image
* [x] **Mark shipped:** Updates D1 `status = 'shipped'` → triggers Resend shipping notification email with tracking number
* [x] **Admin Authentication:** Implement static token check in Worker and simple login in Frontend.
* [x] **Shipping Notification:** Implement `sendShippingEmail` logic in Worker.

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
* [x] **Documentation:** Comprehensive testing guide, architecture diagrams.
* [ ] **CI/CD Refinement:** Configure GitHub Actions to run the full test suite on every push.
* [ ] **E2E Testing Strategy:** Implement a "Simulation Mode" for E2E tests to bypass expensive remote GPU/Slicer calls using pre-recorded mock binaries (STLs/G-codes) to ensure GitHub tests stay fast and free.

---

## Phase 9: Live Notifications & Email Fulfillment (Mostly Complete - Awaiting Domain)

> **Note on Resend Sandbox Constraints:** 
> The email logic and templates are 100% complete and verified. However, because `3dmemoreez.com` is not yet a verified domain in Resend, the account is restricted to Sandbox Mode. In Sandbox Mode, emails from `onboarding@resend.dev` can **only** be delivered to the registered account owner (`walid.elleuch@outlook.de`). Until the official domain is purchased and verified via DNS, all live client emails will be rejected by Resend.

* [x] **Email Infrastructure:** Update `.dev.vars` with real `RESEND_API_KEY`. *(Awaiting Domain Verification for Production)*
* [x] **Provider Alerts:** Construct the email template to send G-code link, STL link, and shipping addresses to the admin instantly upon payment. Include the reference image and snapshot of the 3D model.
* [x] **Client Receipt:** Construct the final customer receipt template with an appealing layout, the selected 2D concept, a snapshot of the 3D model, and order details.

---

## Phase 10: Multi-Payment Deployments (✅ COMPLETE)

> **IMPORTANT: API Key Requirement**
> All payment methods (Cards, Apple Pay, Google Pay, PayPal, Bank Transfers) are securely routed through **Stripe Checkout**. 
> Therefore, **ANY** payment selection requires a valid `STRIPE_SECRET_KEY` in `backend/.dev.vars` to function. The simulation bypass (`sk_test_123`) has been removed to ensure true end-to-end payment testing.

* [x] **Local Stripe configuration:** Update `.dev.vars` with live/test Stripe API keys.
* [x] **Apple Pay & Google Pay:** Configure and verify Stripe wallet elements for instant checkout.
* [x] **PayPal Integration:** Implement PayPal as an alternative checkout path (via Stripe).
* [x] **Bank Transfers:** Implement SEPA / ACH support for high-value operations (via Stripe).

---

## Phase 11: UI/UX Global Improvements — ✅ COMPLETE (2026-02-26)

* [x] **UI Polish:** Fixed spacing, padding, and text boundaries in the Checkout component.
* [x] **Price Architecture:** Localized currency to EUR (€), updated shipping to 3.90€, and simplified Order Summary by combining material/service costs into "Production & Service".
* [x] **Checkout Clarity:** Removed confusing "Global Express" and "Lifetime QC" placeholder badges for a sharper production flow.
* [x] **App.jsx & AdminDashboard.jsx:** Inspected and adjusted layout constraints, ensuring text readability and proper mobile responsiveness.

---

## Phase 12: Dynamic Input Form (`FactsInputForm`)

* [x] **Dynamic Array:** Convert the fixed 3-item state into a dynamic array.
* [x] **Add/Remove Functionality:** Implement a "+ Add dimension" button and a remove/delete button for entries to allow users pure free-form input (e.g., specific facts or hobbies).
* [x] **Fluid UI:** Optimize the layout to handle dynamic heights and multiple items gracefully.

---

## Phase 13: 3D Printability Prompt Optimization

* [x] **Single Object Enforcement:** Update Llama 3 system prompt to strictly forbid scenes, backgrounds, or multiple objects using CNC/stone-carving metaphors.
* [x] **Monochrome Logic (AO/Clay):** Enforced "Ambient Occlusion (AO) Render" and "Clay Sculpt" logic to eliminate color bleeding. Added strict neutral-gray pixel constraints in Flux suffix.
* [x] **Structural Primitives (DfAM):** Added instructions for pyramidal/conical foundations and zero-overhang geometry to ensure support-free FDM printing.

---

## Phase 15: Final Quality Assurance & Hardening

* [x] **Stress Test Prompts:** Run diverse hobbies (e.g., "fireman", "underwater diving", "gardening") to ensure character-props fusions stay monolithic.
* [x] **NSFW Mitigation:** Monitor for false-positive NSFW triggers in clinical AM language (apex, foundation, foundation).
* [ ] **RunPod Hand-off:** Prepare final instructions for transitioning from local AI engine to production GPU endpoint.

---

## Phase 14: CSG Pedestal & UX Refinements — ✅ COMPLETE (2026-02-26)

* [x] **Safety Rounding:** Modified pedestal geometry to a custom rounded cylinder (LatheGeometry) for a premium, safe feel.
* [x] **Engraving UX (Lag Fix):** Implemented debouncing (300ms) for real-time engraving updates to prevent UI hanging.
* [x] **Visual Feedback:** Added a "Engraving..." status indicator when the 3D model is regenerating geometry.
* [x] **Vertical Offset:** Adjusted `centerY` overlap to `0.05` for a structurally sound but clean merge.
* [x] **CSG Stability:** Implemented geometry normalization (`toNonIndexed`) and attribute filtering (position/normal only) to prevent browser crashes during merge.
* [x] **Persistence & Dual-Path Storage:** Separated Raw Character and Final Manifold model paths in D1/R2. Lifted engraving state to App component to ensure text survives navigation (back-and-forth) between Studio and Checkout.

---

## Phase 16: Zero-Wait UX Optimizations — ✅ COMPLETE (2026-02-27)

* [x] **Background Pre-Slicing:** Re-engineered `ThreeSceneViewer` to silently trigger the 30-second Slicing job in the background as soon as the Studio loads (with a 1.5s debounce).
* [x] **Instant Finalize:** Clicking "Finalize Print" after viewing the model for > 30 seconds results in an *instant* transition to Checkout, hiding the entire compute wait time.
* [x] **Dynamic Loading Modal:** Built a beautiful, dynamic React `Printer` modal that displays accurate backend status (`UPLOADING`, `SLICING`, `POLLING`) and progressive a load bar if the user clicks Finalize before the background job finishes.
* [x] **Unified Loading UX:** Upgraded the Step 3 (Mesh Generation) loading state to match the premium slicing aesthetic, including dynamic progress bars, engaging narrative text, and glassmorphism UI elements.

---

## Phase 17: Landing Page Chat UX Refinement

* [x] **Fix Session Recovery UI:** Remove the redundant "Subject: Recovered... Story: Subject: ..." text when navigating back/recovering a session to eliminate scrolling issues and visual clutter.
* [x] **Remove Confirmation Step:** Eliminate the AI's final "Got it! Feel free to crystallize..." message.
* [x] **Auto-Launch Generation:** Automatically trigger the "Crystallize Data" (image generation) action as soon as the user submits their second input (hobbies/facts), removing the need for a final manual button click.

---

## Phase 20: Smart Concept Exploration — ✅ COMPLETE (2026-02-27)

* [x] **Incremental Generation:** Implemented `handleGenerateMore` in `App.jsx` to fetch additional concept variations without resetting the session.
* [x] **State Persistence:** Updated concept state to use an append logic (`prev => [...prev, ...newConcepts]`), allowing infinite exploration of artistic directions.
* [x] **Dual-Path Navigation:** Overhauled `ConceptCardGrid` footer with two dedicated actions: "Revise Story" (back to chat) and "Explore More Concepts" (on-page expansion).
* [x] **Stealth Scrolling:** Optimized `FactsInputForm` with an invisible-on-rest custom scrollbar and forced 80vh height for a more expansive, premium feel.

---

## Phase 18: Flux Image Generation Consistency

* [ ] **Investigate First Run Leaks:** Analyze why the first attempt at generating images often includes leaks (e.g., backgrounds, colors, breaking constraints) while subsequent "Regenerate" clicks work perfectly.
* [ ] **Apply Fix:** Adjust the prompt payload, seed management, or Worker logic for the very first `/api/generate` call to ensure it adheres to the strict monochrome/clay constraints as effectively as regeneration does.

---

## Phase 19: RunPod Mesh Generation Cold-Start Optimization — ✅ COMPLETE (2026-02-28)

* [x] **Pre-trigger / Warm-up Endpoint:** Implement a mechanism to wake up the RunPod Mesh Generation GPU endpoint *during* the image generation or selection phase.
* [x] **Eliminate Cold Starts:** Ensure that by the time the user selects a concept image and triggers the mesh generation, the RunPod container is already active and ready for inference, significantly reducing perceived wait times.
* [x] **Single-Wakeup Logic:** Implemented `session_id` reuse to ensure only one wakeup trigger fires per session, even if the user generates multiple batches of concepts.

## Phase 21: Bug Fixes and Optimization — ✅ COMPLETE (2026-02-28)
* [x] **Webhook Fix:** Fixed the issue where Cloudflare WAF natively blocked the incoming Runpod `requests.post` webhook payload. Resolved by passing a valid browser `User-Agent`.
