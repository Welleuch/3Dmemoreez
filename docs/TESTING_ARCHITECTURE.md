# Testing Architecture Overview

## Test Pyramid

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E ╲          ← Few, slow, high-value
                 ╱────────╲           (Full user journeys)
                ╱          ╲
               ╱Integration╲       ← Medium, API/DB/R2
              ╱──────────────╲        (Worker endpoints)
             ╱                ╲
            ╱      Unit        ╲    ← Many, fast, focused
           ╱────────────────────╲     (Components, functions)
```

## Test Coverage by Layer

### Frontend (React + Vite)

```
src/
├── components/
│   ├── FactsInputForm.jsx          ✅ Unit tested
│   ├── ConceptCardGrid.jsx         ⏳ TODO
│   ├── ThreeSceneViewer.jsx        ⏳ TODO
│   └── Checkout.jsx                ⏳ TODO
└── lib/
    └── csgEngine.js                ✅ Unit tested
```

### Backend (Cloudflare Worker)

```
backend/src/
└── index.js
    ├── GET  /api/health            ✅ Integration tested
    ├── POST /api/generate          ✅ Integration tested
    ├── POST /api/session/select    ✅ Integration tested
    ├── GET  /api/session/status    ✅ Integration tested
    ├── GET  /api/assets/:key       ✅ Integration tested
    ├── POST /api/slice             ⏳ TODO
    └── POST /api/webhook/runpod    ⏳ TODO
```

### AI Engine (Python + FastAPI)

```
backend/ai_engine/
├── main.py
│   ├── Background removal          ✅ Unit tested
│   ├── Image preprocessing         ✅ Unit tested
│   ├── Alpha thresholding          ✅ Unit tested
│   └── Canvas creation             ✅ Unit tested
└── hy3dgen/
    └── (Vendored library)          ⏳ TODO
```

### Slicer (Python + PrusaSlicer)

```
backend/slicer/
└── main.py
    ├── STL scaling                 ✅ Unit tested
    ├── G-code parsing              ✅ Unit tested
    ├── Material calculation        ✅ Unit tested
    └── Pricing logic               ✅ Unit tested
```

## Test Execution Flow

### Development Workflow

```
Developer writes code
        ↓
npm run test:watch  ← Auto-runs unit tests
        ↓
Tests pass locally
        ↓
git push
        ↓
GitHub Actions CI
        ↓
All tests pass → Merge
```

### CI/CD Pipeline

```
GitHub Push/PR
        ↓
    ┌───┴───┐
    ↓       ↓
Frontend  Backend
 Tests    Tests
    ↓       ↓
    └───┬───┘
        ↓
    E2E Tests
        ↓
   Coverage Report
        ↓
    Codecov Upload
```

## Test Types by Purpose

### 1. Unit Tests (Fast, Isolated)

**Purpose**: Test individual functions/components in isolation

**Examples**:
- Component renders correctly
- Function returns expected output
- Edge cases handled properly

**Tools**: Vitest, React Testing Library, pytest

**Run time**: < 1 second per test

### 2. Integration Tests (Medium, Connected)

**Purpose**: Test interactions between components/services

**Examples**:
- API endpoint returns correct data
- Database operations work
- R2 storage uploads/downloads

**Tools**: Miniflare, pytest, FastAPI TestClient

**Run time**: 1-10 seconds per test

### 3. E2E Tests (Slow, Complete)

**Purpose**: Test complete user journeys

**Examples**:
- User submits hobbies → sees concepts
- User selects concept → 3D model loads
- User finalizes → checkout page appears

**Tools**: Playwright

**Run time**: 30-120 seconds per test

## Mocking Strategy

### What to Mock

```
✅ Mock:
- External API calls (Cloudflare AI)
- File system operations
- Network requests
- Time-dependent functions
- Random number generation

❌ Don't Mock:
- Internal business logic
- Pure functions
- Simple utilities
- Database queries (use test DB)
```

### Mock Layers

```
E2E Tests:
  ├── Real browser
  ├── Real frontend
  ├── Mock backend API ← MSW
  └── Mock external services

Integration Tests:
  ├── Real Worker code
  ├── Mock D1/R2 ← Miniflare
  └── Mock AI services

Unit Tests:
  ├── Real component/function
  └── Mock everything else ← vi.mock()
```

## Coverage Goals

| Layer | Target | Current |
|-------|--------|---------|
| Frontend Components | 80% | ~40% |
| Frontend Utils | 90% | ~60% |
| Worker Endpoints | 100% | ~70% |
| AI Engine | 70% | ~50% |
| Slicer | 80% | ~60% |
| E2E Critical Paths | 100% | ~30% |

## Test Data Management

### Fixtures

```
tests/fixtures/
├── mockData.js          ← Shared mock objects
├── mockServer.js        ← MSW server setup
└── sampleFiles/         ← Test STL/images
    ├── test.stl
    ├── test.png
    └── test.gcode
```

### Test Database

```
Integration tests use:
- Miniflare's in-memory D1
- Ephemeral R2 storage
- Reset between tests
```

## Performance Benchmarks

| Test Suite | Target Time | Current |
|------------|-------------|---------|
| Unit (all) | < 10s | ~5s |
| Integration (all) | < 30s | ~25s |
| E2E (all) | < 5min | ~3min |
| Full suite | < 6min | ~4min |

## Continuous Improvement

### Weekly Tasks
- [ ] Review coverage reports
- [ ] Add tests for new features
- [ ] Refactor slow tests
- [ ] Update documentation

### Monthly Tasks
- [ ] Analyze flaky tests
- [ ] Update dependencies
- [ ] Review test patterns
- [ ] Performance optimization

## Key Metrics

Track these in CI:
- Test pass rate (target: 100%)
- Coverage percentage (target: 80%+)
- Test execution time (target: < 6min)
- Flaky test rate (target: < 1%)

## Resources

- [Full Testing Guide](./TESTING.md)
- [Quick Start](../tests/QUICKSTART.md)
- [CI Configuration](../.github/workflows/test.yml)
- [Troubleshooting](./TROUBLESHOOTING.md)
