# Testing Examples - Practical Guide

Real-world examples for common testing scenarios in 3Dmemoreez.

## Table of Contents

1. [Testing React Components](#testing-react-components)
2. [Testing API Endpoints](#testing-api-endpoints)
3. [Testing Async Operations](#testing-async-operations)
4. [Testing 3D Geometry](#testing-3d-geometry)
5. [Testing Forms](#testing-forms)
6. [Testing Error Handling](#testing-error-handling)
7. [Testing with Mocks](#testing-with-mocks)
8. [E2E Testing](#e2e-testing)

---

## Testing React Components

### Basic Component Test

```javascript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Button from '@/components/Button';

describe('Button Component', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByText('Click'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Component with State

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Counter from '@/components/Counter';

describe('Counter Component', () => {
  it('increments count on button click', async () => {
    const user = userEvent.setup();
    render(<Counter />);
    
    const button = screen.getByRole('button', { name: /increment/i });
    const count = screen.getByText(/count: 0/i);
    
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/count: 1/i)).toBeInTheDocument();
    });
  });
});
```

### Component with Props

```javascript
describe('ConceptCard', () => {
  const mockConcept = {
    id: '1',
    title: 'Test Concept',
    image_url: 'https://example.com/image.png',
    type: 'Literal',
  };

  it('displays concept information', () => {
    render(<ConceptCard concept={mockConcept} />);
    
    expect(screen.getByText('Test Concept')).toBeInTheDocument();
    expect(screen.getByText('Literal')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', mockConcept.image_url);
  });

  it('calls onSelect when clicked', async () => {
    const handleSelect = vi.fn();
    const user = userEvent.setup();
    
    render(<ConceptCard concept={mockConcept} onSelect={handleSelect} />);
    await user.click(screen.getByRole('button'));
    
    expect(handleSelect).toHaveBeenCalledWith(mockConcept.id);
  });
});
```

---

## Testing API Endpoints

### GET Endpoint

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unstable_dev } from 'wrangler';

describe('GET /api/health', () => {
  let worker;

  beforeAll(async () => {
    worker = await unstable_dev('backend/src/index.js');
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('returns 200 with status ok', async () => {
    const response = await worker.fetch('/api/health');
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toEqual({ status: 'ok' });
  });

  it('includes CORS headers', async () => {
    const response = await worker.fetch('/api/health');
    
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
```

### POST Endpoint with Validation

```javascript
describe('POST /api/generate', () => {
  it('generates concepts from valid hobbies', async () => {
    const response = await worker.fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hobbies: ['Photography', 'Hiking', 'Cooking'],
      }),
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('session_id');
    expect(data.concepts).toHaveLength(4);
  }, 60000);

  it('rejects empty hobbies array', async () => {
    const response = await worker.fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hobbies: [] }),
    });

    expect(response.status).toBe(400);
  });

  it('rejects malformed JSON', async () => {
    const response = await worker.fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json',
    });

    expect(response.status).toBe(400);
  });
});
```

---

## Testing Async Operations

### Promises

```javascript
describe('Async Function', () => {
  it('resolves with correct data', async () => {
    const result = await fetchData();
    expect(result).toEqual({ data: 'test' });
  });

  it('rejects on error', async () => {
    await expect(fetchDataWithError()).rejects.toThrow('Error message');
  });
});
```

### Polling

```javascript
describe('Status Polling', () => {
  it('polls until status is completed', async () => {
    const { result } = renderHook(() => useStatusPolling('session-123'));

    // Initially loading
    expect(result.current.status).toBe('loading');

    // Wait for polling to complete
    await waitFor(
      () => {
        expect(result.current.status).toBe('completed');
      },
      { timeout: 10000 }
    );
  });
});
```

### Timeouts

```javascript
describe('Timeout Handling', () => {
  it('times out after 5 seconds', async () => {
    vi.useFakeTimers();

    const promise = functionWithTimeout();
    
    vi.advanceTimersByTime(5000);
    
    await expect(promise).rejects.toThrow('Timeout');
    
    vi.useRealTimers();
  });
});
```

---

## Testing 3D Geometry

### BufferGeometry

```javascript
import * as THREE from 'three';
import { createPedestal } from '@/lib/csgEngine';

describe('Pedestal Creation', () => {
  it('creates valid geometry', () => {
    const geometry = createPedestal(2, 1);
    
    expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(geometry.attributes.position).toBeDefined();
    expect(geometry.attributes.normal).toBeDefined();
  });

  it('has correct vertex count', () => {
    const geometry = createPedestal(2, 1);
    const vertexCount = geometry.attributes.position.count;
    
    expect(vertexCount).toBeGreaterThan(0);
    expect(vertexCount % 3).toBe(0); // Triangles
  });

  it('has correct dimensions', () => {
    const radius = 2;
    const height = 1;
    const geometry = createPedestal(radius, height);
    
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    
    expect(bbox.max.y - bbox.min.y).toBeCloseTo(height, 2);
  });
});
```

### CSG Operations

```javascript
describe('CSG Union', () => {
  it('merges two geometries', () => {
    const geo1 = new THREE.BoxGeometry(1, 1, 1);
    const geo2 = new THREE.BoxGeometry(1, 1, 1);
    
    const result = performUnion(geo1, geo2);
    
    expect(result).toBeInstanceOf(THREE.BufferGeometry);
    expect(result.attributes.position.count).toBeGreaterThan(0);
  });

  it('creates watertight mesh', () => {
    const result = performUnion(geo1, geo2);
    
    // Check for manifold geometry
    expect(isManifold(result)).toBe(true);
  });
});
```

---

## Testing Forms

### Form Validation

```javascript
describe('FactsInputForm Validation', () => {
  it('requires all three fields', async () => {
    const user = userEvent.setup();
    render(<FactsInputForm onSubmit={vi.fn()} />);
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();
    
    // Fill first field
    await user.type(screen.getAllByRole('textbox')[0], 'Photography');
    expect(submitButton).toBeDisabled();
    
    // Fill second field
    await user.type(screen.getAllByRole('textbox')[1], 'Hiking');
    expect(submitButton).toBeDisabled();
    
    // Fill third field
    await user.type(screen.getAllByRole('textbox')[2], 'Cooking');
    expect(submitButton).toBeEnabled();
  });

  it('trims whitespace from inputs', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();
    
    render(<FactsInputForm onSubmit={handleSubmit} />);
    
    await user.type(screen.getAllByRole('textbox')[0], '  Photography  ');
    await user.type(screen.getAllByRole('textbox')[1], '  Hiking  ');
    await user.type(screen.getAllByRole('textbox')[2], '  Cooking  ');
    
    await user.click(screen.getByRole('button', { name: /submit/i }));
    
    expect(handleSubmit).toHaveBeenCalledWith([
      'Photography',
      'Hiking',
      'Cooking',
    ]);
  });
});
```

### Form Submission

```javascript
describe('Form Submission', () => {
  it('shows loading state during submission', async () => {
    const slowSubmit = vi.fn(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    const user = userEvent.setup();
    
    render(<Form onSubmit={slowSubmit} />);
    
    await user.type(screen.getByRole('textbox'), 'Test');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it('displays error message on failure', async () => {
    const failingSubmit = vi.fn(() => 
      Promise.reject(new Error('Submission failed'))
    );
    const user = userEvent.setup();
    
    render(<Form onSubmit={failingSubmit} />);
    
    await user.type(screen.getByRole('textbox'), 'Test');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/submission failed/i)).toBeInTheDocument();
    });
  });
});
```

---

## Testing Error Handling

### Try-Catch Blocks

```javascript
describe('Error Handling', () => {
  it('catches and handles errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
    
    render(<ComponentWithError />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    
    consoleSpy.mockRestore();
  });

  it('displays error boundary fallback', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };
    
    render(
      <ErrorBoundary fallback={<div>Error occurred</div>}>
        <ThrowError />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Error occurred')).toBeInTheDocument();
  });
});
```

### Network Errors

```javascript
describe('Network Error Handling', () => {
  it('handles fetch errors gracefully', async () => {
    // Mock fetch to fail
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));
    
    render(<ComponentWithFetch />);
    
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('retries on failure', async () => {
    let callCount = 0;
    global.fetch = vi.fn(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.reject(new Error('Fail'));
      }
      return Promise.resolve({ ok: true, json: () => ({ data: 'success' }) });
    });
    
    const result = await fetchWithRetry();
    
    expect(callCount).toBe(3);
    expect(result).toEqual({ data: 'success' });
  });
});
```

---

## Testing with Mocks

### Mocking Functions

```javascript
import { vi } from 'vitest';

describe('Function Mocking', () => {
  it('mocks a function', () => {
    const mockFn = vi.fn();
    mockFn('arg1', 'arg2');
    
    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('mocks return value', () => {
    const mockFn = vi.fn().mockReturnValue('mocked');
    
    expect(mockFn()).toBe('mocked');
  });

  it('mocks implementation', () => {
    const mockFn = vi.fn((x) => x * 2);
    
    expect(mockFn(5)).toBe(10);
  });
});
```

### Mocking Modules

```javascript
vi.mock('@/lib/api', () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: 'mocked' })),
}));

describe('Component with API', () => {
  it('uses mocked API', async () => {
    render(<ComponentWithAPI />);
    
    await waitFor(() => {
      expect(screen.getByText('mocked')).toBeInTheDocument();
    });
  });
});
```

### Mocking API with MSW

```javascript
import { setupMockServer } from '@tests/fixtures/mockServer';

describe('API Integration', () => {
  setupMockServer();

  it('fetches data from mocked API', async () => {
    const response = await fetch('/api/data');
    const data = await response.json();
    
    expect(data).toEqual({ mocked: 'data' });
  });
});
```

---

## E2E Testing

### Basic Page Navigation

```javascript
import { test, expect } from '@playwright/test';

test('navigates through app', async ({ page }) => {
  await page.goto('/');
  
  // Check homepage
  await expect(page).toHaveTitle(/3Dmemoreez/i);
  
  // Fill form
  await page.fill('input[name="hobby1"]', 'Photography');
  await page.click('button:has-text("Submit")');
  
  // Check navigation
  await expect(page).toHaveURL(/\/concepts/);
});
```

### Form Interaction

```javascript
test('submits form and shows results', async ({ page }) => {
  await page.goto('/');
  
  // Fill all fields
  await page.fill('input[placeholder*="first"]', 'Photography');
  await page.fill('input[placeholder*="second"]', 'Hiking');
  await page.fill('input[placeholder*="third"]', 'Cooking');
  
  // Submit
  await page.click('button:has-text("Crystallize")');
  
  // Wait for results
  await expect(page.locator('[data-testid="concept-card"]')).toHaveCount(4, {
    timeout: 60000,
  });
});
```

### Visual Testing

```javascript
test('matches screenshot', async ({ page }) => {
  await page.goto('/');
  
  // Take screenshot
  await expect(page).toHaveScreenshot('homepage.png');
});
```

### Mobile Testing

```javascript
test.use({ viewport: { width: 375, height: 667 } });

test('works on mobile', async ({ page }) => {
  await page.goto('/');
  
  // Check mobile layout
  const menu = page.locator('[data-testid="mobile-menu"]');
  await expect(menu).toBeVisible();
});
```

---

## Best Practices

1. **Use data-testid for stable selectors**
   ```javascript
   <button data-testid="submit-button">Submit</button>
   screen.getByTestId('submit-button')
   ```

2. **Test user behavior, not implementation**
   ```javascript
   // Good
   await user.click(screen.getByRole('button', { name: /submit/i }));
   
   // Bad
   fireEvent.click(component.find('.submit-btn'));
   ```

3. **Use waitFor for async operations**
   ```javascript
   await waitFor(() => {
     expect(screen.getByText('Loaded')).toBeInTheDocument();
   });
   ```

4. **Clean up after tests**
   ```javascript
   afterEach(() => {
     vi.clearAllMocks();
     cleanup();
   });
   ```

5. **Use descriptive test names**
   ```javascript
   it('displays error message when API call fails', () => {
     // Test implementation
   });
   ```
