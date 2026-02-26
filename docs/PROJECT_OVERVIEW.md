# 3Dmemoreez - Project Overview

> Visual guide to the complete project structure

---

## 🎯 Project Vision

Transform personal hobbies into physical 3D-printed gifts using AI - from text input to shipped product in days.

---

## 📊 Project Status Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                    PROJECT HEALTH                           │
├─────────────────────────────────────────────────────────────┤
│ Phase 1: Frontend UI              ████████████ 100% ✅      │
│ Phase 2: AI Pipeline               ████████████ 100% ✅      │
│ Phase 3: 3D Generation             ████████████ 100% ✅      │
│ Phase 4a: Engraving                ████████████ 100% ✅      │
│ Phase 4b: Slicing                  ████████████ 100% ✅      │
│ Phase 4c: Checkout UI Upgrade      ████████████ 100% ✅      │
│ Phase 4d: Payment & Email          ████████░░░░  65% 🟡      │
│ Testing Infrastructure             ████████████ 100% ✅      │
│                                                              │
│ Overall Progress:                  ██████████░░  85% 🟢      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                         │
└──────────────────────────────────────────────────────────────┘

Step 1: Input Hobbies
   ↓
┌─────────────────┐
│ 3 Text Inputs   │ → "Photography, Hiking, Cooking"
└─────────────────┘
   ↓
Step 2: AI Concept Generation
   ↓
┌─────────────────────────────────────────────────────────────┐
│ Cloudflare Worker                                           │
│  ├─ Llama 3: Generate 4 prompts                            │
│  └─ Flux Schnell: Generate 4 images                        │
└─────────────────────────────────────────────────────────────┘
   ↓
Step 3: Select Concept
   ↓
┌─────────────────┐
│ 4 Concept Cards │ → User picks one
└─────────────────┘
   ↓
Step 4: 3D Generation
   ↓
┌─────────────────────────────────────────────────────────────┐
│ AI Engine (Local GPU)                                       │
│  ├─ rembg: Remove background                               │
│  ├─ Hunyuan3D: Generate 3D mesh                            │
│  └─ Upload STL to R2                                        │
└─────────────────────────────────────────────────────────────┘
   ↓
Step 5: 3D Studio
   ↓
┌─────────────────────────────────────────────────────────────┐
│ Browser (React Three Fiber)                                 │
│  ├─ Display 3D model                                        │
│  ├─ Add custom engraving                                    │
│  └─ Merge with pedestal (CSG)                              │
└─────────────────────────────────────────────────────────────┘
   ↓
Step 6: Slicing
   ↓
┌─────────────────────────────────────────────────────────────┐
│ Slicer (Local Docker)                                       │
│  ├─ PrusaSlicer: Generate G-code                           │
│  ├─ Calculate material weight                               │
│  └─ Calculate print time                                    │
└─────────────────────────────────────────────────────────────┘
   ↓
Step 7: Checkout
   ↓
┌─────────────────┐
│ Price: $22.93   │ → Material + Service + Shipping
│ Pay with Stripe │ → (TODO)
└─────────────────┘
   ↓
Step 8: Fulfillment
   ↓
┌─────────────────┐
│ Email Receipt   │ → Customer + Admin (TODO)
│ Print & Ship    │ → Admin Dashboard (TODO)
└─────────────────┘
```

---

## 🗂️ Project Structure

```
3Dmemoreez/
│
├── 📱 Frontend (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── FactsInputForm.jsx      ✅ Step 1
│   │   │   ├── ConceptCardGrid.jsx     ✅ Step 2-3
│   │   │   ├── ThreeSceneViewer.jsx    ✅ Step 4-5
│   │   │   └── Checkout.jsx            ✅ Step 6-7
│   │   └── lib/
│   │       └── csgEngine.js            ✅ Geometry ops
│   └── tests/                          ✅ Frontend tests
│
├── ☁️ Backend (Cloudflare)
│   └── src/
│       └── index.js                    ✅ Worker orchestrator
│
├── 🤖 AI Engine (Python + FastAPI)
│   ├── main.py                         ✅ 3D generation
│   ├── hy3dgen/                        ✅ Hunyuan3D library
│   └── tests/                          ✅ Python tests
│
├── 🔧 Slicer (Python + Docker)
│   ├── main.py                         ✅ G-code generation
│   └── tests/                          ✅ Slicer tests
│
├── 🧪 Testing
│   ├── tests/unit/                     ✅ Component tests
│   ├── tests/integration/              ✅ API tests
│   └── tests/e2e/                      ✅ User journey tests
│
└── 📚 Documentation
    ├── README.md                       ✅ Project overview
    ├── docs/                           ✅ All guides
    └── TESTING_SUMMARY.md              ✅ Testing docs
```

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      DATA PIPELINE                          │
└─────────────────────────────────────────────────────────────┘

User Input (Text)
      ↓
Llama 3 (Prompts)
      ↓
Flux Schnell (Images) → R2 Storage
      ↓
User Selection
      ↓
Hunyuan3D (3D Mesh) → R2 Storage
      ↓
Browser (Engraving)
      ↓
PrusaSlicer (G-code) → R2 Storage
      ↓
Checkout (Pricing)
      ↓
Stripe (Payment) → D1 Database
      ↓
Email (Confirmation)
      ↓
Admin (Fulfillment)
```

---

## 💾 Storage Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE RESOURCES                     │
└─────────────────────────────────────────────────────────────┘

D1 Database (SQLite)
├── Sessions
│   ├── id (UUID)
│   ├── hobbies_json
│   └── selected_concept_id
└── Assets
    ├── id (auto-increment)
    ├── session_id
    ├── image_url
    ├── status (generated/processing/completed)
    └── stl_r2_path

R2 Storage (S3-compatible)
├── concepts___SESSION___ASSET.png    (Flux images)
├── models___SESSION___ASSET.stl      (3D meshes)
└── gcode___SESSION___ASSET.gcode     (Slicing output)
```

---

## 🧪 Testing Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      TEST PYRAMID                           │
└─────────────────────────────────────────────────────────────┘

                    ╱╲
                   ╱  ╲
                  ╱ E2E ╲          10 tests, 3 min
                 ╱────────╲         Full journeys
                ╱          ╲
               ╱Integration╲       20 tests, 25 sec
              ╱──────────────╲      API + DB + R2
             ╱                ╲
            ╱      Unit        ╲    30+ tests, 5 sec
           ╱────────────────────╲   Components + Logic

Total: 60+ tests, ~4 minutes, 50%+ coverage
```

---

## 📈 Performance Metrics

```
┌─────────────────────────────────────────────────────────────┐
│                    TIMING BREAKDOWN                         │
└─────────────────────────────────────────────────────────────┘

User Input                    →  Instant
Llama 3 Prompt Generation     →  ~5 seconds
Flux Schnell Image Gen (×4)   →  ~20 seconds
User Selection                →  Instant
Hunyuan3D 3D Generation       →  ~55 seconds
  ├─ DiT Diffusion            →  ~34 seconds
  ├─ VAE Forward              →  <1 second
  └─ Volume Decode            →  ~20 seconds
3D Studio (Engraving)         →  Real-time
PrusaSlicer G-code Gen        →  ~10 seconds
Checkout                      →  Instant

Total (Input → Checkout):     ~90 seconds
```

---

## 💰 Cost Analysis

```
┌─────────────────────────────────────────────────────────────┐
│                    COST PER ORDER                           │
└─────────────────────────────────────────────────────────────┘

Compute Costs:
├─ Llama 3 (Cloudflare AI)        $0.001
├─ Flux Schnell ×4 (CF AI)        $0.004
├─ Hunyuan3D (Local GPU)          $0.000  (local dev)
│  └─ RunPod (future)             $0.170  (production)
└─ PrusaSlicer (Local Docker)     $0.000  (local dev)
   └─ CF Containers (future)      $0.001  (production)

Total Compute (dev):              $0.005
Total Compute (prod):             $0.176

Revenue per Order:
├─ Material (64g × $0.03)         $1.92
├─ Service Fee                    $12.00
└─ Shipping                       $9.00
                                  ──────
Total Revenue:                    $22.92

Gross Margin:                     $22.74  (99.2%)
```

---

## 🎯 Key Metrics

```
┌─────────────────────────────────────────────────────────────┐
│                    PROJECT METRICS                          │
└─────────────────────────────────────────────────────────────┘

Code:
├─ Frontend:        ~3,000 lines (JavaScript/JSX)
├─ Backend:         ~1,500 lines (JavaScript)
├─ AI Engine:       ~2,000 lines (Python)
├─ Slicer:          ~500 lines (Python)
└─ Tests:           ~2,500 lines (JavaScript/Python)
                    ─────────
Total:              ~9,500 lines

Documentation:
├─ Guides:          15 files
├─ Pages:           ~150 pages
├─ Examples:        50+ code samples
└─ Diagrams:        10+ visual aids

Testing:
├─ Unit Tests:      30+ tests
├─ Integration:     20+ tests
├─ E2E Tests:       10+ tests
├─ Coverage:        50%+ (target: 80%)
└─ Execution:       ~4 minutes
```

---

## 🚀 Deployment Status

```
┌─────────────────────────────────────────────────────────────┐
│                    ENVIRONMENTS                             │
└─────────────────────────────────────────────────────────────┘

Development (Local):
├─ Frontend:        localhost:5173        ✅ Running
├─ Worker:          Production URL        ✅ Deployed
├─ AI Engine:       localhost:8000        ✅ Running
├─ Slicer:          localhost:8001        ✅ Running
└─ Tunnels:         localtunnel           ✅ Active

Production (Planned):
├─ Frontend:        Cloudflare Pages      🔴 TODO
├─ Worker:          CF Workers            ✅ Deployed
├─ AI Engine:       RunPod Serverless     🔴 TODO
└─ Slicer:          CF Containers         🔴 TODO
```

---

## 📋 Quick Reference

### Essential Commands

```bash
# Development
npm run dev                 # Start frontend
npm run test:watch          # Watch tests

# Testing
npm test                    # All tests
npm run test:coverage       # Coverage report

# Backend
cd backend/ai_engine && uvicorn main:app --reload
cd backend/slicer && docker-compose up
```

### Essential URLs

```
Frontend:     http://localhost:5173
Worker:       https://3d-memoreez-orchestrator.walid-elleuch.workers.dev
AI Engine:    http://localhost:8000
Slicer:       http://localhost:8001
```

### Essential Files

```
Entry Points:
├─ src/main.jsx              Frontend entry
├─ backend/src/index.js      Worker entry
├─ backend/ai_engine/main.py AI engine entry
└─ backend/slicer/main.py    Slicer entry

Configuration:
├─ package.json              Dependencies
├─ vitest.config.js          Test config
├─ playwright.config.js      E2E config
└─ backend/wrangler.toml     Worker config
```

---

## 🎓 Learning Path

### For New Developers

1. Read [README.md](../README.md)
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md)
3. Run through [tests/QUICKSTART.md](../tests/QUICKSTART.md)
4. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
5. Start with [TODO.md](./TODO.md)

### For Contributors

1. Read [specification.md](./specification.md)
2. Review [TESTING.md](./TESTING.md)
3. Check [tests/NEW_FEATURE_CHECKLIST.md](../tests/NEW_FEATURE_CHECKLIST.md)
4. Review [tests/EXAMPLES.md](../tests/EXAMPLES.md)
5. Start contributing!

---

**Last Updated:** 2026-02-23
**Project Status:** 75% Complete, Production-Ready Core
