# 3Dmemoreez Test Suite

Comprehensive automated testing for the 3Dmemoreez platform.

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Watch mode (development)
npm run test:watch

# Coverage report
npm run test:coverage
```

## Documentation

- **[Quick Start Guide](./QUICKSTART.md)** - Get running in 5 minutes
- **[Testing Guide](../docs/TESTING.md)** - Comprehensive documentation
- **[Architecture Overview](../docs/TESTING_ARCHITECTURE.md)** - Visual diagrams
- **[Testing Flow](./TESTING_FLOW.md)** - Execution flow diagrams
- **[Examples](./EXAMPLES.md)** - Practical code examples
- **[New Feature Checklist](./NEW_FEATURE_CHECKLIST.md)** - Testing checklist

## Directory Structure

```
tests/
├── unit/                      # Fast, isolated tests
│   ├── components/            # React component tests
│   └── csgEngine.test.js      # Geometry engine tests
├── integration/               # API and database tests
│   ├── worker.test.js         # Cloudflare Worker tests
│   └── database.test.js       # D1 database tests
├── e2e/                       # End-to-end tests
│   └── full-journey.spec.js   # Complete user flows
├── fixtures/                  # Shared test data
│   ├── mockData.js            # Mock objects
│   └── mockServer.js          # MSW server setup
└── setup.js                   # Global test configuration
```

## Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests once |
| `npm run test:unit` | Unit tests only (fast) |
| `npm run test:integration` | Integration tests only |
| `npm run test:e2e` | End-to-end tests (slow) |
| `npm run test:watch` | Watch mode for development |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:ai` | AI engine Python tests |
| `npm run test:slicer` | Slicer Python tests |

## Test Types

### Unit Tests (5 seconds)
- Component rendering
- Function logic
- Utility functions
- CSG operations
- Isolated business logic

### Integration Tests (25 seconds)
- API endpoints
- Database operations
- R2 storage
- Service interactions
- Worker logic

### E2E Tests (3 minutes)
- Full user journeys
- Cross-browser testing
- Mobile responsiveness
- Real user interactions

## Writing Tests

### Unit Test Example

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Integration Test Example

```javascript
import { unstable_dev } from 'wrangler';

describe('API Endpoint', () => {
  let worker;

  beforeAll(async () => {
    worker = await unstable_dev('backend/src/index.js');
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('returns correct data', async () => {
    const response = await worker.fetch('/api/endpoint');
    expect(response.status).toBe(200);
  });
});
```

### E2E Test Example

```javascript
import { test, expect } from '@playwright/test';

test('user can complete flow', async ({ page }) => {
  await page.goto('/');
  await page.fill('input', 'Test');
  await page.click('button:has-text("Submit")');
  await expect(page.locator('.result')).toBeVisible();
});
```

## Coverage Goals

| Layer | Target | Current |
|-------|--------|---------|
| Frontend | 80% | ~40% |
| Backend | 80% | ~60% |
| E2E | 100% critical paths | ~30% |

## CI/CD

Tests run automatically on:
- Every pull request
- Every push to main
- Manual workflow dispatch

See `.github/workflows/test.yml` for configuration.

## Debugging

### Frontend Tests

```bash
# Watch mode with UI
npm run test:watch

# Debug specific test
npm run test:unit -- MyComponent.test.jsx
```

### E2E Tests

```bash
# Debug mode (headed browser)
npx playwright test --debug

# UI mode (interactive)
npx playwright test --ui

# Specific browser
npx playwright test --project=chromium
```

### Backend Tests

```bash
# Verbose output
cd backend/ai_engine
pytest -vv

# Specific test
pytest tests/test_preprocessing.py::TestClass::test_method

# With debugger
pytest --pdb
```

## Common Issues

### "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Playwright browser issues
```bash
npx playwright install --with-deps
```

### Worker tests timeout
```javascript
test('slow test', async () => {
  // ...
}, 60000); // Increase timeout
```

## Best Practices

1. ✅ Test behavior, not implementation
2. ✅ Use descriptive test names
3. ✅ Keep tests independent
4. ✅ Mock external dependencies
5. ✅ Clean up after tests
6. ✅ Use fixtures for shared data
7. ✅ Test edge cases
8. ✅ Write tests before fixing bugs

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/react)
- [pytest Documentation](https://docs.pytest.org/)
- [MSW Documentation](https://mswjs.io/)

## Contributing

When adding new features:
1. Read [New Feature Checklist](./NEW_FEATURE_CHECKLIST.md)
2. Write tests first (TDD)
3. Ensure coverage > 80%
4. Run full test suite before committing
5. Update documentation

## Support

For help:
1. Check [Testing Guide](../docs/TESTING.md)
2. Review [Examples](./EXAMPLES.md)
3. Check [Troubleshooting](../docs/TROUBLESHOOTING.md)
4. Review existing tests for patterns

## Metrics

Track these for quality:
- Test pass rate: 100%
- Coverage: 80%+
- Execution time: < 6 minutes
- Flaky tests: 0

---

**Happy Testing! 🧪**
