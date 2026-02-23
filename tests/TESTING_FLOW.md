# Testing Flow Diagram

## Complete Test Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEVELOPER WORKFLOW                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Write New Code  │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ npm run test:watch│ ◄─── Auto-runs on save
                    └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │  Tests Pass  │    │  Tests Fail  │
            └──────────────┘    └──────────────┘
                    │                   │
                    │                   ▼
                    │           ┌──────────────┐
                    │           │   Fix Code   │
                    │           └──────────────┘
                    │                   │
                    └───────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   git commit     │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │    git push      │
                    └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CI/CD PIPELINE                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ GitHub Actions   │
                    │   Triggered      │
                    └──────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   Frontend   │  │   Backend    │  │     E2E      │
    │    Tests     │  │    Tests     │  │    Tests     │
    └──────────────┘  └──────────────┘  └──────────────┘
            │                 │                 │
            │                 │                 │
            ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ Unit Tests   │  │ AI Engine    │  │  Playwright  │
    │ (Vitest)     │  │  (pytest)    │  │   (3 browsers)│
    └──────────────┘  └──────────────┘  └──────────────┘
            │                 │                 │
            ▼                 ▼                 │
    ┌──────────────┐  ┌──────────────┐        │
    │ Integration  │  │   Slicer     │        │
    │   Tests      │  │  (pytest)    │        │
    │ (Miniflare)  │  └──────────────┘        │
    └──────────────┘          │                │
            │                 │                │
            └─────────────────┼────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  All Tests Pass? │
                    └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │     YES      │    │      NO      │
            └──────────────┘    └──────────────┘
                    │                   │
                    ▼                   ▼
        ┌──────────────────┐    ┌──────────────┐
        │ Generate Coverage│    │ Notify Team  │
        │     Report       │    │  (PR Comment)│
        └──────────────────┘    └──────────────┘
                    │                   │
                    ▼                   ▼
        ┌──────────────────┐    ┌──────────────┐
        │ Upload to Codecov│    │ Block Merge  │
        └──────────────────┘    └──────────────┘
                    │
                    ▼
        ┌──────────────────┐
        │  Ready to Merge  │
        └──────────────────┘
```

## Test Type Execution Order

```
┌─────────────────────────────────────────────────────────────────┐
│                    TEST EXECUTION LAYERS                        │
└─────────────────────────────────────────────────────────────────┘

Layer 1: UNIT TESTS (Fastest - Run First)
┌─────────────────────────────────────────────────────────────────┐
│  ✓ Component rendering                                          │
│  ✓ Function logic                                               │
│  ✓ Utility functions                                            │
│  ✓ CSG operations                                               │
│  ✓ Preprocessing logic                                          │
│  ✓ Pricing calculations                                         │
│                                                                  │
│  Time: ~5 seconds                                               │
│  Coverage: 80%+ target                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
Layer 2: INTEGRATION TESTS (Medium - Run Second)
┌─────────────────────────────────────────────────────────────────┐
│  ✓ API endpoints                                                │
│  ✓ Database operations                                          │
│  ✓ R2 storage                                                   │
│  ✓ Worker logic                                                 │
│  ✓ Service interactions                                         │
│                                                                  │
│  Time: ~25 seconds                                              │
│  Coverage: 100% of endpoints                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
Layer 3: E2E TESTS (Slowest - Run Last)
┌─────────────────────────────────────────────────────────────────┐
│  ✓ Full user journeys                                           │
│  ✓ Cross-browser testing                                        │
│  ✓ Mobile responsiveness                                        │
│  ✓ Real user interactions                                       │
│                                                                  │
│  Time: ~3 minutes                                               │
│  Coverage: Critical paths                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Test Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      TEST DATA SOURCES                          │
└─────────────────────────────────────────────────────────────────┘

tests/fixtures/mockData.js
        │
        ├──► Unit Tests ──────────► Isolated components
        │
        ├──► Integration Tests ───► API responses
        │
        └──► E2E Tests ───────────► Full scenarios


tests/fixtures/mockServer.js (MSW)
        │
        └──► Intercepts HTTP ─────► Returns mock data
                                    │
                                    ▼
                            Frontend tests run
                            without real backend
```

## Coverage Report Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    COVERAGE GENERATION                          │
└─────────────────────────────────────────────────────────────────┘

npm run test:coverage
        │
        ▼
┌──────────────────┐
│  Run all tests   │
│  with coverage   │
│   instrumentation│
└──────────────────┘
        │
        ▼
┌──────────────────┐
│  Collect data    │
│  - Lines covered │
│  - Branches      │
│  - Functions     │
└──────────────────┘
        │
        ▼
┌──────────────────┐
│ Generate reports │
│  - HTML          │
│  - JSON          │
│  - Text          │
└──────────────────┘
        │
        ├──► coverage/index.html ──► Open in browser
        │
        └──► coverage.json ────────► Upload to Codecov
```

## Parallel Test Execution

```
┌─────────────────────────────────────────────────────────────────┐
│              PARALLEL EXECUTION (CI/CD)                         │
└─────────────────────────────────────────────────────────────────┘

GitHub Actions Trigger
        │
        └──► Spawn 3 Jobs in Parallel
                │
    ┌───────────┼───────────┐
    │           │           │
    ▼           ▼           ▼
┌────────┐  ┌────────┐  ┌────────┐
│Frontend│  │Backend │  │  E2E   │
│  Job   │  │  Job   │  │  Job   │
└────────┘  └────────┘  └────────┘
    │           │           │
    │           ├──► AI Engine
    │           └──► Slicer
    │
    ├──► Unit Tests
    └──► Integration Tests
    │           │           │
    └───────────┴───────────┘
                │
                ▼
        All jobs complete
                │
                ▼
        Merge results
```

## Mock vs Real Services

```
┌─────────────────────────────────────────────────────────────────┐
│                  TESTING ENVIRONMENT                            │
└─────────────────────────────────────────────────────────────────┘

UNIT TESTS:
    Frontend ──► Mock API (MSW)
    Backend  ──► Mock D1/R2 (Miniflare)
    AI       ──► Mock Models
    Slicer   ──► Mock Files

INTEGRATION TESTS:
    Frontend ──► Mock API (MSW)
    Backend  ──► Real D1/R2 (Miniflare)
    AI       ──► Mock Models
    Slicer   ──► Real Files (temp)

E2E TESTS:
    Frontend ──► Real Browser
    Backend  ──► Mock API (MSW)
    AI       ──► Mock Models
    Slicer   ──► Mock Files

PRODUCTION:
    Frontend ──► Real API
    Backend  ──► Real D1/R2 (Cloudflare)
    AI       ──► Real Models (GPU)
    Slicer   ──► Real Files (Docker)
```

## Test Failure Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                   FAILURE RESOLUTION                            │
└─────────────────────────────────────────────────────────────────┘

Test Fails
    │
    ▼
Is it flaky? ──YES──► Run 3 times
    │                      │
    NO                     ▼
    │              All pass? ──YES──► Mark as flaky
    │                      │          (needs fixing)
    │                      NO
    │                      │
    └──────────────────────┘
                │
                ▼
        Real failure
                │
    ┌───────────┼───────────┐
    │           │           │
    ▼           ▼           ▼
Unit Test   Integration  E2E Test
Failure     Test Failure  Failure
    │           │           │
    ▼           ▼           ▼
Check       Check API     Check full
component   endpoint      user flow
logic       logic         integration
    │           │           │
    └───────────┴───────────┘
                │
                ▼
        Fix the code
                │
                ▼
        Re-run tests
                │
                ▼
        Tests pass ──► Commit
```

## Quick Reference

| Test Type | Tool | Speed | When to Run |
|-----------|------|-------|-------------|
| Unit | Vitest | Fast (5s) | Every save |
| Integration | Miniflare | Medium (25s) | Before commit |
| E2E | Playwright | Slow (3min) | Before push |
| All | npm test | Full (4min) | CI/CD |

## Commands Quick Reference

```bash
# Development
npm run test:watch          # Auto-run on changes

# Pre-commit
npm run test:unit           # Quick validation

# Pre-push
npm test                    # Full suite

# Coverage
npm run test:coverage       # Generate report
open coverage/index.html    # View report

# Debugging
npx playwright test --debug # E2E debug mode
npm run test:watch          # Unit test debug
```
