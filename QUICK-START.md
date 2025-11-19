# Quick Start Guide

**Repository**: https://github.com/manutej/calendar-availability-system

---

## 🚀 30-Second Overview

This is a **specification-driven development** project. All implementation follows the specs in `.specify/`. Read specs first, code second.

---

## ⚡ First 10 Minutes

```bash
# 1. Clone
git clone https://github.com/manutej/calendar-availability-system.git
cd calendar-availability-system

# 2. Read THIS first (required)
open .specify/constitution.md  # 9 architectural principles (30 min)

# 3. Then read this
open .specify/spec.md          # Technical specification (1 hour)

# 4. Then this
open docs/HANDOFF.md           # Complete developer guide
```

---

## 📚 Reading Order (Total: 4 hours)

1. **`.specify/constitution.md`** (30 min) - 9 immutable principles
2. **`.specify/spec.md`** (1 hour) - Technical spec with user stories
3. **`.specify/phases.md`** (45 min) - Your 16-week roadmap
4. **`.specify/api-spec.md`** (45 min) - OpenAPI 3.0 spec
5. **`.specify/db-schema.md`** (45 min) - Database design
6. **`docs/HANDOFF.md`** (30 min) - Developer onboarding

**⚠️ DO NOT skip reading specs.** They are the source of truth.

---

## 🛠️ Environment Setup (2 hours)

### Prerequisites

```bash
# Required
node --version  # Need 18+
psql --version  # Need PostgreSQL 15+

# Google Cloud setup
# 1. Create project at console.cloud.google.com
# 2. Enable Google Calendar API
# 3. Enable Gmail API
# 4. Create OAuth2 credentials
```

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials:
# - DATABASE_URL
# - GOOGLE_CLIENT_ID
# - GOOGLE_CLIENT_SECRET
# - JWT_SECRET

# Set up database
createdb calendar_availability_dev
# Apply schema from .specify/db-schema.md

# Verify
npm run lint
npm test
```

---

## 🎯 Your First Commit (Hour 3)

Implement the health check endpoint:

```typescript
// src/server.ts
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Test**: `curl http://localhost:3000/health` should return 200 OK

---

## 📋 Week 1 Checklist

- [ ] Read all specifications (4 hours)
- [ ] Set up development environment
- [ ] Initialize database with schema
- [ ] Implement health check endpoint
- [ ] Configure ESLint, Prettier
- [ ] Set up logging (Winston/Pino)
- [ ] Write first test
- [ ] Commit and push

**Success**: Health endpoint works + tests pass

---

## 🧭 Key Files

| File | Purpose | When to Read |
|------|---------|--------------|
| `.specify/constitution.md` | Architectural principles | **Before anything** |
| `.specify/spec.md` | What to build | Week 1 |
| `.specify/api-spec.md` | How APIs work | Week 2-3 |
| `.specify/db-schema.md` | Database structure | Week 1 |
| `.specify/phases.md` | Your roadmap | Week 1 |
| `docs/HANDOFF.md` | Complete guide | Reference |

---

## 🎨 Development Tools

### Claude Code Support

```bash
# Available in .claude/

Skills (6):
- nodejs-development
- expressjs-development
- postgresql
- graphql-api-development
- fastapi-development
- docker-compose-orchestration

Agents (4):
- api-architect           # For API design
- spec-driven-expert      # For spec clarification
- test-engineer          # For test generation
- deployment-orchestrator # For deployment

Commands (3):
/constitution  # Review principles
/current       # Check status vs spec
/ctx7 <lib>    # Library docs
```

---

## ⚠️ Critical Rules

### The 9 Principles (from constitution)

1. **Spec-First** - Update specs before code
2. **Explicit** - No magic, document everything
3. **Fail-Fast** - Detailed errors (RFC 7807)
4. **Observable** - Log everything
5. **Stateless** - No server-side sessions
6. **Idempotent** - Safe retries
7. **Versioned** - API, schema, migrations
8. **Secure** - OAuth2, encryption, audits
9. **Tested** - 80% coverage minimum

**Violation = PR rejection**

---

## 🧪 Testing

```bash
# Run tests
npm test                 # All tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e         # E2E tests
npm run test:coverage    # Coverage report

# Required: >80% coverage (Principle 9)
```

---

## 🚨 Common Mistakes

❌ **Coding before reading specs**
✅ Read `.specify/` first, then code

❌ **Changing API without updating spec**
✅ Update `.specify/api-spec.md` first

❌ **Generic error messages**
✅ Use RFC 7807 format with trace IDs

❌ **Skipping tests**
✅ Write tests from specs before implementation

❌ **Hardcoding config**
✅ Everything in environment variables

---

## 📊 Success Metrics

**Phase 1 (Week 4)**:
- ✅ Calendar sync latency <2s
- ✅ API response time <200ms (p95)
- ✅ Test coverage >80%
- ✅ Zero critical vulnerabilities

---

## 🆘 Getting Help

### Questions About Specs
1. Check `.specify/` docs first
2. Use `spec-driven-development-expert` agent
3. Update specs if clarification needed

### Technical Questions
- API design: `api-architect` agent
- Testing: `test-engineer` agent
- Library docs: `/ctx7 <library>` command

### Everything Else
- Read `docs/HANDOFF.md`
- Check `README.md`

---

## 📅 Timeline

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Setup | Health endpoint working |
| 2 | Calendar | Google Calendar sync |
| 3 | API | Availability endpoints |
| 4 | Auth | OAuth2 + JWT |
| 5-8 | Email | Gmail integration |
| 9-12 | Scraping | Multi-source aggregation |
| 13-16 | Advanced | Smart scheduling |

**See `.specify/phases.md` for detailed breakdown**

---

## ✅ Ready to Start?

1. ✅ Read `.specify/constitution.md`
2. ✅ Read `.specify/spec.md`
3. ✅ Complete environment setup
4. ✅ Implement health endpoint
5. ✅ Push first commit

**You're ready! Start Week 1 tasks.**

---

## 🔗 Quick Links

- **Specs**: `.specify/` folder
- **Handbook**: `docs/HANDOFF.md`
- **Summary**: `docs/PROJECT-SUMMARY.md`
- **GitHub**: https://github.com/manutej/calendar-availability-system

---

**Questions?** Read `docs/HANDOFF.md` - it has everything.

**Stuck?** Check `.specify/` specs - they're the source of truth.

**Ready?** Start with `.specify/constitution.md` - don't skip it!

---

*This is a spec-driven project. Specs ≠ documentation. Specs = source of truth.*
