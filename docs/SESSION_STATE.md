# 3Dmemoreez — Session State
# For handoff to a new chat session

> Last updated: 2026-02-26
> ⚠️ For recurring bugs and their fixes, see: **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**

---

## 🏆 Current Milestone: DfAM Printability & Slicing Integration Complete ✅

The 3D pipeline is now "Production Hardened." AI prompts strictly follow Additive Manufacturing (AM) rules, and the Slicer-to-Checkout flow is fully integrated with actual material math.

**Previous milestone (2026-02-26):** Manifold Geometry Studio & Payment Logic.

---

## ✅ What Works Right Now (Complete Feature Set)

1. **Full pipeline end-to-end:** Hobbies → Llama → Flux × 4 → 3D Model → Studio (Rounded Engraving) → Real Slicing → Checkout (EUR sync).
2. **DfAM Prompt Engineering:** High-stability prompts using "CNC carving" metaphors to ensure monolithic, single-object, monochrome outputs optimized for FDM printing.
3. **Automated Slicing & Pricing:** Real-time G-code generation with material mass calculation (PLA) and accurate pricing feedback.
4. **High-Stability CSG:** Browser-side geometry merging uses `.toNonIndexed()` and strict attribute filtering (position/normal) to prevent crashes.
5. **Rounded Safety Pedestal:** Custom `LatheGeometry`-based cylinder with rounded edges for physical safety and premium aesthetics.
6. **Stable Geometry Viewer:** Prevented "exploding spikes" and disappearing models by implementing safe-centering and geometry cloning (read-only cache protection).
7. **Sync'd Payment Engine:** Backend Cloudflare Worker now correctly handles **EUR (€)** transactions with a **3.90€** shipping fee, matching the frontend UI exactly.
8. **Local loopback (127.0.0.1):** Shifted away from fragile localtunnels for internal AI/Slicer communication to guarantee reliability during development.
9. **Infrastructure:** Dockerized AI Engine (GPU) and Slicer (CPU) running locally on ports 8000 and 8001.

---

## ⚠️ Known Limitations / Open Issues

### Issue 1 — Resend Sandbox
**Problem:** Emails only deliver to the owner (`walid.elleuch@outlook.de`) until the domain `3dmemoreez.com` is verified.
**Status:** Verification pending domain purchase.

---

## 📁 Key Files

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/csgEngine.js` | BVH-CSG Engine | ✅ Rounded Pedestal + .toNonIndexed fix |
| `src/components/ThreeSceneViewer.jsx` | 3D Studio UI | ✅ Safe Centering + Debounced Engraving |
| `backend/src/index.js` | Orchestrator | ✅ EUR/Shipping Fee sync |
| `src/components/Checkout.jsx` | Payment UI | ✅ EUR currency display |

---

## 🚀 Next Steps (Priority Order)

### 🔴 Priority 1 — Production Deployment (RunPod/Cloudflare)
- [x] Optimize AI Engine Docker image for < 30s cold start on RunPod Serverless.
- [ ] Deploy the optimized AI Engine to RunPod and integrate the Endpoint ID into the Worker.
- [ ] Deploy Slicer as a Cloudflare Container for co-located processing.

### 🟡 Priority 2 — Analytics & UX
- [ ] Implement post-payment conversion tracking.
- [ ] Add loading skeletons for the 3D model generation phase.

---

## 🔧 Deployment Summary
- **Worker:** `https://3d-memoreez-orchestrator.walid-elleuch.workers.dev` (Production)
- **AI Port:** `http://127.0.0.1:8000` (Docker - Local)
- **Slicer Port:** `http://127.0.0.1:8001` (Docker - Local)
- **Frontend:** `http://localhost:5173`
