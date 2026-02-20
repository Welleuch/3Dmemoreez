# 3Dmemoreez — Session State Summary
# For handoff to a new chat session

> Last updated: 2026-02-20 23:19

---

## ✅ What is Working RIGHT NOW

1. **Full pipeline runs end-to-end**: Hobbies → Llama → Flux → 4 images → User selects → Hunyuan3D → STL → R2 → 3D Viewer
2. **Docker AI Engine**: Runs locally on GPU (RTX 5060 Ti, `sm_89`), generates ~34 MB STL in ~55 seconds
3. **3D Model renders in browser** via React Three Fiber (STLLoader)
4. **D1 database** correctly tracks session/asset states
5. **R2 storage** stores both images and STL files
6. **Cloudflare Worker** handles all API routing, AI orchestration, webhook receiving

---

## ❌ Known Issues / Bugs

### Issue 1 — Localtunnel Instability (CRITICAL)
**Problem:** `localtunnel` drops intermittently. When it's down, the Cloudflare production Worker silently fails to reach the AI engine (the `ctx.waitUntil` swallows the error). The asset stays in `processing` forever in D1.

**Current workaround:** Manually re-trigger via:
```powershell
Invoke-RestMethod -Uri "https://3dmemoreez-ai.loca.lt/generate-3d" -Method POST `
  -Headers @{"Content-Type"="application/json";"bypass-tunnel-reminder"="true"} `
  -Body '{"image_url":"...","webhook_url":"...","session_id":"...","asset_id":"..."}'
```

**Real fix needed:** Add retry logic in the Worker, or switch to `ngrok` with a persistent URL, or deploy to RunPod.

---

### Issue 2 — "Box" Artifact in 3D Model (MAIN OPEN PROBLEM)
**Problem:** The 3D mesh includes a thin rectangular wall/plane behind the sculpture. This is caused by the input image having a gradient or non-pure background that Hunyuan3D interprets as 3D geometry.

**What was tried:**
- `rembg` U2Net background removal ✅ installed and active in `main.py`
- "Super-Purge" preprocessing: Alpha thresholding at 200/255, 20px border clear, 75% subject scale, pure white sweep ✅ active
- **Result:** The box is smaller but still present. The `rembg` is removing backgrounds but subtle edge gradients remain.

**Root hypothesis for next session:**

The real problem may be **upstream at the image generation stage**, not the background removal stage. The Flux-generated images currently have:
- Dark gradient backgrounds (not pure white)
- Photorealistic rendering style (not suitable for 3D printing from an AI perspective)

**Proposed fix for next session:**
1. **Fix the Flux prompt** to force a white studio/product-photography background: add keywords like `"product photo, pure white background, studio lighting, no shadows, isolated object"`
2. **Fix the Llama system prompt** to ensure generated image prompts describe objects on a white background, not gradient dark renders
3. Then `rembg` will have much less work to do (near-pure white background → trivial removal)

---

## 📁 Key Files to Know

| File | Purpose |
|------|---------|
| `backend/src/index.js` | The entire Cloudflare Worker (API + AI orchestration + webhooks) |
| `backend/ai_engine/main.py` | FastAPI server: image download → rembg → Hunyuan3D → STL → webhook |
| `backend/ai_engine/Dockerfile` | PyTorch nightly cu128 (Blackwell support) |
| `backend/ai_engine/docker-compose.yml` | GPU passthrough, model volume mount |
| `src/components/ThreeSceneViewer.jsx` | 3D Studio: polls D1, loads STL, renders with R3F |
| `src/App.jsx` | Step router + API_BASE_URL definition |
| `docs/ARCHITECTURE.md` | Full system map + endpoints |
| `docs/ai_engine.md` | AI engine deep-dive (3 bugs fixed + params) |

---

## 🔧 Current State of `main.py` Preprocessing

```python
# rembg session loaded at startup
REMBG_SESSION = new_session("u2net")

# In process_3d():
if REMBG_AVAILABLE:
    # 1. Remove background
    image_rgba = remove(raw_image, session=REMBG_SESSION)
    
    # 2. Alpha threshold: kill anything < 200/255 opacity (Super-Purge)
    alpha_np[alpha_np < 200] = 0
    alpha_np[alpha_np >= 200] = 255
    
    # 3. Border clear: 20px all sides
    alpha_np[:20, :] = 0
    alpha_np[-20:, :] = 0
    alpha_np[:, :20] = 0
    alpha_np[:, -20:] = 0
    
    # 4. Crop to bounding box, resize to 75% of 512x512 (128px padding)
    # 5. Final sweep: any pixel > 240 on all channels → force to 255,255,255
    # 6. Convert to RGB on pure white background
```

---

## 🚀 Recommended Next Chat Focus

**Phase A — Fix Image Generation Quality (do this FIRST)**
- Update the Llama system prompt to force: `"pure white studio background, product photography"`
- Add to Flux prompt suffix: `"professional product photo, isolated on white background, studio lighting, no shadows, high contrast edges"`  
- Goal: Concept images should look like **gray 3D-printed parts on a white photo-studio backdrop** — exactly what you'd see on a product sheet

**Phase B — Background Removal**
- Once images naturally have white backgrounds, `rembg` will work cleanly
- If still needed: try `rembg` with `isnet-general-use` model (better edge quality than `u2net`)
- May not even need rembg if Flux generates true white backgrounds

**Phase C — RunPod Deployment**
- Remove localtunnel (the source of all instability)
- Deploy Docker image to RunPod Serverless
- Wire `RUNPOD_ENDPOINT_URL` into Cloudflare Worker secret

---

## 🏃 Local Dev Startup

```powershell
# Terminal 1 — AI Engine
cd backend/ai_engine && docker compose up

# Terminal 2 — Tunnel (CHECK it's alive before clicking!)
npx localtunnel --port 8000 --subdomain 3dmemoreez-ai

# Terminal 3 — Worker
cd backend && npx wrangler dev --remote --port 8787

# Terminal 4 — Frontend
npm run dev
```

**Verify tunnel:** `Invoke-RestMethod https://3dmemoreez-ai.loca.lt/health`
