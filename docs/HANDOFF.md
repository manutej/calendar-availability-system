# Developer Handoff Guide

**Project**: Calendar Availability System
**Status**: 🎯 Ready for Development
**Created**: 2025-01-18
**Handoff Date**: TBD

---

## 🎯 Executive Summary

This document provides everything a developer needs to begin implementing the Calendar Availability System. All specifications are complete, architectural decisions have been made, and the development path is clear.

**What's Ready**:
- ✅ Complete technical specifications (7 documents)
- ✅ Constitutional framework with 9 architectural principles
- ✅ OpenAPI 3.0 API specification
- ✅ Complete database schema with migrations
- ✅ 16-week implementation roadmap
- ✅ Security model and compliance requirements
- ✅ MCP integration patterns
- ✅ Claude Code development environment configured

**Time to First Commit**: ~2 hours (after reading specs)

---

## 📚 Required Reading (Priority Order)

### 1. Constitutional Framework (30 min)
**File**: `.specify/constitution.md`

**Why First**: Establishes the 9 immutable architectural principles that govern ALL decisions:
1. Specification-First Development
2. Explicit Over Implicit
3. Fail-Fast with Detailed Errors
4. Observable Operations
5. Stateless Core Operations
6. Idempotent by Design
7. Versioned Everything
8. Security by Default
9. Test Coverage as Non-Negotiable

**Key Takeaway**: Every pull request must demonstrate alignment with these principles.

### 2. Technical Specification (1 hour)
**File**: `.specify/spec.md`

**What You'll Learn**:
- Complete system overview
- 12 detailed user stories across 4 phases
- Functional and non-functional requirements
- High-level architecture diagrams
- Core data model definitions
- Edge cases and error scenarios

**Key Sections**:
- Section 3.1: User Stories (implementation order)
- Section 5: Data Model
- Section 8: Edge Cases

### 3. Implementation Phases (45 min)
**File**: `.specify/phases.md`

**What You'll Learn**:
- 16-week roadmap with weekly breakdowns
- Phase 1 (Foundation) deliverables
- Risk mitigation strategies
- Testing requirements per phase
- Deployment strategies

**Your First Sprint**: Weeks 1-2 of Phase 1 (see section 2.1)

### 4. API Specification (45 min)
**File**: `.specify/api-spec.md`

**What You'll Learn**:
- Complete OpenAPI 3.0 spec
- All endpoints, request/response schemas
- Authentication flows
- Error response format (MUST follow RFC 7807)

**Quick Start**: Import into Postman/Insomnia for interactive exploration

### 5. Database Schema (45 min)
**File**: `.specify/db-schema.md`

**What You'll Learn**:
- Complete PostgreSQL schema (20+ tables)
- Relationships and constraints
- Indexing strategy
- Partitioning for performance
- Migration plan

**Quick Start**: DDL scripts are provided, ready to execute

### 6. Integration Patterns (30 min)
**File**: `.specify/integrations.md`

**What You'll Learn**:
- MCP client architecture
- Google Calendar integration patterns
- Gmail integration patterns
- Error handling and retries
- Rate limiting strategies

**Critical**: MCP integration is the foundation of Phase 1

### 7. Security Model (30 min)
**File**: `.specify/security.md`

**What You'll Learn**:
- Authentication mechanisms (OAuth2, local, MFA)
- Authorization models (RBAC, ABAC)
- Encryption requirements
- GDPR/CCPA compliance checklist
- Security operations procedures

**Non-Negotiable**: All auth/authz must follow this model

---

## 🚀 Quick Start (First 2 Hours)

### Hour 1: Environment Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd calendar-availability-system

# 2. Initialize Node.js project
npm init -y

# 3. Install core dependencies
npm install express typescript @types/node @types/express
npm install dotenv pg @modelcontextprotocol/sdk
npm install --save-dev nodemon ts-node jest @types/jest

# 4. Set up TypeScript
npx tsc --init

# 5. Set up PostgreSQL
createdb calendar_availability_dev

# 6. Apply database schema
psql calendar_availability_dev < .specify/scripts/init-schema.sql
```

### Hour 2: First Endpoint

Implement the health check endpoint (`.specify/api-spec.md` line 87):

```typescript
// src/server.ts
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
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

**Validation**: `curl http://localhost:3000/health` should return 200 OK

---

## 📋 Phase 1 Checklist (Weeks 1-4)

### Week 1: Project Setup
- [ ] Initialize Git repository
- [ ] Set up Node.js + TypeScript project
- [ ] Configure ESLint, Prettier
- [ ] Set up PostgreSQL database
- [ ] Apply database schema from `.specify/db-schema.md`
- [ ] Implement health check endpoint
- [ ] Set up basic logging (Winston or Pino)
- [ ] Configure environment variables (.env)

### Week 2: Google Calendar MCP Integration
- [ ] Install `@modelcontextprotocol/server-google-calendar`
- [ ] Implement MCP client (see `.specify/integrations.md` section 3)
- [ ] Create Calendar service layer
- [ ] Implement calendar sync logic
- [ ] Add error handling and retries
- [ ] Write integration tests
- [ ] Test with real Google Calendar API

### Week 3: Availability API
- [ ] Implement `GET /api/v1/availability` endpoint
- [ ] Implement `POST /api/v1/availability/check` endpoint
- [ ] Add conflict detection logic
- [ ] Implement time zone handling
- [ ] Add input validation
- [ ] Write unit tests
- [ ] Write API integration tests

### Week 4: Authentication & Refinement
- [ ] Implement OAuth2 flow for Google
- [ ] Add JWT token generation
- [ ] Implement refresh token logic
- [ ] Add rate limiting middleware
- [ ] Implement request logging
- [ ] Performance testing
- [ ] Security audit
- [ ] Documentation updates

---

## 🎨 Development Environment

### Claude Code Configuration

This project includes Claude Code support in `.claude/`:

**Available Skills** (auto-selected based on context):
- `nodejs-development` - Node.js expertise
- `expressjs-development` - Express patterns
- `postgresql` - Database design
- `api-gateway-patterns` - API architecture
- `oauth2-authentication` - Auth patterns
- `fastapi-development` - API best practices

**Available Agents** (invoke explicitly):
- `api-architect` - For API design decisions
- `spec-driven-development-expert` - For spec updates/clarification
- `test-engineer` - For test suite generation
- `deployment-orchestrator` - For deployment automation

**Available Commands**:
- `/constitution` - Review architectural principles
- `/current` - Check implementation status vs spec
- `/ctx7 <library>` - Look up library docs (e.g., `/ctx7 express`)

### Recommended Tools

**IDE**: VSCode with extensions:
- ESLint
- Prettier
- TypeScript
- PostgreSQL
- REST Client

**API Testing**:
- Postman or Insomnia
- Import `.specify/api-spec.md` (OpenAPI format)

**Database**:
- pgAdmin or DBeaver
- Schema is in `.specify/db-schema.md`

**Version Control**:
- Git with conventional commits
- Branch naming: `feature/`, `fix/`, `docs/`

---

## 🧪 Testing Requirements

### Test Coverage Targets

**Principle 9**: Test coverage is NON-NEGOTIABLE

- **Unit Tests**: 80% minimum coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user flows (Phase 1: calendar sync, availability check)

### Test Structure

```
tests/
├── unit/
│   ├── services/
│   │   ├── calendar.test.ts
│   │   └── availability.test.ts
│   └── utils/
│       └── timezone.test.ts
├── integration/
│   ├── api/
│   │   ├── availability.test.ts
│   │   └── auth.test.ts
│   └── mcp/
│       └── google-calendar.test.ts
└── e2e/
    └── availability-flow.test.ts
```

### Running Tests

```bash
# Unit tests
npm run test:unit

# Integration tests (requires DB)
npm run test:integration

# E2E tests (requires MCP servers)
npm run test:e2e

# Coverage report
npm run test:coverage
```

---

## 🔐 Security Checklist

Before ANY deployment (even dev):

- [ ] All secrets in environment variables (never in code)
- [ ] OAuth2 credentials secured
- [ ] Database credentials secured
- [ ] TLS/SSL enabled for all external connections
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (use parameterized queries)
- [ ] XSS prevention (sanitize outputs)
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] Audit logging enabled

See `.specify/security.md` for complete requirements.

---

## 📊 Success Metrics (Phase 1)

You'll know Phase 1 is complete when:

**Functional**:
- [ ] Google Calendar sync working (both directions)
- [ ] Availability API returns correct results
- [ ] Authentication flow works end-to-end
- [ ] All Phase 1 user stories implemented

**Performance**:
- [ ] Calendar sync latency <2 seconds
- [ ] API response time <200ms (p95)
- [ ] Database queries <50ms (p95)

**Quality**:
- [ ] Test coverage >80%
- [ ] Zero critical security vulnerabilities
- [ ] All constitutional principles followed
- [ ] API matches OpenAPI spec exactly

**Operational**:
- [ ] Health checks passing
- [ ] Logging capturing all errors
- [ ] Metrics collection working
- [ ] Ready for staging deployment

---

## 🚨 Common Pitfalls

### 1. Skipping the Constitution
**Problem**: Implementing without reading `.specify/constitution.md`
**Result**: Decisions that violate architectural principles
**Solution**: Read constitution first, reference before every major decision

### 2. Deviating from API Spec
**Problem**: "Improving" the API without updating specs
**Result**: Specs and code diverge (violation of Principle 1)
**Solution**: Update `.specify/api-spec.md` first, then implement

### 3. Implicit Error Handling
**Problem**: Generic error messages, swallowed exceptions
**Result**: Violates Principle 3 (Fail-Fast with Detailed Errors)
**Solution**: Use RFC 7807 error format, include trace IDs

### 4. Missing Tests
**Problem**: Writing code without tests
**Result**: Violates Principle 9 (Test Coverage as Non-Negotiable)
**Solution**: Write tests from specs before implementation (TDD)

### 5. Hardcoded Configuration
**Problem**: Embedding URLs, credentials in code
**Result**: Violates Principle 8 (Security by Default)
**Solution**: All config in environment variables

### 6. MCP Integration Shortcuts
**Problem**: Not following MCP patterns in `.specify/integrations.md`
**Result**: Unreliable calendar sync, poor error handling
**Solution**: Follow patterns exactly, especially retry logic

---

## 🤝 Getting Help

### Documentation
1. **Specs** (`.specify/`) - Source of truth for ALL questions
2. **Claude Code** - Use `/ctx7 <library>` for library docs
3. **README.md** - Project overview

### Clarifications
If specs are unclear or contradictory:
1. Use `spec-driven-development-expert` agent to refine specs
2. Update specs first
3. Document the clarification
4. Then implement

### Architecture Decisions
For any architectural decision:
1. Review `.specify/constitution.md` principles
2. Check if decision aligns with all 9 principles
3. Document decision in ADR (Architecture Decision Record)
4. Update specs if needed

---

## 📅 Development Timeline

### Phase 1: Foundation (Weeks 1-4) - START HERE
**Deliverables**:
- Working Google Calendar integration
- Basic availability API
- Authentication system
- Test suite foundation

**Definition of Done**: All Phase 1 success metrics met

### Phase 2: Email Intelligence (Weeks 5-8)
**Deliverables**:
- Gmail MCP integration
- Email parsing and NLP
- Automated reply system

**Prerequisites**: Phase 1 complete and deployed to staging

### Phase 3: Web Scraping (Weeks 9-12)
**Deliverables**:
- Playwright integration
- Multi-source calendar aggregation
- Authentication handling for external sites

**Prerequisites**: Phase 2 complete

### Phase 4: Advanced Features (Weeks 13-16)
**Deliverables**:
- Smart scheduling suggestions
- Conflict resolution
- Analytics and reporting

**Prerequisites**: Phase 3 complete

---

## ✅ Pre-Development Checklist

Before writing ANY code:

- [ ] Read `.specify/constitution.md` (30 min)
- [ ] Read `.specify/spec.md` (1 hour)
- [ ] Review `.specify/phases.md` Week 1-2 tasks
- [ ] Scan `.specify/api-spec.md` for endpoint overview
- [ ] Review `.specify/db-schema.md` for data model
- [ ] Understand MCP integration patterns (`.specify/integrations.md`)
- [ ] Set up development environment (Hour 1 above)
- [ ] Configure PostgreSQL database
- [ ] Test database connection
- [ ] Implement and test health check endpoint (Hour 2 above)
- [ ] Commit initial setup to Git

**Time Investment**: ~4 hours
**ROI**: Prevents days/weeks of rework from misalignment

---

## 🎯 First Week Goals

By end of Week 1, you should have:

1. **Project scaffolding** complete
2. **Database** initialized with schema
3. **Health check** endpoint working
4. **Git repository** with initial commit
5. **CI/CD pipeline** basic setup (optional but recommended)
6. **Development environment** fully configured
7. **MCP server** installed and testable

**Validation**: Run `npm test` and `curl http://localhost:3000/health` successfully

---

## 📞 Final Notes

### This Is a Spec-Driven Project

**What this means**:
- Specifications are the source of truth, not the code
- Update specs BEFORE implementing changes
- Code implements specs, specs don't document code
- Deviations from specs require spec updates first

### Constitutional Compliance

**Every decision must align with the 9 principles**:
1. Spec-first (not code-first)
2. Explicit errors (not silent failures)
3. Fail-fast (not graceful degradation without alerting)
4. Observable (not black box)
5. Stateless core (not session-dependent)
6. Idempotent (not unreliable on retry)
7. Versioned (not breaking changes)
8. Secure by default (not security as afterthought)
9. Tested (not "works on my machine")

### Quality Over Speed

**Phase 1 is 4 weeks for a reason**:
- Week 1: Foundation (don't rush this)
- Week 2: MCP integration (get it right)
- Week 3: Availability API (thorough testing)
- Week 4: Auth & refinement (security matters)

**Don't skip**: Tests, security, documentation, constitutional review

---

## 🚀 You're Ready!

Everything you need to build this system is in `.specify/`. The path is clear, the architecture is sound, and the specifications are comprehensive.

**Next Step**: Complete the Pre-Development Checklist above, then start Week 1 tasks.

**Questions**: Refer to specs first, use Claude Code agents second, ask humans third.

**Good luck, and happy coding!** 🎉

---

**Handoff Status**: ✅ Complete
**Specifications**: ✅ Ready
**Development Environment**: ✅ Configured
**Next Action**: Begin Week 1 implementation

*This project was designed with [Claude Code](https://claude.ai/code) using constitutional spec-driven development principles.*
