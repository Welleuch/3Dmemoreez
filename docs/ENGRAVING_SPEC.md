# Engraving Feature Specification
# For implementation in the next chat session

> Created: 2026-02-21
> Status: READY TO IMPLEMENT

---

## What the user wants

Two lines of **debossed** (carved INTO the pedestal face) text on the **front face** of the pedestal:

```
Line 1: Name          e.g.  "SARAH"
Line 2: Date/message  e.g.  "JUIN 2026" or "FOR MY HERO"
```

---

## Typography: FDM-Safe Font

**Selected font:** `Montserrat Bold` (or `Outfit ExtraBold` — already used in the app)

**Why this font works for FDM (0.4mm nozzle, 0.25mm layer):**
- Stroke width at minimum letter height (4mm tall): ~0.8–1.0mm → ≥ 2× nozzle diameter ✅
- No hairline serifs to lose detail ✅
- Rounded corners print cleanly with FFF ✅
- Available as web font (already loaded in the app) ✅

**Rules:**
- Minimum letter height: **4mm tall** (scale text to fit pedestal width, capped at 6mm)
- Minimum stroke width: **0.8mm** (enforced by choosing bold weight)
- Letter spacing: slight positive tracking (+0.05em) for better FDM legibility

---

## How the surface is targeted (no raycasting needed)

The pedestal is **parametrically generated** by us with Manifold — we know its exact geometry:

```js
// Pedestal dimensions (from createPedestal() in manifold.js):
const pedestalWidth = (modelBounds.max.x - modelBounds.min.x) + padding * 2;
const pedestalHeight_y = 0.4;   // height in Y axis (thin slab)
const pedestalDepth = (modelBounds.max.z - modelBounds.min.z) + padding * 2;
const centerX = (modelBounds.min.x + modelBounds.max.x) / 2;
const centerZ = (modelBounds.min.z + modelBounds.max.z) / 2;
const bottomY = modelBounds.min.y - pedestalHeight_y / 2;

// Front face of pedestal (the face closest to the camera, +Z direction):
// Z coordinate of front face = centerZ + pedestalDepth / 2
const frontFaceZ = centerZ + pedestalDepth / 2;
```

The text mesh is placed AT this `frontFaceZ` coordinate (for **embossed**) or
slightly INSIDE (for **debossed**):

```js
// DEBOSSED (carved in — chosen by user):
const carveDepthMm = 0.8;  // minimum for FDM legibility at 0.4mm nozzle
const textPositionZ = frontFaceZ - carveDepthMm / 2;  // center of carve depth
// → Manifold.difference(pedestal, textMesh) carves out the text shape
```

---

## Two-line layout

```
┌────────────────────────────────────────────┐
│                                            │
│  ┌──────────────────────────────────────┐  │  ← pedestal front face
│  │         S A R A H                   │  │  ← Line 1 (name), bold, 5mm tall
│  │       J U I N  2 0 2 6              │  │  ← Line 2 (date/msg), regular, 3.5mm
│  └──────────────────────────────────────┘  │
│                                            │
└────────────────────────────────────────────┘
```

**Vertical positioning:**
- Line 1 center Y: `bottomY + pedestalHeight_y * 0.65`  (upper third of pedestal face)
- Line 2 center Y: `bottomY + pedestalHeight_y * 0.30`  (lower third of pedestal face)

**Horizontal:** centered on `centerX`

---

## UI: Two Input Fields

Replace the current single "CORTEX ENGRAVING" input with two fields:

```jsx
// Field 1
<input
  placeholder="NAME"
  maxLength={12}
  value={line1}
  onChange={...}
/>

// Field 2
<input
  placeholder="DATE OR MESSAGE"
  maxLength={16}
  value={line2}
  onChange={...}
/>
```

Both update the 3D viewer in **real-time** as the user types.

---

## Manifold Implementation Plan

```js
// 1. Create text geometry from line1 and line2
//    Use Three.js TextGeometry (from three/addons) to get vertices
//    Then convert to Manifold mesh

// 2. Position text on front face of pedestal
//    line1: z = frontFaceZ, y = upperTextY
//    line2: z = frontFaceZ, y = lowerTextY

// 3. Carve into pedestal (debossed):
//    const engravedPedestal = Manifold.difference(pedestal, textMesh1, textMesh2)

// 4. Merge with AI model (once STL→Manifold conversion is available):
//    const finalMesh = Manifold.union(aiModelManifold, engravedPedestal)
//    → export as STL for slicer

// Note: Three.js TextGeometry → Manifold mesh conversion requires:
//    vertices = Array.from(textGeom.attributes.position.array)
//    indices  = Array.from(textGeom.index.array)
//    → feed into Manifold mesh constructor
```

---

## Known Challenge: TextGeometry → Manifold

`TextGeometry` from Three.js produces a **non-manifold** mesh (open edges, no bottom face).
Manifold requires **watertight** meshes to perform boolean operations.

**Solution approaches:**
1. **Extrude the text shape** into a solid prism manually (add bottom cap + side walls)
2. **Use Manifold's own geometry** — no ready-made text primitive, must be built from scratch
3. **Use `troika-three-text` or `opentype.js`** to get the glyph outline paths, then extrude with Manifold

**Recommended approach for next chat:**
→ Use `opentype.js` to get glyph paths as closed 2D contours
→ Use Manifold `CrossSection` + `.extrude()` to create a proper solid text prism
→ This bypasses Three.js TextGeometry entirely and produces a clean watertight Manifold mesh

```js
import opentype from 'opentype.js';
// Load the same Outfit/Montserrat Bold woff2 used in the viewer
const font = await opentype.load('/fonts/outfit-bold.woff2');
const path = font.getPath('SARAH', 0, 0, 5.0); // 5.0mm size
// → path.commands = [{type:'M',x,y},{type:'L',x,y},...]
// → convert to Manifold CrossSection contour → .extrude(carveDepth)
```

---

## Files to touch in next chat

| File | Change |
|---|---|
| `src/components/ThreeSceneViewer.jsx` | Replace single `engravingText` state with `line1` + `line2` |
| `src/lib/manifold.js` | Add `createEngravedPedestal(Manifold, pedestal, line1, line2, font)` |
| `public/fonts/` | Add Outfit Bold or Montserrat Bold as .woff2 (preloaded, no CDN dependency) |
| `package.json` | Add `opentype.js` dependency |
