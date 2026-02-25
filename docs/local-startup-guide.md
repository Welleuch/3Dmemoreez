# 3Dmemoreez — Local Startup Guide

> **Why this guide?**
> The 3Dmemoreez platform relies on 5 different interconnected services to function properly (Frontend, Cloudflare Worker, AI Engine, Slicer, and Localtunnels). 
> 
> Starting them in the correct sequence ensures they bind to the right ports and don't block each other, preventing confusing `"Failed to fetch"` errors.

---

## The "Clean Slate" Command
If you previously had the app running, or if a server crashed and left a "zombie" process holding a port hostage (like `localhost:8787`), run this command in **PowerShell** to force-kill all Node and Python tasks before restarting:

```powershell
Get-Process | Where-Object { $_.MainWindowTitle -match "node" -or $_.Name -match "node" -or $_.MainWindowTitle -match "python" -or $_.Name -match "python" } | Stop-Process -Force
```

---

## 🚀 Startup Checklist
Open your terminal (VS Code). You will need **5 separate terminal tabs** running simultaneously. 

Run these commands from the root `3Dmemoreez` folder.

### 1. Slicer Engine (Docker)
This is the FDM geometry engine. It needs Docker Desktop running.
```bash
cd backend/slicer
docker compose up -d
```
*(You can close this specific terminal tab after it says "Started", because it runs in the background).*

### 2. AI GPU Engine (Python)
This is the Hunyuan3D generative model. It requires your GPU.
```bash
cd backend/ai_engine
python main.py
```
> Wait until the logs say `INFO: Model loaded successfully!` and `Uvicorn running on http://0.0.0.0:8000` before proceeding to the next steps.

### 3. Cloudflare Worker (Backend API)
This is the orchestrator.
```bash
cd backend
npx wrangler dev --port 8787 --ip 127.0.0.1
```
*(Notice the `--ip 127.0.0.1` flag. This ensures local routing works perfectly between the Worker, Slicer, and AI Engine).*

### 4. React Frontend
This is the UI you interact with.
```bash
npm run dev
```
Navigate to `http://localhost:5173` in your browser.

### 5. Admin Dashboard
To manage orders and trigger fulfillment:
1. Navigate to `http://localhost:5173/admin`
2. Enter the Admin Token (found in `backend/.dev.vars`)
3. From here you can download STL/G-code files and mark orders as shipped.

---

## 💳 Testing Stripe Payments?
If you are specifically testing the checkout flow and want to see the database updates and email fulfillment trigger in real-time, you need a **5th terminal tab**:

```bash
stripe listen --forward-to http://localhost:8787/api/webhook/stripe
```
*(Note: Requires the Stripe CLI to be installed on your machine).*
