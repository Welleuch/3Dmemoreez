# 3Dmemoreez Documentation Index

> Complete guide to all project documentation

---

## 📖 Getting Started

Start here if you're new to the project:

1. **[README.md](../README.md)** - Project overview and quick start
2. **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** - Visual project guide
3. **[INDEX.md](./INDEX.md)** - This documentation index
4. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and data flow
5. **[specification.md](./specification.md)** - Product specification and tech stack

---

## 🏗️ Architecture & Design

### System Architecture
- **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** - Visual project guide
  - Project status dashboard
  - System architecture diagrams
  - Data flow visualization
  - Performance metrics
  - Cost analysis
  
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete system architecture
  - High-level data flow
  - Endpoint reference
  - Component map
  - Cloudflare resources
  - Local dev startup

### Technical Specifications
- **[specification.md](./specification.md)** - Product specification
  - Project vision
  - Technical stack
  - Full app pipeline
  - Implementation phases
  - Pricing model

### Feature Specifications
- **[ENGRAVING_SPEC.md](./ENGRAVING_SPEC.md)** - Engraving feature
  - Cylindrical vertex wrapping
  - 3D printing constraints
  - CSG operations
  - Typography

---

## 🤖 AI & Backend

### AI Engine
- **[ai_engine.md](./ai_engine.md)** - AI engine technical reference
  - Architecture (DiT + VAE)
  - 3-stage inference pipeline
  - Quality vs speed tradeoffs
  - Bug history
  - Preprocessing (rembg)
  - Performance benchmarks

### Backend Services
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Backend architecture
  - Cloudflare Worker endpoints
  - D1 database schema
  - R2 storage structure
  - AI engine integration
  - Slicer integration

---

## 🧪 Testing

### Testing Documentation
- **[TESTING.md](./TESTING.md)** - Comprehensive testing guide
  - Test structure
  - Running tests
  - Writing tests
  - CI/CD integration
  - Troubleshooting

- **[TESTING_ARCHITECTURE.md](./TESTING_ARCHITECTURE.md)** - Testing architecture
  - Test pyramid
  - Coverage by layer
  - Execution flow
  - Mocking strategy
  - Performance benchmarks

### Quick References
- **[tests/QUICKSTART.md](../tests/QUICKSTART.md)** - 5-minute testing guide
- **[tests/TESTING_FLOW.md](../tests/TESTING_FLOW.md)** - Execution flow diagrams
- **[tests/EXAMPLES.md](../tests/EXAMPLES.md)** - Practical code examples
- **[tests/NEW_FEATURE_CHECKLIST.md](../tests/NEW_FEATURE_CHECKLIST.md)** - Feature testing checklist
- **[TESTING_SUMMARY.md](../TESTING_SUMMARY.md)** - Testing implementation summary

---

## 🔧 Development

### Current State
- **[SESSION_STATE.md](./SESSION_STATE.md)** - Current session state
  - Current milestone
  - What works now
  - Known limitations
  - Key files
  - Next steps

### Roadmap
- **[TODO.md](./TODO.md)** - Development roadmap
  - Phase-by-phase tasks
  - Completed features
  - In-progress work
  - Future plans

### Troubleshooting
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and fixes
  - Error 1: "Failed to fetch"
  - Error 2: Box/wall artifact
  - Error 3: Logger NameError
  - Error 4: Localtunnel drops
  - Error 5: rembg not downloaded
  - Error 6: Engraving clipped
  - Error 7: CSG mismatch
  - Error 8: Slicer returns 0g
  - Error 9: Wrong dimensions
  - Startup checklist

---

## 📚 Reference

### API Documentation
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - API endpoints
  - Cloudflare Worker routes
  - Request/response formats
  - Query parameters
  - Error codes

### Database Schema
- **[specification.md](./specification.md)** - D1 schema
  - Sessions table
  - Assets table
  - Orders table (planned)

### Configuration
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Environment variables
  - Docker configuration
  - Model paths
  - API URLs

---

## 🎯 By Role

### For Developers
1. [README.md](../README.md) - Quick start
2. [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) - Visual guide
3. [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
4. [TESTING.md](./TESTING.md) - Testing guide
5. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
6. [TODO.md](./TODO.md) - What to work on

### For New Contributors
1. [README.md](../README.md) - Project overview
2. [specification.md](./specification.md) - Product vision
3. [tests/QUICKSTART.md](../tests/QUICKSTART.md) - Testing setup
4. [tests/NEW_FEATURE_CHECKLIST.md](../tests/NEW_FEATURE_CHECKLIST.md) - Feature checklist

### For DevOps
1. [ARCHITECTURE.md](./ARCHITECTURE.md) - Infrastructure
2. [.github/workflows/test.yml](../.github/workflows/test.yml) - CI/CD
3. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Deployment issues

### For QA/Testing
1. [TESTING.md](./TESTING.md) - Testing guide
2. [tests/EXAMPLES.md](../tests/EXAMPLES.md) - Test examples
3. [TESTING_ARCHITECTURE.md](./TESTING_ARCHITECTURE.md) - Test architecture

---

## 📊 By Topic

### Frontend
- [specification.md](./specification.md) - Frontend tech stack
- [ENGRAVING_SPEC.md](./ENGRAVING_SPEC.md) - 3D geometry
- [tests/unit/components/](../tests/unit/components/) - Component tests

### Backend
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Backend architecture
- [ai_engine.md](./ai_engine.md) - AI engine
- [tests/integration/](../tests/integration/) - API tests

### Testing
- [TESTING.md](./TESTING.md) - Main guide
- [TESTING_ARCHITECTURE.md](./TESTING_ARCHITECTURE.md) - Architecture
- [tests/](../tests/) - All tests

### Deployment
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Deployment architecture
- [specification.md](./specification.md) - Deployment decisions
- [TODO.md](./TODO.md) - Deployment roadmap

---

## 🔍 Quick Find

### Common Tasks

**Setting up development environment:**
→ [README.md](../README.md) → Quick Start

**Running tests:**
→ [tests/QUICKSTART.md](../tests/QUICKSTART.md)

**Understanding the architecture:**
→ [ARCHITECTURE.md](./ARCHITECTURE.md)

**Fixing a bug:**
→ [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

**Adding a new feature:**
→ [tests/NEW_FEATURE_CHECKLIST.md](../tests/NEW_FEATURE_CHECKLIST.md)

**Understanding AI pipeline:**
→ [ai_engine.md](./ai_engine.md)

**Writing tests:**
→ [tests/EXAMPLES.md](../tests/EXAMPLES.md)

**Checking project status:**
→ [SESSION_STATE.md](./SESSION_STATE.md)

---

## 📝 Document Status

| Document | Last Updated | Status |
|----------|--------------|--------|
| README.md | 2026-02-23 | ✅ Current |
| PROJECT_OVERVIEW.md | 2026-02-23 | ✅ Current |
| INDEX.md | 2026-02-27 | ✅ Current |
| ARCHITECTURE.md | 2026-02-27 | ✅ Current |
| specification.md | 2026-02-23 | ✅ Current |
| ai_engine.md | 2026-02-21 | ✅ Current |
| ENGRAVING_SPEC.md | 2026-02-21 | ✅ Current |
| SESSION_STATE.md | 2026-02-23 | ✅ Current |
| TODO.md | 2026-02-27 | ✅ Current |
| TROUBLESHOOTING.md | 2026-02-21 | ✅ Current |
| TESTING.md | 2026-02-23 | ✅ Current |
| TESTING_ARCHITECTURE.md | 2026-02-23 | ✅ Current |

---

## 🆘 Need Help?

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
2. Review [SESSION_STATE.md](./SESSION_STATE.md) for current status
3. Search this index for relevant documentation
4. Check test examples in [tests/EXAMPLES.md](../tests/EXAMPLES.md)

---

**Last updated:** 2026-02-27
