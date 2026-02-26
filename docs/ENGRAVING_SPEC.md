# Engraving Feature Specification — Final Implementation

> Last updated: 2026-02-21
> Status: COMPLETED

## 1. Geometric Strategy: Cylindrical Vertex Wrapping

To ensure a constant-depth engraving (critical for 3D printing), the system uses a polar-coordinate transformation to "bend" flat text around the circular pedestal.

### transformation Math
For every vertex in the `TextGeometry`:
1.  **Normalize**: Horizontal X is mapped to an angle: `angle = vertex.x / pedestalRadius`.
2.  **Project**: Vertex is projected into polar space:
    -   `newX = (pedestalRadius + vertex.z) * sin(angle)`
    -   `newZ = (pedestalRadius + vertex.z) * cos(angle)`
    -   `newY = vertex.y` (vertical height remains unchanged)
3.  **Result**: This creates a perfect arc where the text "hugs" the cylinder surface precisely.

## 2. 3D Printing Constraints & Safety (FDM Optimized)

The engine is tuned for a standard **0.4mm nozzle** and **0.25mm layer height**:
-   **Rounded Safety Base**: Pedestal now uses a custom `LatheGeometry` to create a cylinder with rounded (fillet) top and bottom edges. This ensures the physical 3D print has no sharp 90-degree corners, making it safer to handle and more premium in feel.
-   **Extraction Depth**: **0.04 units** (approx. **0.4mm**). Matches exactly one nozzle-width of depth for high legibility without weakening the part.
-   **Text Thickness**: **0.06 units**. Ensures a clean, watertight boolean subtraction.
-   **Vertical Spacing**: Adjusted for clear separation between Line 1 (Name) and Line 2 (Date/Message).

## 3. Computational Logic: three-bvh-csg

The system uses `three-bvh-csg` for browser-side geometry processing:
-   **High-Stability Normalization**: All meshes (pedestal, text, figurine) are processed via `.toNonIndexed()` and have all non-essential attributes (UV, color, tangent) stripped. This prevents the "undefined push" crash caused by index/attribute mismatches.
-   **Safe Centering**: Figurine is centered once using a tolerance-checked `translate` to avoid the "exploding spiked geometry" loop caused by repetitive transformations.
-   **Watertight Union**: Figurine and pedestal overlap by `0.05 units`. The figurine is **cloned** before modification to ensure the React loader cache remains pristine.
-   **Double-Model Handshake**: To maintain a 60FPS UI, the "merged" model is calculated in the background. Once ready, the original preview figurine is hot-swapped for the merged result.

## 4. Typography

-   **Font**: `Helvetiker Bold` (Three.js standard typeface)
-   **Scaling**: Adaptive font sizing based on the `pedestalRadius` and `pedestalHeight`.
-   **Logic**:
    -   Line 1: `Math.min(height * 0.35, width * 0.1)`
    -   Line 2: `Line 1 Scaling * 0.75`

---
*Verified on: RTX 5060, Chrome/WASM, FDM Slicer simulation.*
