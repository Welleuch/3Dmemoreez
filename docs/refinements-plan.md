# UI/UX & Printability Refinements

This phase focuses on refining the user experience, making data collection more flexible, and improving the physical printability of the generated artifacts.

## Overview

We are targeting 4 distinct areas for improvement:
1. **Global UI Polish:** Better margins, padding, and text legibility.
2. **Dynamic Dimensions:** Moving from a strict 3-input model to a fluid "Add another insight" list.
3. **AI Printability:** Adjusting the Llama-3 system prompt to enforce thick, monolithic designs.
4. **Pedestal Overlap:** Adjusting the CSG boolean logic so the model sits higher on the pedestal.

## Proposed Changes

### Phase 11: Frontend (UI & Global Polish)
- **Files:** `App.jsx`, `AdminDashboard.jsx`, and supporting components.
- **Goal:** Sweep through layout containers to improve margins, padding, and text readability. Make it feel more "premium" and less squeezed, especially on mobile.

### Phase 12: Dynamic Inputs (`FactsInputForm.jsx`)
- **UI:** Fix padding/spacing issues, ensure text doesn't truncate on small screens.
- **Logic:** Convert the fixed 3-item array into a dynamic list. Allow users to add/remove input fields so they can provide as much or as little context as they like. Provide an "Add another dimension" button.

### Phase 13: Backend Printability Prompt (`backend/src/index.js`)
- **Prompt Engineering:** Update the Llama 3 system prompt. 
- Emphasize "chunky, thick, monolithic shapes."
- Add strict negative constraints against "thin details, fragile overhangs, delicate protruding parts".
- Ensure the AI understands it's designing a sturdy physical plastic object, not just a picture.

### Phase 14: 3D Processing (Overlap)
- **Pedestal Overlap:** Currently, `centerY` adds `0.1` units of overlap. I will reduce this offset (e.g., to `0.02` or `0.05`) in `ThreeSceneViewer.jsx` so the 3D model sits more *on top* of the pedestal rather than sinking deep into it. 
- **CSG Engine:** Ensure this matches the math inside `csgEngine.js`.
