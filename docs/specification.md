## 1. Project Vision

An end-to-end "Sentiment-to-Physical" platform that transforms personal hobbies and fun facts into unique, 3D-printed gifts. The system prioritizes high-fidelity 3D reconstructions and physical printability (FDM-optimized) using a hybrid Edge (Cloudflare) and GPU-Serverless (RunPod) architecture. It leverages a multi-stage AI pipeline to move from text to image, and then from image to a printable 3D mesh.

Objective
To create a seamless "Sentiment-to-Physical" pipeline that prioritizes joyful and surprising emotional impacts through unique, one-of-a-kind physical gifts.
---

## 2. Technical Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React (Cloudflare Pages: [3dmemoreez.pages.dev](https://3dmemoreez.pages.dev)) + React Three Fiber (R3F) |
| **3D Geometry Engine** | **Manifold (WASM)** |
| **AI Orchestration** | Cloudflare Workers (Llama 3 + Flux Schnell) |
| **Heavy AI Compute** | Standalone Python Server (Hunyuan3D-V2-FP16) - ComfyUI Decoupled |
| **Slicing Engine** | PrusaSlicer CLI (Containerized on RunPod) |
| **Storage & DB** | Cloudflare R2 (Files) & Cloudflare D1 (State/Orders) |
| **Dev Bridge** | Localtunnel (HTTPS) -> Docker/Localhost:8000 |

## 3. The AI Engine: Mandatory GPU Architecture

To support high-end GPUs like the **RTX 40 series (Ada Lovelace, `sm_89`)** and the **RTX 50 series (Blackwell, `sm_120`)**, we use a specialized containerized architecture targeting the latest CUDA kernels. **GPU execution is mandatory; CPU fallback is strictly disabled.**

### 3.1 Docker Environment
*   **Base Image:** `python:3.10-slim` + PyTorch Nightly (`torch-2.7.0.dev+cu128`) wheels
*   **Port:** Exposes `8000` mapped to host.
*   **Model Storage:**
    *   **Local Dev:** Mounts local `.safetensors` file via `docker-compose.yml` (Volume).
    *   **RunPod:** Downloads from Network Volume at cold-start (to be implemented).
*   **Inference Pipeline (3-Stage):**
    1.  **Stage 1 — DiT Diffusion:** `Hunyuan3DDiTFlowMatchingPipeline` runs 50 denoising steps → raw latents `[1, 3072, 64]` (~34s)
    2.  **Stage 2 — VAE Forward:** `ShapeVAE.forward()` applies `post_kl` linear + transformer → processed latents `[1, 3072, 1024]` (<1s). Latents are unscaled by `scale_factor=0.9990943` before this step.
    3.  **Stage 3 — Volume Decode:** `latents2mesh()` fires a 256³ grid query via `geo_decoder`, runs marching cubes at `mc_level=-1/512` → STL (~20s)
*   **Total generation time: ~55s** (octree_resolution=256), ~37s (octree_resolution=128)
*   **Networking:**
    *   **Tunnel:** `localtunnel` exposes `localhost:8000` to public HTTPS.
    *   **Worker:** Connects to Tunnel URL defined in `backend/src/index.js`.
*   **Hardware Compatibility:**
    *   **Architecture:** Targets `sm_89` (RTX 4090) and `sm_120` (RTX 5090).
    *   **Driver:** Requires r550+ for Blackwell support.
    *   **PyTorch:** Uses Nightly Builds (`torch-2.7+cu128`) for bleeding-edge `sm_120` kernel support.

## 4. FDM-Friendly Generation Strategy

To ensure the gifts are printable with **Gray PLA** on **Prusa FDM printers**, the Llama 3 worker uses a highly specific system prompt to guide the Flux image generator.

### 3.1 Llama System Prompt (The DfAM Logic)

> **Role:** You are an expert 3D Design Engineer specializing in Additive Manufacturing (FDM).
> **Task:** Convert user hobbies/facts into a prompt for Flux Schnell.
> **Constraints for Printability:**
> 1. **Base:** Every object must have a clearly defined, flat, and wide structural base.
> 2. **Overhangs:** Avoid any floating parts or angles steeper than 45 degrees. Use organic, tapered transitions.
> 3. **Thickness:** Ensure no part of the model is thinner than 2.0mm. No "whisker" or "hair" textures.
> 4. **Style:** Generate two concepts:
> * **Literal:** A sturdy, fused mashup of the objects.
> * **Artistic:** A solid, sculptural, low-poly or "clay-sculpted" aesthetic.
> 
> 
> 5. **Negative Constraints:** No spindly legs, no detached floating pieces, no intricate internal cavities.
> **Output Format:** Provide only the optimized Flux prompt. Use keywords: "Solid 3D sculpture, gray matte finish, flat base, manifold geometry, studio lighting, high contrast."
> 
> 

---

## 4. Functional Workflow & UI Pages

### Page 1: The Input Stage (Home)

* **Component:** `FactsInputForm`
* **Feature:** 3-5 text fields for hobbies/facts.
* **Action:** Triggers Cloudflare Worker -> Llama -> Flux. User sees a "Thinking..." animation.

### Page 2: The Gallery (Concept Selection)

* **Component:** `ConceptCardGrid`
* **Feature:** Displays 4 Flux-generated images (2 Literal, 2 Artistic).
* **UX:** Hovering over an image highlights the "Printability Score" (simulated based on prompt compliance).

### Page 3: The 3D Studio (Customization)

* **Component:** `ThreeSceneViewer` (R3F)
* **Logic:** Once the user picks an image, the frontend polls a **Webhook** from RunPod.
* **Manifold Integration:**
* **Pedestal:** A `mesh` is auto-generated based on the model's bounding box.
* **Engraving:** User types text -> `TextGeometry` mesh is created -> `Manifold.difference(Pedestal, TextMesh)` is performed in-browser.
* **Fusion:** `Manifold.union(AI_Model, Engraved_Pedestal)` creates the final STL.



### Page 4: Checkout & Slicing

* **Action:** The fused STL is sent to RunPod for a **background slice**.
* **PrusaSlicer CLI Command:** `prusa-slicer --slice --layer-height 0.2 --fill-density 15% --filament-type PLA --output [id].gcode [id].stl`
* **Cost Calculation:** `Material_Weight * Rate + Service_Fee`.
* **Payment:** Stripe/PayPal integration.

---

## 5. Administrative Fulfillment (The "You" Flow)

Once payment is confirmed, the system automates the handover to your workshop:

1. **Email Trigger:** You receive an order notification.
2. **Dashboard Access:** A private admin route `/admin/orders/[id]` provides:
* **The Final STL:** For manual inspection if needed.
* **The G-code:** Pre-configured for your Prusa printers (Gray PLA).
* **Reference Image:** The original AI generation to check against the print quality.


3. **Physical Fulfillment:** You print the G-code, pack it, and update the status to "Shipped," triggering a notification to the customer.

---

## 6. Data Schema (D1 Database)

| Table | Fields |
| --- | --- |
| **Orders** | `id`, `user_email`, `status` (Pending/Paid/Printed), `price`, `tracking_no` |
| **Assets** | `order_id`, `image_url`, `stl_r2_path`, `gcode_r2_path`, `model_volume` |
| **Sessions** | `id`, `current_step`, `hobbies_json`, `selected_concept_id` |

---

## 8. Mobile & UX Strategy

*   **Responsive Stepper:** On mobile, the multi-step navigation shrinks to icon-only or numbered circles to maximize horizontal space.
*   **Touch Controls:** The R3F `OrbitControls` are configured for intuitive mobile gestures (1-finger rotate, 2-finger pinch to zoom).
*   **Progressive Loading:** Use `Suspense` with skeleton loaders for AI generation and 3D model loading to maintain perceived performance.
*   **PWA Potential:** Future support for "Add to Home Screen" to provide a native-like gifting experience.

---

## 9. Design Guidelines

*   **Coherence:** Every element follows a unified "Deep Glass & Space" aesthetic, evoking a physical laboratory in orbit.
*   **Typography:** Editorial-style high contrast in weights; ExtraBold/Black headers (condensed/italic) paired with Light, breathable body text.
*   **Atmospheric Grid:** Use extreme margins and padding (Breathing Room) to create a cinematic, non-cramped feel.
*   **Curated Inputs:** Inputs and buttons are oversized with generous internal padding, ensuring text feels "suspended" rather than trapped.
*   **Tactile Feedback:** Smooth transitions, depth-based shadows (`glow-shadow`), and refined glassmorphism (`backdrop-blur-20px`).
*   **Centered Journey:** The core UX is anchored on a vertical axis for maximum mobile clarity and focused storytelling.

---

## 10. Next Steps

### Implementation Order

1.  **Phase 1:** Build the Cloudflare Worker pipeline (Llama → Flux) and basic React UI. (**✅ COMPLETE**)
2.  **Phase 2:** Set up Local AI Engine Bridge on GPU (Hunyuan3D-V2-FP16). Refactored to be a standalone Python module, removing all ComfyUI dependencies. (**✅ COMPLETE**)
3.  **Phase 3:** Dockerize and validate AI engine locally. Full mesh generation pipeline confirmed working end-to-end. Fixed 3 critical bugs (VAE device, VAE forward pass, mc_level). Production settings: `octree_resolution=256`, `mc_level=-1/512`. (**✅ COMPLETE**)
4.  **Phase 4:** Deploy validated Docker image to RunPod Serverless. Add background removal preprocessing step. (**⏳ NEXT**)
5.  **Phase 5:** Integrate **Manifold WASM** in the frontend for the pedestal and engraving logic.
6.  **Phase 6:** Connect the PrusaSlicer CLI for final G-code and price estimation.