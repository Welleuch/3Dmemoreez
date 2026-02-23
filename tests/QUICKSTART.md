# Testing Quick Start Guide

Get up and running with tests in 5 minutes.

## 1. Install Dependencies

```bash
# Install all dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install
```

## 2. Run Your First Test

```bash
# Run all tests
npm test

# Run just unit tests (fastest)
npm run test:unit
```

## 3. Watch Tests During Development

```bash
# Auto-run tests on file changes
npm run test:watch
```

## 4. Check Coverage

```bash
# Generate coverage report
npm run test:coverage

# Open in browser
open coverage/index.html
```

## 5. Run E2E Tests

```bash
# Full E2E suite
npm run test:e2e

# Interactive UI mode
npx playwright test --ui
```

## 6. Backend Tests

```bash
# AI Engine tests
cd backend/ai_engine
pytest

# Slicer tests
cd backend/slicer
pytest
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests once |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Integration tests only |
| `npm run test:e2e` | End-to-end tests |
| `npm run test:watch` | Watch mode for development |
| `npm run test:coverage` | Generate coverage report |

## Test File Locations

- **Unit tests**: `tests/unit/**/*.test.{js,jsx}`
- **Integration tests**: `tests/integration/**/*.test.js`
- **E2E tests**: `tests/e2e/**/*.spec.js`
- **Backend tests**: `backend/*/tests/test_*.py`

## Writing Your First Test

Create a new file `tests/unit/mytest.test.js`:

```javascript
import { describe, it, expect } from 'vitest';

describe('My Feature', () => {
  it('should work correctly', () => {
    const result = 2 + 2;
    expect(result).toBe(4);
  });
});
```

Run it:

```bash
npm run test:unit
```

## Need Help?

- See `docs/TESTING.md` for comprehensive documentation
- Check `tests/unit/` for example tests
- Run `npx playwright test --help` for E2E options

## CI/CD

Tests run automatically on:
- Every pull request
- Every push to main branch
- Manual workflow dispatch

See `.github/workflows/test.yml` for configuration.
