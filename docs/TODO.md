## Phase 0: Infrastructure (Cloudflare Ecosystem)

* [x] **Worker Orchestrator:** Initialize `wrangler` and create the primary backend worker.
* [x] **Secret Management:** Configure Cloudflare Secrets via `wrangler secret put`.
    *   [x] `RUNPOD_API_KEY` (Required for Phase 3)
    *   [x] `RUNPOD_ENDPOINT_ID` (Required for Phase 3)
* [x] **Database Setup:** Create the Cloudflare D1 instance (`3d_memoreez_db`) and run initial migrations.
* [x] **Object Storage:** Initialize Cloudflare R2 buckets for STL and G-Code assets.
* [ ] **Deployment Pipeline:** Connect the GitHub repository to Cloudflare Pages for automated CI/CD. (Dashboard step pending)

## Phase 1: Foundation & Infrastructure

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

## Phase 3: The 3D Sculptor (RunPod Pipeline)

* **RunPod Serverless Setup:** Deploy a container for **Hunyuan3D-DiT-v2**.
* **Async Communication:** * Implement the Webhook in a Cloudflare Worker to receive the `.obj/.stl` file.
* Configure the frontend to poll the D1 database for the "Ready" status.


* **Asset Management:** Ensure the generated mesh is uploaded from RunPod to Cloudflare R2 and served to the frontend.

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
