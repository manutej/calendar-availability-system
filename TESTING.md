# Testing Guide

Comprehensive guide to testing the Calendar Availability System.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Test Data Setup](#test-data-setup)
6. [Mocking Strategies](#mocking-strategies)
7. [Coverage Requirements](#coverage-requirements)
8. [CI/CD Integration](#cicd-integration)

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode (re-run on changes)
npm run test:watch

# Run specific test suite
npm test -- ConfidenceScorer.test.ts
```

---

## 📂 Test Structure

```
tests/
├── unit/                 # Unit tests (fast, isolated)
│   ├── ConfidenceScorer.test.ts
│   ├── ConversationStateManager.test.ts
│   ├── ResponseGenerator.test.ts
│   └── ...
├── integration/          # Integration tests (medium speed)
│   ├── EmailOrchestrator.integration.test.ts
│   ├── api.integration.test.ts
│   └── ...
└── e2e/                 # End-to-end tests (slow, full system)
    └── (to be added)
```

### Test Types

**Unit Tests** (tests/unit/)
- Test single function/class in isolation
- Fast (<1s per test)
- No external dependencies (database, APIs)
- Use mocks for all dependencies

**Integration Tests** (tests/integration/)
- Test multiple components working together
- Medium speed (1-5s per test)
- May use test database
- Mock only external APIs (Gmail, Calendar)

**E2E Tests** (tests/e2e/)
- Test complete user journeys
- Slow (5-30s per test)
- Use real database (test instance)
- May use real external services

---

## 🏃 Running Tests

### All Tests
```bash
npm test
```

### By Type
```bash
# Unit tests only (fast)
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e
```

### Specific File
```bash
# Run single test file
npm test -- ConfidenceScorer.test.ts

# Run tests matching pattern
npm test -- Confidence
```

### Watch Mode
```bash
# Re-run tests on file changes
npm run test:watch

# Watch specific test
npm run test:watch -- ConfidenceScorer
```

### Coverage Report
```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/lcov-report/index.html  # macOS
xdg-open coverage/lcov-report/index.html  # Linux
```

### Debug Tests
```bash
# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand ConfidenceScorer.test.ts

# VS Code: Use launch.json configuration (see CONTRIBUTING.md)
```

---

## ✍️ Writing Tests

### Unit Test Template

```typescript
// tests/unit/MyService.test.ts
import { MyService } from '../../src/services/MyService';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  afterEach(() => {
    // Cleanup if needed
  });

  describe('methodName', () => {
    it('should return expected result for valid input', () => {
      // Arrange
      const input = 'test';
      const expected = 'TEST';

      // Act
      const result = service.methodName(input);

      // Assert
      expect(result).toBe(expected);
    });

    it('should throw error for invalid input', () => {
      // Arrange
      const invalidInput = null;

      // Act & Assert
      expect(() => service.methodName(invalidInput)).toThrow('Invalid input');
    });

    it('should handle edge case', () => {
      // Test empty string, null, undefined, etc.
    });
  });
});
```

### Integration Test Template

```typescript
// tests/integration/MyWorkflow.integration.test.ts
import { EmailOrchestrator } from '../../src/services/EmailOrchestrator';
import { query } from '../../src/utils/database';

// Mock external dependencies
jest.mock('../../src/services/GmailMCPClient');
jest.mock('../../src/services/GoogleCalendarMCP');

describe('MyWorkflow Integration', () => {
  const testUserId = 'test-user-123';

  beforeEach(async () => {
    // Setup test data
    await query(
      'INSERT INTO users (id, email) VALUES ($1, $2)',
      [testUserId, 'test@example.com']
    );
  });

  afterEach(async () => {
    // Cleanup test data
    await query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  it('should complete workflow successfully', async () => {
    // Arrange
    const mockGmail = require('../../src/services/GmailMCPClient');
    mockGmail.GmailMCPClient.prototype.getMessage.mockResolvedValue({
      // Mock response
    });

    // Act
    const orchestrator = new EmailOrchestrator();
    const result = await orchestrator.processIncomingEmail('msg-1', testUserId);

    // Assert
    expect(result.action).toBe('auto_responded');
    expect(result.emailSent).toBe(true);
  });
});
```

### Test Naming Conventions

```typescript
// ✅ GOOD: Descriptive, explains behavior
it('should auto-respond when confidence is above threshold', () => {});
it('should escalate when sender is blacklisted', () => {});
it('should handle missing calendar permissions gracefully', () => {});

// ❌ BAD: Vague, doesn't explain what's being tested
it('should work', () => {});
it('test1', () => {});
it('returns true', () => {});
```

### AAA Pattern (Arrange-Act-Assert)

```typescript
it('should calculate confidence correctly', () => {
  // Arrange - Setup test data
  const classification = {
    isSchedulingRequest: true,
    confidence: 0.9,
    // ...
  };
  const senderHistory = {
    trustLevel: 'vip',
    // ...
  };

  // Act - Execute the code under test
  const result = confidenceScorer.assess({
    classification,
    senderHistory,
    // ...
  });

  // Assert - Verify the result
  expect(result.overallConfidence).toBeGreaterThan(0.85);
  expect(result.recommendation).toBe('auto_respond');
});
```

---

## 🗄️ Test Data Setup

### Database Test Data

```typescript
// Helper function for test data
async function createTestUser(userId: string) {
  await query(
    `INSERT INTO users (id, email, full_name) 
     VALUES ($1, $2, $3)`,
    [userId, `${userId}@example.com`, 'Test User']
  );
  
  await query(
    `INSERT INTO user_preferences (user_id, automation_enabled) 
     VALUES ($1, true)`,
    [userId]
  );
  
  return userId;
}

// Use in tests
beforeEach(async () => {
  await createTestUser('test-user-1');
});

afterEach(async () => {
  await query('DELETE FROM users WHERE id = $1', ['test-user-1']);
});
```

### Test Fixtures

```typescript
// tests/fixtures/emails.ts
export const TEST_EMAILS = {
  CLEAR_SCHEDULING_REQUEST: {
    subject: 'Meeting Request',
    from: 'sender@example.com',
    body: 'When are you available tomorrow at 2pm?',
    threadId: 'thread-123'
  },
  
  UNCLEAR_REQUEST: {
    subject: 'Quick question',
    from: 'unknown@example.com',
    body: 'Maybe we could meet sometime?',
    threadId: 'thread-456'
  },
  
  VIP_REQUEST: {
    subject: 'Urgent sync',
    from: 'vip@example.com',
    body: 'Can we sync today?',
    threadId: 'thread-vip'
  }
};

// Use in tests
import { TEST_EMAILS } from '../fixtures/emails';

it('should classify clear scheduling request', () => {
  const result = classifier.classify(TEST_EMAILS.CLEAR_SCHEDULING_REQUEST.body);
  expect(result.isSchedulingRequest).toBe(true);
});
```

---

## 🎭 Mocking Strategies

### Mocking External MCP Clients

```typescript
// Mock entire module
jest.mock('../../src/services/GmailMCPClient');

// Setup mock implementation
const mockGmailClient = require('../../src/services/GmailMCPClient');
mockGmailClient.GmailMCPClient.prototype.getMessage.mockResolvedValue({
  payload: {
    headers: [
      { name: 'Subject', value: 'Test' },
      { name: 'From', value: 'test@example.com' }
    ],
    body: {
      data: Buffer.from('Email body').toString('base64')
    }
  },
  threadId: 'thread-123'
});

// Verify mock was called
expect(mockGmailClient.GmailMCPClient.prototype.getMessage).toHaveBeenCalledWith('msg-123');
```

### Mocking Database Queries

```typescript
// For unit tests, mock the database module
jest.mock('../../src/utils/database');
import { query } from '../../src/utils/database';

// Setup mock
(query as jest.Mock).mockResolvedValue({
  rows: [{ id: '1', email: 'test@example.com' }],
  rowCount: 1
});

// Test
const result = await userService.getUser('1');
expect(result.email).toBe('test@example.com');
```

### Partial Mocking

```typescript
// Mock only specific methods
jest.mock('../../src/services/ConfidenceScorer', () => {
  const actual = jest.requireActual('../../src/services/ConfidenceScorer');
  return {
    ...actual,
    ConfidenceScorer: class MockConfidenceScorer extends actual.ConfidenceScorer {
      async assess() {
        return {
          overallConfidence: 0.95,
          recommendation: 'auto_respond'
        };
      }
    }
  };
});
```

### Spy on Methods

```typescript
// Spy on method without changing behavior
const spy = jest.spyOn(service, 'methodName');

service.methodName('test');

expect(spy).toHaveBeenCalledWith('test');
expect(spy).toHaveBeenCalledTimes(1);

spy.mockRestore(); // Restore original implementation
```

---

## 📊 Coverage Requirements

### Target Coverage

- **Critical paths**: 100% (EmailOrchestrator, ConfidenceScorer, AvailabilityService)
- **Business logic**: 80%+
- **Utilities**: 60%+
- **Overall**: 70%+

### Check Coverage

```bash
npm run test:coverage
```

Output:
```
----------------------|---------|----------|---------|---------|
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
All files             |   72.45 |    65.21 |   68.75 |   73.12 |
 services/            |   85.32 |    78.45 |   82.14 |   86.91 |
  ConfidenceScorer.ts |   95.24 |    89.47 |   93.75 |   96.15 |
  EmailOrchestrator.ts|   88.64 |    82.35 |   85.71 |   90.24 |
  ...                 |   ...   |    ...   |   ...   |   ...   |
----------------------|---------|----------|---------|---------|
```

### Coverage Thresholds

Configure in `jest.config.js`:
```javascript
module.exports = {
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    './src/services/EmailOrchestrator.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};
```

---

## 🔄 CI/CD Integration

### GitHub Actions (Future)

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm test
      - run: npm run test:coverage
```

### Pre-commit Hook (Future)

```bash
# .husky/pre-commit
#!/bin/sh
npm run lint
npm test
```

---

## 🐛 Debugging Failed Tests

### Common Issues

**1. Test Timeout**
```typescript
// Increase timeout for slow tests
it('should process email', async () => {
  // ...
}, 10000); // 10 second timeout
```

**2. Database Connection Errors**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify test database exists
psql -U calendar_user -d calendar_availability_test -c "SELECT 1"
```

**3. Mock Not Working**
```typescript
// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Or reset all mocks
afterEach(() => {
  jest.resetAllMocks();
});
```

**4. Async Issues**
```typescript
// ❌ BAD: Missing await
it('should work', () => {
  service.asyncMethod(); // Promise not awaited!
  expect(result).toBe(true);
});

// ✅ GOOD: Properly await async
it('should work', async () => {
  await service.asyncMethod();
  expect(result).toBe(true);
});
```

### Debugging Tools

```bash
# Run tests with verbose logging
npm test -- --verbose

# Run single test with debugging
node --inspect-brk node_modules/.bin/jest --runInBand MyTest.test.ts

# Show console.log in tests
npm test -- --silent=false
```

---

## ✅ Testing Checklist

Before committing:
- [ ] All tests passing (`npm test`)
- [ ] New code has tests
- [ ] Coverage meets thresholds (`npm run test:coverage`)
- [ ] No console.log statements left in tests
- [ ] Mocks properly cleaned up
- [ ] Test descriptions are clear

Before releasing:
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] E2E tests passing (if exists)
- [ ] Coverage >70%
- [ ] No flaky tests
- [ ] Performance tests passing

---

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing TypeScript](https://www.typescriptlang.org/docs/handbook/testing.html)
- [Test-Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [Unit Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

## 🆘 Getting Help

**Tests failing**: Check error message carefully, often indicates real bug  
**Mocks not working**: Use `jest.clearAllMocks()` and check import paths  
**Coverage too low**: Use `--coverage` to see which lines aren't covered  
**Slow tests**: Profile with `--logHeapUsage` and optimize

See also: [CONTRIBUTING.md](./CONTRIBUTING.md#testing-guidelines)

---

**Remember**: Tests are documentation. Write them clearly! 📝
