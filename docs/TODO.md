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
* [x] **Background Removal (Preprocessing):** `rembg` (U2Net) integrated into `main.py`. Super-Purge pipeline active.
    *   [x] `rembg` U2Net session loaded at engine startup.
    *   [x] Runs before pipeline call inside `process_3d()`.
    *   [x] Alpha thresholding (200/255), 20px border clear, 75% subject scale, pure white sweep.
    *   [ ] **Box artifact still present** — the background removal is working but Flux images have dark gradient backgrounds that rembg can't fully strip. **See SESSION_STATE.md.**
    *   [ ] **NEXT: Fix upstream in Flux prompt** — force pure white studio background at image generation time. Then rembg will have trivial work to do.
    *   [ ] Consider switching rembg model to `isnet-general-use` for cleaner edges.
* [ ] **RunPod Serverless Deployment:** Push the verified Docker image to RunPod.
    *   [ ] **Container Registry:** Push image to Docker Hub or RunPod Registry.
    *   [ ] **Network Volume:** Mount `/workspace/models` for weights (avoid re-download every cold start).
    *   [ ] **Startup Script:** Ensure fast cold-start using volume mount (`< 30s` target).
    *   [ ] **Endpoint URL:** Wire RunPod endpoint URL into Cloudflare Worker secret (`RUNPOD_ENDPOINT_URL`).
    *   [ ] **Removes localtunnel dependency** — the root cause of all "Failed to fetch" instability.

## Phase 4: The Geometry Studio (Local Customization)

* **Manifold WASM Integration:** Install and initialize the Manifold-3D library in the React frontend.
* **Parametric Pedestal:** Write the logic to calculate the model's bounding box and generate a matching pedestal mesh.
* **Engraving Feature:** * Create the `Text3D` mesh from user input.
* Execute the `Manifold.difference` operation for real-time carving.


* **Final Export:** Implement the `Manifold.union` to merge the gift and pedestal into one watertight STL.

## Phase 5: Slicing & Logistics

* **Headless Slicer:** Deploy **PrusaSlicer CLI** on a RunPod worker.
* **Volume Analysis:** Calculate the mesh volume in the frontend (or via the slicer) to estimate material weight.
* **Pricing Logic:** Create a helper function to calculate the total cost based on weight, print time, and shipping.
* **Checkout:** Integrate Stripe or PayPal to handle the final transaction.

## Phase 6: Fulfillment & Admin Dashboard

* **G-Code Generation:** Trigger the slicing job upon payment confirmation and save the G-code to R2.
* **Admin Route:** Build a protected `/admin` page to view paid orders.
* **Download Center:** Allow the admin (you) to download the G-code and reference image for printing.
* **Notifications:** Set up automated email confirmations via Resend or Mailgun including the 3D render.
