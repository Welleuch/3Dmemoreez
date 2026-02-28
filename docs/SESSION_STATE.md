# 3Dmemoreez — Session State
# For handoff to a new chat session

> Last updated: 2026-02-28
> ⚠️ For recurring bugs and their fixes, see: **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**

---

## 🏆 Current Milestone: AI Generation Speed Optimization (WIP) 🚧

Attempted to restore the "blink-of-an-eye" AI generation speed for the initial image generation and the "Explore More" function. While several backend bottlenecks were resolved, the Cloudflare AI `flux-1-schnell` parallel execution is still resulting in intermittent 120-second timeout errors (`AiError: 3046: Request timeout`) and slow subjective response times.

**Previous milestone (2026-02-26):** DfAM Printability & Slicing Integration Complete

---

## ✅ What Works Right Now (Recent Changes)

1. **Background Database Caching:** Changed `env.DB.prepare` calls during the image generation loop to a single `env.DB.batch()` inside `ctx.waitUntil(...)`. This removes database write latency from the user's waiting time.
2. **D1 Schema Update:** Altered the `Assets` table on both `--local` and `--remote` D1 databases to add `title`, `type`, and `score` columns. This fixes a `SQLITE_ERROR` that was previously crashing the background batch saving.
3. **Llama Prompt Trimming:** Hardcapped Llama `max_tokens` to 800 and removed historical-analysis instructions (the `varietyHint`) to prevent the LLM from getting stuck thinking during the "Explore More" phase.
4. **Flux Rate Limiting Parameter:** Added `num_steps: 4` to the `@cf/black-forest-labs/flux-1-schnell` request body in a bid to force Cloudflare to generate imagery as fast as mathematically possible.

---

## ⚠️ Known Limitations / Open Issues

### Issue 1 — Cloudflare AI Generation Timeout (RESOLVED ✅)
**Problem:** The `Promise.allSettled()` block targeting 4 parallel Flux generations intermittently exceeded 120 seconds, causing timeouts and killing the UI response.
**Status:** **Resolved.** Re-architected `/api/generate` to return a Server-Sent Events (SSE) `TransformStream` via `ctx.waitUntil`. By streaming the `session_id` back immediately and streaming the images as soon as they parallel-complete, we bypassed the harsh HTTP blocking timeouts and vastly improved the subjective perceived wait time. Frontend now smoothly updates the UI with placeholders and fills in the concepts incrementally!

### Issue 2 — Resend Sandbox
**Problem:** Emails only deliver to the owner (`walid.elleuch@outlook.de`) until the domain `3dmemoreez.com` is verified.
**Status:** Verification pending domain purchase.

---

## 📁 Key Files

| File | Purpose | Status |
|------|---------|--------|
| `backend/src/index.js` | Orchestrator | 🚧 "Explore More" speed is slow; requires major refactoring |
| `docs/SESSION_STATE.md` | Session Docs | ✅ Updated |

---

## 🚀 Next Steps (Priority Order)

### 🔴 Priority 1 — Solve Slow Image Generation Catastrophe
- [x] Completely rethink the `generate` endpoint in the Cloudflare Worker.
- [x] Investigate if we should switch to Server-Sent Events (SSE) stream returning images 1-by-1 as they load instead of waiting for all 4.
- [x] Implemented Fetch-based SSE parsing in frontend to conditionally render loading skeletons while images complete.

### 🟡 Priority 2 — Analytics & UX
- [ ] Implement post-payment conversion tracking.

---

## 🔧 Deployment Summary
- **Worker:** `https://3d-memoreez-orchestrator.walid-elleuch.workers.dev` (Production)
- **AI Port:** `http://127.0.0.1:8000` (Docker - Local)
- **Slicer Port:** `http://127.0.0.1:8001` (Docker - Local)
- **Frontend:** `http://localhost:5173`
