# New Feature Testing Checklist

Use this checklist when adding new features to ensure comprehensive test coverage.

## Before Writing Code

- [ ] Review existing tests for similar features
- [ ] Identify testable units and integration points
- [ ] Plan test data and fixtures needed
- [ ] Consider edge cases and error scenarios

## Unit Tests

### Frontend Components

- [ ] Component renders without crashing
- [ ] Props are handled correctly
- [ ] Default props work as expected
- [ ] User interactions trigger correct callbacks
- [ ] Loading states display properly
- [ ] Error states display properly
- [ ] Accessibility attributes present
- [ ] Responsive behavior works

### Frontend Utilities

- [ ] Function returns expected output for valid input
- [ ] Function handles invalid input gracefully
- [ ] Edge cases covered (null, undefined, empty, etc.)
- [ ] Error handling works correctly
- [ ] Pure functions have no side effects

### Backend Functions

- [ ] Function logic is correct
- [ ] Input validation works
- [ ] Error handling is comprehensive
- [ ] Return values match expected types
- [ ] Side effects are tested

## Integration Tests

### API Endpoints

- [ ] Endpoint returns correct status codes
- [ ] Response body matches expected schema
- [ ] Request validation works
- [ ] Authentication/authorization works (if applicable)
- [ ] CORS headers are present
- [ ] Error responses are formatted correctly
- [ ] Rate limiting works (if applicable)

### Database Operations

- [ ] Records are created correctly
- [ ] Records are updated correctly
- [ ] Records are deleted correctly
- [ ] Queries return expected results
- [ ] Transactions work correctly
- [ ] Foreign key constraints are respected

### Storage Operations

- [ ] Files are uploaded correctly
- [ ] Files are downloaded correctly
- [ ] File metadata is correct
- [ ] Large files are handled
- [ ] Error cases are handled

## E2E Tests

### User Journeys

- [ ] Happy path works end-to-end
- [ ] User can navigate between steps
- [ ] Form validation works
- [ ] Loading states are visible
- [ ] Success messages appear
- [ ] Error messages appear when appropriate
- [ ] User can recover from errors

### Cross-Browser

- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari (if applicable)
- [ ] Works on mobile devices

## Performance Tests

- [ ] Page loads in < 3 seconds
- [ ] API responses in < 1 second
- [ ] Large data sets handled efficiently
- [ ] Memory leaks checked
- [ ] No unnecessary re-renders

## Security Tests

- [ ] Input sanitization works
- [ ] SQL injection prevented
- [ ] XSS attacks prevented
- [ ] CSRF protection in place (if applicable)
- [ ] Sensitive data not logged
- [ ] Authentication required where needed

## Accessibility Tests

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast sufficient
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Form labels associated correctly

## Documentation

- [ ] Test files have descriptive names
- [ ] Test cases have clear descriptions
- [ ] Complex logic has comments
- [ ] README updated if needed
- [ ] API documentation updated

## Code Quality

- [ ] Tests follow existing patterns
- [ ] No duplicate test code
- [ ] Fixtures used for shared data
- [ ] Mocks used appropriately
- [ ] Tests are deterministic (no flakiness)
- [ ] Tests run in isolation

## Coverage

- [ ] New code has > 80% coverage
- [ ] Critical paths have 100% coverage
- [ ] Edge cases are covered
- [ ] Error paths are covered

## CI/CD

- [ ] Tests pass locally
- [ ] Tests pass in CI
- [ ] No new flaky tests introduced
- [ ] Test execution time acceptable

## Before Merging

- [ ] All tests pass
- [ ] Coverage meets threshold
- [ ] No console errors/warnings
- [ ] Code reviewed
- [ ] Documentation updated

## Example Test Template

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Feature Name', () => {
  // Setup
  beforeEach(() => {
    // Initialize test environment
  });

  // Teardown
  afterEach(() => {
    // Clean up
  });

  describe('Happy Path', () => {
    it('should work with valid input', () => {
      // Arrange
      const input = 'valid';
      
      // Act
      const result = myFunction(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null input', () => {
      expect(() => myFunction(null)).toThrow();
    });

    it('should handle empty input', () => {
      expect(myFunction('')).toBe('default');
    });
  });

  describe('Error Handling', () => {
    it('should throw on invalid input', () => {
      expect(() => myFunction('invalid')).toThrow('Error message');
    });
  });
});
```

## Common Pitfalls to Avoid

❌ **Don't**:
- Test implementation details
- Write tests that depend on other tests
- Use real external services
- Hardcode dates/times
- Ignore flaky tests
- Skip error cases
- Test third-party libraries

✅ **Do**:
- Test behavior, not implementation
- Make tests independent
- Mock external dependencies
- Use relative dates/times
- Fix flaky tests immediately
- Test all code paths
- Focus on your code

## Resources

- [Testing Guide](../docs/TESTING.md)
- [Test Examples](./unit/)
- [Mock Data](./fixtures/mockData.js)
- [CI Configuration](../.github/workflows/test.yml)
