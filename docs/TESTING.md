# 3Dmemoreez Testing Guide

> Comprehensive testing documentation for developers

---

## Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [CI/CD Integration](#cicd-integration)
6. [Troubleshooting](#troubleshooting)

---

## Overview

The 3Dmemoreez testing strategy covers three levels:

- **Unit Tests**: Isolated component/function testing
- **Integration Tests**: API endpoints, database, storage
- **E2E Tests**: Full user journeys with Playwright

### Coverage Goals

- Unit tests: 80%+ for business logic
- Integration tests: 100% of API endpoints
- E2E tests: All critical user paths

---

## Test Structure

```
tests/
├── unit/                      # Unit tests
│   ├── components/            # React component tests
│   │   └── FactsInputForm.test.jsx
│   └── csgEngine.test.js      # CSG geometry tests
├── integration/               # Integration tests
│   ├── worker.test.js         # Cloudflare Worker API tests
│   └── database.test.js       # D1 database tests
├── e2e/                       # End-to-end tests
│   └── full-journey.spec.js   # Complete user flows
├── fixtures/                  # Shared test data
│   ├── mockData.js            # Mock data objects
│   └── mockServer.js          # MSW mock server
└── setup.js                   # Global test setup

backend/
├── ai_engine/tests/           # AI engine Python tests
│   └── test_preprocessing.py
└── slicer/tests/              # Slicer Python tests
    └── test_slicer.py
```

---

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers (for E2E)
npx playwright install
```

### Frontend Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode (development)
npm run test:watch

# Coverage report
npm run test:coverage

# Open coverage report in browser
open coverage/index.html
```

### Backend Tests

```bash
# AI Engine tests
cd backend/ai_engine
pytest

# With coverage
pytest --cov=. --cov-report=html

# Slicer tests
cd backend/slicer
pytest

# Skip slow tests
pytest -m "not slow"

# Skip GPU tests (if no GPU available)
pytest -m "not gpu"
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific browser
npx playwright test --project=chromium

# Debug mode (headed browser)
npx playwright test --debug

# UI mode (interactive)
npx playwright test --ui

# Generate report
npx playwright show-report
```

---

## Writing Tests

### Unit Tests (Frontend)

Use Vitest + React Testing Library:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    const mockFn = vi.fn();
    
    render(<MyComponent onClick={mockFn} />);
    await user.click(screen.getByRole('button'));
    
    expect(mockFn).toHaveBeenCalled();
  });
});
```

### Integration Tests (Worker)

Use Miniflare to test Cloudflare Workers:

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unstable_dev } from 'wrangler';

describe('API Integration', () => {
  let worker;

  beforeAll(async () => {
    worker = await unstable_dev('backend/src/index.js', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('should handle POST request', async () => {
    const resp = await worker.fetch('/api/endpoint', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
    });

    expect(resp.status).toBe(200);
  });
});
```

### E2E Tests (Playwright)

```javascript
import { test, expect } from '@playwright/test';

test('user can complete checkout', async ({ page }) => {
  await page.goto('/');
  
  // Fill form
  await page.fill('input[name="hobby1"]', 'Photography');
  await page.click('button:has-text("Submit")');
  
  // Wait for result
  await expect(page.locator('.result')).toBeVisible({ timeout: 60000 });
});
```

### Backend Tests (Python)

```python
import pytest

class TestPreprocessing:
    def test_image_scaling(self):
        """Test image is scaled correctly"""
        # Arrange
        input_size = (1024, 1024)
        target_size = (512, 512)
        
        # Act
        result = scale_image(input_size, target_size)
        
        # Assert
        assert result == target_size

    @pytest.mark.integration
    def test_full_pipeline(self):
        """Integration test for full preprocessing"""
        # Test complete pipeline
        pass
```

---

## Test Patterns

### Mocking API Calls

Use MSW (Mock Service Worker):

```javascript
import { setupMockServer } from '@tests/fixtures/mockServer';

describe('Component with API', () => {
  setupMockServer();

  it('should fetch data', async () => {
    // Mock server automatically intercepts requests
    render(<MyComponent />);
    await waitFor(() => {
      expect(screen.getByText('Data loaded')).toBeInTheDocument();
    });
  });
});
```

### Testing Async Operations

```javascript
it('should handle async operation', async () => {
  const promise = asyncFunction();
  
  await waitFor(() => {
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });
  
  await expect(promise).resolves.toBe('success');
});
```

### Testing 3D Components

```javascript
import * as THREE from 'three';

it('should create valid geometry', () => {
  const geometry = createPedestal(2, 1);
  
  expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
  expect(geometry.attributes.position).toBeDefined();
  
  // Verify vertex count
  const vertexCount = geometry.attributes.position.count;
  expect(vertexCount).toBeGreaterThan(0);
});
```

---

## CI/CD Integration

Tests run automatically on GitHub Actions:

### On Pull Request
- Unit tests (all)
- Integration tests (all)
- Lint checks

### On Main Branch
- All tests including E2E
- Coverage reports uploaded to Codecov

### Manual Triggers
- Full test suite
- Specific test categories

### Configuration

See `.github/workflows/test.yml` for CI configuration.

---

## Coverage Reports

### Viewing Coverage

```bash
# Generate coverage
npm run test:coverage

# Open HTML report
open coverage/index.html

# Backend coverage
cd backend/ai_engine
pytest --cov=. --cov-report=html
open htmlcov/index.html
```

### Coverage Thresholds

Configured in `vitest.config.js`:

```javascript
coverage: {
  lines: 80,
  functions: 80,
  branches: 75,
  statements: 80,
}
```

---

## Troubleshooting

### Common Issues

#### "Module not found" errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Playwright browser issues

```bash
# Reinstall browsers
npx playwright install --with-deps
```

#### Worker tests timeout

```bash
# Increase timeout in test
test('slow test', async () => {
  // ...
}, 60000); // 60 second timeout
```

#### Python import errors

```bash
# Ensure correct Python path
cd backend/ai_engine
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
pytest
```

### Debug Mode

```bash
# Frontend tests with UI
npm run test:watch

# E2E tests with browser visible
npx playwright test --debug

# Python tests with verbose output
pytest -vv
```

---

## Best Practices

1. **Test Naming**: Use descriptive names that explain what is being tested
2. **Arrange-Act-Assert**: Structure tests clearly
3. **One Assertion Per Test**: Keep tests focused
4. **Mock External Dependencies**: Don't rely on external services
5. **Clean Up**: Always clean up resources in afterEach/afterAll
6. **Avoid Test Interdependence**: Each test should run independently
7. **Use Fixtures**: Share common test data via fixtures
8. **Test Edge Cases**: Don't just test happy paths

---

## Performance Testing

### Load Testing

For load testing the Worker:

```bash
# Install k6
brew install k6  # macOS
# or download from https://k6.io

# Run load test
k6 run tests/performance/load-test.js
```

### Benchmarking

```javascript
import { bench, describe } from 'vitest';

describe('Performance', () => {
  bench('expensive operation', () => {
    // Code to benchmark
  });
});
```

---

## Continuous Improvement

- Review test coverage weekly
- Add tests for new features before implementation (TDD)
- Update tests when bugs are found
- Refactor tests to reduce duplication
- Keep test execution time under 5 minutes for unit/integration

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/react)
- [pytest Documentation](https://docs.pytest.org/)
- [MSW Documentation](https://mswjs.io/)
