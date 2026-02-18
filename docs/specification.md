## 1. Project Vision

An end-to-end "Sentiment-to-Physical" platform that transforms personal hobbies and fun facts into unique, 3D-printed gifts. The system prioritizes high-fidelity 3D reconstructions and physical printability (FDM-optimized) using a hybrid Edge (Cloudflare) and GPU-Serverless (RunPod) architecture. It leverages a multi-stage AI pipeline to move from text to image, and then from image to a printable 3D mesh.

Objective
To create a seamless "Sentiment-to-Physical" pipeline that prioritizes joyful and surprising emotional impacts through unique, one-of-a-kind physical gifts.
---

## 2. Technical Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React (Cloudflare Pages) + React Three Fiber (R3F) |
| **3D Geometry Engine** | **Manifold (WASM)** |
| **AI Orchestration** | Cloudflare Workers (Llama 3 + Flux Schnell) |
| **Heavy AI Compute** | RunPod Serverless (Hunyuan3D-DiT-v2) |
| **Slicing Engine** | PrusaSlicer CLI (Containerized on RunPod) |
| **Storage & DB** | Cloudflare R2 (Files) & Cloudflare D1 (State/Orders) |

## 3. The AI Engine: FDM-Friendly Generation

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

1. **Phase 1:** Build the Cloudflare Worker pipeline (Llama -> Flux) and basic React UI.
2. **Phase 2:** Deploy the RunPod Hunyuan3D v2 endpoint and implement the Webhook listener.
3. **Phase 3:** Integrate **Manifold WASM** in the frontend for the pedestal and engraving logic.
4. **Phase 4:** Connect the PrusaSlicer CLI on RunPod for final G-code and price estimation.