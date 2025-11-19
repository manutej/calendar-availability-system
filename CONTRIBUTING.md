# Contributing to Calendar Availability System

Welcome! This guide will help you get started with development.

---

## 📋 Table of Contents

1. [Development Setup](#development-setup)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Code Standards](#code-standards)
5. [Testing Guidelines](#testing-guidelines)
6. [Git Workflow](#git-workflow)
7. [Debugging](#debugging)
8. [Common Tasks](#common-tasks)

---

## 🚀 Development Setup

### First-Time Setup

```bash
# 1. Clone and install
git clone <repository-url>
cd calendar-availability-system
npm install

# 2. Run automated setup (handles database, MCP servers, .env)
./scripts/setup.sh

# 3. Edit .env with your Google OAuth credentials
cp .env.example .env
nano .env  # Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

# 4. Verify setup
npm run build
npm test
npm run dev
```

See [SETUP.md](./SETUP.md) for detailed instructions.

---

## 📂 Project Structure

```
src/
├── services/           # Business logic (autonomous services)
│   ├── EmailOrchestrator.ts      # Main controller (orchestrates workflow)
│   ├── ConfidenceScorer.ts       # Multi-factor confidence scoring
│   ├── NLPIntentClassifier.ts    # Email intent detection
│   ├── AvailabilityService.ts    # Calendar availability logic
│   ├── ConversationStateManager.ts  # Multi-turn tracking
│   ├── AutomationAuditLogger.ts  # Audit trail
│   ├── ResponseGenerator.ts      # Email composition
│   ├── UserPreferencesManager.ts # Settings CRUD
│   ├── CircuitBreaker.ts         # Safety mechanism
│   ├── GmailMCPClient.ts         # Gmail MCP wrapper
│   └── GoogleCalendarMCP.ts      # Calendar MCP wrapper
├── routes/             # REST API endpoints
│   └── automation.ts   # Automation API (13 endpoints)
├── types/              # TypeScript definitions
│   └── index.ts        # All interfaces/types
├── utils/              # Utility functions
│   ├── database.ts     # PostgreSQL client
│   └── logger.ts       # Winston logger
└── server.ts           # Express app entry point

tests/
├── unit/               # Unit tests (17 tests)
│   ├── ConfidenceScorer.test.ts
│   ├── ConversationStateManager.test.ts
│   └── ResponseGenerator.test.ts
└── integration/        # Integration tests (NEW)
    ├── EmailOrchestrator.integration.test.ts
    └── api.integration.test.ts

.specify/               # Specifications (source of truth)
├── constitution.md     # 10 architectural principles
├── spec.md             # Complete technical spec
├── mcp-integration-spec.md  # MCP implementation guide
└── scripts/init-schema.sql  # Database schema
```

---

## 🔄 Development Workflow

### Daily Workflow

```bash
# 1. Pull latest changes
git pull origin main

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Start development server (watch mode)
npm run dev

# 4. Make changes, server auto-reloads

# 5. Run tests frequently
npm run test:watch

# 6. Commit when tests pass
git add .
git commit -m "feat: Add feature description"

# 7. Push and create PR
git push origin feature/your-feature-name
```

### Hot Reload Development

```bash
# Terminal 1: Server (auto-restarts on changes)
npm run dev

# Terminal 2: Tests (re-run on changes)
npm run test:watch

# Terminal 3: Database console (for debugging)
psql -U calendar_user -d calendar_availability
```

---

## 📏 Code Standards

### TypeScript Style

```typescript
// ✅ GOOD: Descriptive names, explicit types, clear logic
async function assessSchedulingConfidence(
  classification: EmailClassification,
  senderHistory: SenderHistory
): Promise<ConfidenceAssessment> {
  const intentScore = calculateIntentScore(classification);
  const trustScore = calculateTrustScore(senderHistory);
  
  return {
    overallConfidence: intentScore * 0.6 + trustScore * 0.4,
    recommendation: intentScore >= 0.85 ? 'auto_respond' : 'request_approval'
  };
}

// ❌ BAD: Unclear names, implicit types, complex logic
async function assess(c: any, s: any) {
  return { conf: c.score * 0.6 + s.score * 0.4 };
}
```

### Architectural Principles

Follow the [Constitutional Framework](./.specify/constitution.md):

1. **Article I: Library-First Principle** - Create reusable services, not monoliths
2. **Article III: Test-First Imperative** - Write tests before/during implementation
3. **Article VII: Documentation-As-Code** - Update specs in `.specify/` when changing architecture
4. **Article X: Autonomous Operation with Accountability** - Always log autonomous actions

### Pragmatic Programmer Principles

- **KISS** (Keep It Simple, Stupid) - Simplest solution that works
- **YAGNI** (You Aren't Gonna Need It) - Don't build for future maybes
- **DRY** (Don't Repeat Yourself) - Extract common logic

Example:
```typescript
// ✅ GOOD: Simple, does what's needed now
private extractEmail(text: string): string | null {
  const match = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  return match ? match[0] : null;
}

// ❌ BAD: Over-engineered for future "what-ifs"
private extractEmail(text: string, options?: {
  allowSubdomains?: boolean;
  validateDNS?: boolean;
  internationalSupport?: boolean;
}) {
  // 200 lines of complex parsing logic we don't need yet
}
```

---

## 🧪 Testing Guidelines

### Test Pyramid

```
         /\
        /E2E\          Few (slow, expensive)
       /------\
      /  INT   \       Some (medium speed)
     /----------\
    /    UNIT    \     Many (fast, cheap)
   /--------------\
```

### Unit Tests (Fast, Isolated)

```typescript
// Test single function/method in isolation
describe('ConfidenceScorer', () => {
  it('should score VIP sender at 1.0 confidence', () => {
    const scorer = new ConfidenceScorer();
    const score = scorer.assessSenderTrust('vip@example.com', vipWhitelist);
    expect(score).toBe(1.0);
  });
});
```

**When to write**: For pure functions, business logic, calculations

### Integration Tests (Medium, Multiple Components)

```typescript
// Test multiple services working together
describe('EmailOrchestrator Integration', () => {
  it('should process email end-to-end', async () => {
    const orchestrator = new EmailOrchestrator();
    const result = await orchestrator.processIncomingEmail(messageId, userId);
    expect(result.action).toBe('auto_responded');
  });
});
```

**When to write**: For workflows, API endpoints, database interactions

### E2E Tests (Slow, Full System)

```typescript
// Test complete user journey
describe('Autonomous Scheduling E2E', () => {
  it('should auto-respond to scheduling request from Gmail to sent email', async () => {
    // Send real email → system detects → checks calendar → sends response
  });
});
```

**When to write**: For critical user paths, before releases

### Running Tests

```bash
# All tests
npm test

# Unit tests only (fast)
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Coverage report
npm run test:coverage

# Watch mode (re-run on changes)
npm run test:watch

# Specific file
npm test -- ConfidenceScorer.test.ts
```

### Test Coverage Goals

- **Critical paths**: 100% (EmailOrchestrator, ConfidenceScorer, AvailabilityService)
- **Business logic**: 80%+
- **Utilities**: 60%+
- **Overall**: 70%+

---

## 🌿 Git Workflow

### Branch Naming

```bash
feature/add-nlp-classifier      # New feature
fix/confidence-scoring-bug      # Bug fix
refactor/extract-email-parser   # Code refactoring
docs/update-api-spec            # Documentation
test/add-orchestrator-tests     # Tests only
chore/upgrade-dependencies      # Maintenance
```

### Commit Messages (Conventional Commits)

```bash
feat: Add NLP intent classifier using Claude API
fix: Correct confidence threshold comparison in circuit breaker
refactor: Extract email parsing logic into separate service
docs: Update MCP integration guide with OAuth flow
test: Add integration tests for EmailOrchestrator
chore: Upgrade @modelcontextprotocol/sdk to v0.6.0
```

**Format**: `<type>: <description>`

**Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`

### Pull Request Process

1. **Create branch**: `git checkout -b feature/your-feature`
2. **Make changes**: Code + tests + docs
3. **Run checks**:
   ```bash
   npm run build     # TypeScript compiles
   npm test          # All tests pass
   npm run lint      # No linting errors
   ```
4. **Commit**: `git commit -m "feat: Your feature"`
5. **Push**: `git push origin feature/your-feature`
6. **Create PR**: With description, screenshots (if UI), testing notes
7. **Code review**: Address feedback
8. **Merge**: Squash and merge to main

### Code Review Checklist

**Reviewer checks:**
- [ ] Tests added/updated for changes
- [ ] No hardcoded credentials or secrets
- [ ] Follows code standards (TypeScript strict mode, naming conventions)
- [ ] Database migrations included (if schema changes)
- [ ] Documentation updated (if API/behavior changes)
- [ ] No console.log (use logger instead)
- [ ] Error handling for async operations
- [ ] Security vulnerabilities (SQL injection, XSS, etc.)

---

## 🐛 Debugging

### Debug Server with Breakpoints

```bash
# VS Code: Add to .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Server",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "dev"],
  "console": "integratedTerminal",
  "skipFiles": ["<node_internals>/**"]
}
```

### Debug Tests

```bash
# Run single test with debug
node --inspect-brk node_modules/.bin/jest --runInBand tests/unit/ConfidenceScorer.test.ts

# VS Code: Add to launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache", "${file}"],
  "console": "integratedTerminal"
}
```

### Database Debugging

```bash
# Connect to database
psql -U calendar_user -d calendar_availability

# Useful queries
\dt                                    # List tables
\d table_name                          # Describe table
SELECT * FROM automation_audit_log ORDER BY created_at DESC LIMIT 10;
EXPLAIN ANALYZE SELECT ...;            # Query performance

# Enable query logging
ALTER DATABASE calendar_availability SET log_statement = 'all';
```

### Logging

```typescript
import { createLogger } from '../utils/logger';
const logger = createLogger('MyService');

logger.debug('Detailed debug info', { userId, requestId });
logger.info('Normal operation', { event: 'email_processed' });
logger.warn('Potential issue', { confidence: 0.75 });
logger.error('Error occurred', { error: error.message, stack: error.stack });
```

**Log levels**: `error` > `warn` > `info` > `debug`

Set `LOG_LEVEL=debug` in `.env` for verbose logging.

---

## 🛠️ Common Tasks

### Add New Service

```bash
# 1. Create service file
touch src/services/MyNewService.ts

# 2. Implement service
# - Export class with clear interface
# - Add logging for important operations
# - Handle errors gracefully

# 3. Add types to src/types/index.ts
export interface MyServiceData { ... }

# 4. Write unit tests
touch tests/unit/MyNewService.test.ts

# 5. Use in EmailOrchestrator or routes
import { MyNewService } from './services/MyNewService';
```

### Add API Endpoint

```bash
# 1. Add route in src/routes/automation.ts
router.post('/automation/new-endpoint', requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  // Handle request
  res.json({ message: 'Success' });
});

# 2. Add integration test
# tests/integration/api.integration.test.ts

# 3. Update API documentation
# .specify/api-spec.md
```

### Database Migration

```bash
# 1. Create migration SQL
cat > .specify/scripts/migration-001.sql << 'EOF'
-- Add new column
ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';

-- Update existing rows
UPDATE users SET timezone = 'America/New_York' WHERE email LIKE '%@example.com';
