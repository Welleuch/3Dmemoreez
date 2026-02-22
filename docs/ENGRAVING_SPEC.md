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

## 2. 3D Printing Constraints (FDM Optimized)

The engine is tuned for a standard **0.4mm nozzle** and **0.25mm layer height**:
-   **Extraction Depth**: **0.04 units** (approx. **0.4mm**). Matches exactly one nozzle-width of depth for high legibility without weakening the part.
-   **Text Thickness**: **0.06 units**. Ensures a clean, watertight boolean subtraction.
-   **Vertical Spacing**: Adjusted for clear separation between Line 1 (Name) and Line 2 (Date/Message).

## 3. Computational Logic: three-bvh-csg

The system uses `three-bvh-csg` for browser-side geometry processing:
-   **Normalized Grounding**: Before boolean operations, the figurine is translated so its lowest point is exactly at `Y=0`. The pedestal is then positioned to overlap by `0.1 units`, ensuring a watertight union.
-   **Attribute Sanitization**: Before any subtraction or union, all geometries are stripped of `UV`, `color`, and `tangent` attributes. Only `position` and `normal` are preserved to ensure 100% compatibility across varying STL source models.
-   **Double-Model Handshake**: To maintain a 60FPS UI, the "merged" model is calculated in the background. Once ready, the original preview figurine is hot-swapped for the merged result to eliminate "ghosting" effects.

## 4. Typography

-   **Font**: `Helvetiker Bold` (Three.js standard typeface)
-   **Scaling**: Adaptive font sizing based on the `pedestalRadius` and `pedestalHeight`.
-   **Logic**:
    -   Line 1: `Math.min(height * 0.35, width * 0.1)`
    -   Line 2: `Line 1 Scaling * 0.75`

---
*Verified on: RTX 5060, Chrome/WASM, FDM Slicer simulation.*
