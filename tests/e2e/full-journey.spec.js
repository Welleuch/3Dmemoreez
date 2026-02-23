import { test, expect } from '@playwright/test';

test.describe('Full User Journey: Hobbies to Checkout', () => {
  test('should complete the entire flow from input to checkout', async ({ page }) => {
    // Step 1: Navigate to app
    await page.goto('/');
    await expect(page).toHaveTitle(/3Dmemoreez/i);

    // Step 2: Fill in hobbies
    await page.fill('input[placeholder*="first hobby"]', 'Photography');
    await page.fill('input[placeholder*="second hobby"]', 'Hiking');
    await page.fill('input[placeholder*="third hobby"]', 'Cooking');

    // Step 3: Submit and wait for concepts
    await page.click('button:has-text("Crystallize")');

    // Wait for concept cards to appear (AI generation may take time)
    await expect(page.locator('[data-testid="concept-card"]').first()).toBeVisible({
      timeout: 60000,
    });

    // Verify 4 concepts are displayed
    const conceptCards = page.locator('[data-testid="concept-card"]');
    await expect(conceptCards).toHaveCount(4);

    // Step 4: Select a concept
    await conceptCards.first().click();
    await page.click('button:has-text("Initiate Blueprint")');

    // Step 5: Wait for 3D model to load
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });

    // Wait for 3D generation to complete (polling happens in background)
    await expect(page.locator('[data-testid="3d-viewer-loaded"]')).toBeVisible({
      timeout: 120000, // 2 minutes for 3D generation
    });

    // Step 6: Add engraving text
    await page.fill('input[placeholder*="engraving"]', 'John Doe');
    await page.fill('input[placeholder*="date"]', '2026');

    // Wait for engraving to render
    await page.waitForTimeout(2000);

    // Step 7: Finalize and trigger slicing
    await page.click('button:has-text("Finalize Print")');

    // Wait for slicing to complete
    await expect(page.locator('[data-testid="checkout-page"]')).toBeVisible({
      timeout: 60000,
    });

    // Step 8: Verify checkout page shows pricing
    await expect(page.locator('text=/Material.*g/i')).toBeVisible();
    await expect(page.locator('text=/\\$\\d+\\.\\d{2}/i')).toBeVisible();

    // Verify price breakdown
    await expect(page.locator('text=/Material cost/i')).toBeVisible();
    await expect(page.locator('text=/Service fee/i')).toBeVisible();
    await expect(page.locator('text=/Shipping/i')).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    await page.goto('/');

    // Try to submit with empty fields
    const submitButton = page.locator('button:has-text("Crystallize")');
    await expect(submitButton).toBeDisabled();

    // Fill only one field
    await page.fill('input[placeholder*="first hobby"]', 'Photography');
    await expect(submitButton).toBeDisabled();

    // Fill all fields
    await page.fill('input[placeholder*="second hobby"]', 'Hiking');
    await page.fill('input[placeholder*="third hobby"]', 'Cooking');
    await expect(submitButton).toBeEnabled();
  });

  test('should allow navigation back to previous steps', async ({ page }) => {
    await page.goto('/');

    // Complete step 1
    await page.fill('input[placeholder*="first hobby"]', 'Photography');
    await page.fill('input[placeholder*="second hobby"]', 'Hiking');
    await page.fill('input[placeholder*="third hobby"]', 'Cooking');
    await page.click('button:has-text("Crystallize")');

    // Wait for concepts
    await expect(page.locator('[data-testid="concept-card"]').first()).toBeVisible({
      timeout: 60000,
    });

    // Check if back button exists and works
    const backButton = page.locator('button:has-text("Back")');
    if (await backButton.isVisible()) {
      await backButton.click();
      await expect(page.locator('input[placeholder*="first hobby"]')).toBeVisible();
    }
  });
});

test.describe('3D Viewer Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API to skip actual generation
    await page.route('**/api/generate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session_id: 'test-session-id',
          concepts: [
            {
              id: '1',
              title: 'Test Concept',
              image_url: '/test-image.png',
              type: 'Literal',
            },
          ],
        }),
      });
    });
  });

  test('should allow camera rotation with mouse', async ({ page }) => {
    await page.goto('/');

    // Navigate to 3D viewer (mocked)
    // This test would need the viewer to be accessible
    // Implementation depends on your routing structure
  });

  test('should update engraving in real-time', async ({ page }) => {
    // Test real-time engraving updates
    // Would need to check canvas rendering or DOM updates
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should be usable on mobile devices', async ({ page }) => {
    await page.goto('/');

    // Check that inputs are visible and usable
    await expect(page.locator('input[placeholder*="first hobby"]')).toBeVisible();

    // Fill form on mobile
    await page.fill('input[placeholder*="first hobby"]', 'Photography');
    await page.fill('input[placeholder*="second hobby"]', 'Hiking');
    await page.fill('input[placeholder*="third hobby"]', 'Cooking');

    // Submit button should be accessible
    const submitButton = page.locator('button:has-text("Crystallize")');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test('should handle touch gestures in 3D viewer', async ({ page }) => {
    // Test touch interactions with 3D canvas
    // Would need actual 3D viewer loaded
  });
});

test.describe('Performance', () => {
  test('should load initial page quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    // Page should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle large STL files efficiently', async ({ page }) => {
    // Test loading of large 3D models
    // Would need to mock or use actual large STL
  });
});
