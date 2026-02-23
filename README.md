# 3Dmemoreez

> Transform hobbies into 3D-printed gifts with AI

An end-to-end "Sentiment-to-Physical" platform that converts personal hobbies and interests into unique, 3D-printed figurines. From text input to physical product in minutes.

## ✨ Features

- 🤖 **AI-Powered Design**: Llama 3 + Flux Schnell generate unique concepts
- 🎨 **3D Generation**: Hunyuan3D-V2 converts images to printable 3D models
- ✏️ **Custom Engraving**: Real-time text engraving on pedestal
- 📐 **Precision Slicing**: PrusaSlicer integration for accurate pricing
- 💰 **Dynamic Pricing**: Real-time cost calculation based on material usage
- 🧪 **Comprehensive Testing**: 80%+ test coverage with CI/CD

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Python 3.10+
- Docker & Docker Compose
- CUDA-capable GPU (for AI engine)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/3dmemoreez.git
cd 3dmemoreez

# Install frontend dependencies
npm install

# Install AI engine dependencies
cd backend/ai_engine
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
cd ../..

# Install test dependencies
npm install
npx playwright install
```

### Development

```bash
# Terminal 1: AI Engine
cd backend/ai_engine
.\venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Localtunnel (AI)
npx localtunnel --port 8000 --subdomain 3dmemoreez-ai

# Terminal 3: Slicer
cd backend/slicer
docker-compose up

# Terminal 4: Localtunnel (Slicer)
npx localtunnel --port 8001 --subdomain 3dmemoreez-slicer

# Terminal 5: Frontend
npm run dev
```

Open http://localhost:5173

### Testing

```bash
# Run all tests
npm test

# Watch mode (development)
npm run test:watch

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## 📚 Documentation

- **[Architecture](./docs/ARCHITECTURE.md)** - System architecture and data flow
- **[Specification](./docs/specification.md)** - Product specification and tech stack
- **[Testing Guide](./docs/TESTING.md)** - Comprehensive testing documentation
- **[Testing Quick Start](./tests/QUICKSTART.md)** - Get testing in 5 minutes
- **[AI Engine](./docs/ai_engine.md)** - AI pipeline technical reference
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and fixes
- **[TODO](./docs/TODO.md)** - Development roadmap

## 🏗️ Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│    Cloudflare Worker (Orchestrator) │
│  • Llama 3 (prompt generation)      │
│  • Flux Schnell (image generation)  │
│  • D1 Database (sessions/assets)    │
│  • R2 Storage (images/STL/G-code)   │
└──────┬──────────────────────────────┘
       │
       ├──► AI Engine (Local/Docker)
       │    • Hunyuan3D-V2 (3D generation)
       │    • rembg (background removal)
       │    • RTX 5060 GPU
       │
       └──► Slicer (Local/Docker)
            • PrusaSlicer CLI
            • G-code generation
            • Material calculation
```

## 🧪 Testing

Comprehensive test coverage across all layers:

- **Unit Tests**: Components, functions, geometry, preprocessing
- **Integration Tests**: API endpoints, database, storage
- **E2E Tests**: Full user journeys, cross-browser

```bash
# Quick test commands
npm test                 # All tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e        # End-to-end tests
npm run test:coverage   # Coverage report
```

See [Testing Guide](./docs/TESTING.md) for details.

## 🛠️ Tech Stack

### Frontend
- React 19 + Vite
- React Three Fiber (3D rendering)
- three-bvh-csg (geometry operations)
- Tailwind CSS
- Framer Motion

### Backend
- Cloudflare Workers (orchestration)
- Cloudflare D1 (database)
- Cloudflare R2 (storage)
- FastAPI (AI engine)
- Docker (containerization)

### AI/ML
- Llama 3 (prompt generation)
- Flux Schnell (image generation)
- Hunyuan3D-V2 (3D generation)
- rembg (background removal)

### Testing
- Vitest (unit/integration)
- Playwright (E2E)
- pytest (Python backend)
- MSW (API mocking)
- GitHub Actions (CI/CD)

## 📊 Project Status

| Phase | Status |
|-------|--------|
| Frontend UI | ✅ Complete |
| AI Pipeline | ✅ Complete |
| 3D Generation | ✅ Complete |
| Engraving | ✅ Complete |
| Slicing | ✅ Complete |
| Testing | ✅ Complete |
| Payment | 🔴 TODO |
| Email | 🔴 TODO |
| Admin Dashboard | 🔴 TODO |

## 🤝 Contributing

1. Read the [Testing Guide](./docs/TESTING.md)
2. Check [New Feature Checklist](./tests/NEW_FEATURE_CHECKLIST.md)
3. Write tests first (TDD)
4. Ensure coverage > 80%
5. Run full test suite before committing

## 📝 License

[Your License Here]

## 🙏 Acknowledgments

- [Hunyuan3D](https://github.com/Tencent/Hunyuan3D-2) - 3D generation model
- [three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg) - CSG operations
- [rembg](https://github.com/danielgatis/rembg) - Background removal
- [PrusaSlicer](https://github.com/prusa3d/PrusaSlicer) - Slicing engine

## 📧 Contact

[Your Contact Information]

---

**Built with ❤️ for makers and creators**
