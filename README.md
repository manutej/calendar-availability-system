# Calendar Availability System

**Status**: 🟢 Specifications Complete | 🎯 Ready for Server Deployment

An **autonomous scheduling assistant** that eliminates manual calendar coordination by monitoring email, detecting availability requests, checking calendars automatically, and sending responses without user intervention.

---

## 📋 Project Overview

**Core Value**: Zero-touch scheduling automation - you never manually check your calendar or write scheduling emails again.

**How It Works**:
1. Email arrives: "When are you free next week?"
2. System detects scheduling request (NLP + confidence scoring)
3. System checks your calendar automatically
4. System generates natural language response with available slots
5. System sends reply autonomously (NO manual approval)
6. You receive notification: "Auto-replied to [sender] with availability"

**Key Features**:
- **Autonomous Email Responses** - Zero manual intervention (with safety guardrails)
- **Confidence-Based Automation** - Only auto-sends when ≥85% confident
- **Multi-Calendar Intelligence** - Aggregates availability across all calendars
- **Conversation State Tracking** - Handles multi-turn scheduling threads
- **Complete Transparency** - 100% audit trail with user override capability
- **VIP Controls** - Whitelist/blacklist for sender-specific handling

---

## 🏗️ Architecture

**Technology Stack**:
- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL 15+
- **API**: RESTful + GraphQL
- **Integrations**: MCP (Google Calendar, Gmail)
- **Web Scraping**: Playwright
- **Authentication**: OAuth2 + JWT

**Key Patterns**:
- **Email-First Architecture** - Gmail MCP orchestrates, calendar provides data
- **Specification-Driven Development** - Specs as source of truth (not documentation)
- **Constitutional Governance** - 10 immutable principles (incl. Article X: Autonomous Operation)
- **Confidence-Based Decisions** - Multi-factor scoring (intent, parsing, sender, context)
- **Event-Driven** - Webhook-based email monitoring (real-time, not polling)

---

## 📂 Project Structure

```
calendar-availability-system/
├── .specify/                    # Specification documents (source of truth)
│   ├── constitution.md          # Architectural principles
│   ├── spec.md                  # Technical specification
│   ├── api-spec.md              # OpenAPI 3.0 specification
│   ├── db-schema.md             # Database schema
│   ├── phases.md                # Implementation phases
│   ├── integrations.md          # MCP integration patterns
│   └── security.md              # Security model
├── .claude/                     # Claude Code configuration
│   ├── skills/                  # Project-specific skills
│   ├── agents/                  # Development agents
│   └── commands/                # Slash commands
├── src/                         # Source code (to be implemented)
├── tests/                       # Test suites
├── docs/                        # Additional documentation
├── logs/                        # Operational logs
└── README.md                    # This file
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- PostgreSQL 15+
- Google Cloud project with Calendar & Gmail API access
- MCP servers: `@modelcontextprotocol/server-google-calendar`, `@modelcontextprotocol/server-gmail`

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd calendar-availability-system

# Install dependencies (once implemented)
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Initialize database
npm run db:init

# Run development server
npm run dev
```

---

## 📖 Specifications

All specifications are located in `.specify/` and serve as the **source of truth** for development:

1. **[Constitution](/.specify/constitution.md)** - Read this first to understand architectural principles
2. **[Technical Spec](/.specify/spec.md)** - Complete system design with user stories
3. **[API Spec](/.specify/api-spec.md)** - OpenAPI 3.0 documentation
4. **[Database Schema](/.specify/db-schema.md)** - Complete data model
5. **[Implementation Phases](/.specify/phases.md)** - 16-week roadmap
6. **[Integration Patterns](/.specify/integrations.md)** - MCP integration guide
7. **[Security Model](/.specify/security.md)** - Auth, encryption, compliance

---

## 🎯 Implementation Phases

### Phase 1: Autonomous Email Assistant (Weeks 1-4) ⭐
**Goal**: Deliver zero-touch scheduling automation in 4 weeks (not 16!)

- ✅ Specifications complete (multi-agent refined)
- ⏳ Gmail MCP email monitoring (real-time webhooks)
- ⏳ NLP intent detection (Claude/GPT-4 integration)
- ⏳ Confidence scoring engine (4-factor scoring)
- ⏳ Conversation state machine (multi-turn handling)
- ⏳ Google Calendar availability calculation
- ⏳ Autonomous email sending (NO manual approval)
- ⏳ VIP whitelist/blacklist + audit trail
- ⏳ Circuit breaker & rate limiting

**Deliverable**: Working autonomous assistant with safety mechanisms

### Phase 2: Multi-Calendar Intelligence (Weeks 5-8)
- ⏳ Preference learning from behavior
- ⏳ Multi-calendar support (aggregate availability)
- ⏳ Smart conflict resolution
- ⏳ Confidence model improvements

### Phase 3: External Calendar Integration (Weeks 9-12)
- ⏳ Web scraping with Playwright
- ⏳ External calendar authentication
- ⏳ Multi-source aggregation

### Phase 4: Advanced Optimization (Weeks 13-16)
- ⏳ Group scheduling intelligence
- ⏳ Pattern recognition & analytics
- ⏳ Performance optimizations

**Time to Value**: Autonomous operation in **4 weeks** (Phase 1), not 16 weeks

See [phases.md](/.specify/phases.md) for day-by-day breakdown.

---

## 🔧 Development Resources

### Claude Code Support

This project includes custom Claude Code configuration in `.claude/`:

**Skills** (6 available):
- `fastapi-development` - API patterns
- `nodejs-development` - Node.js expertise
- `expressjs-development` - Express framework
- `postgresql` - Database design
- `api-gateway-patterns` - API architecture
- `oauth2-authentication` - Auth patterns

**Agents** (4 available):
- `api-architect` - API design and architecture
- `spec-driven-development-expert` - Specification refinement
- `test-engineer` - Test suite creation
- `deployment-orchestrator` - Deployment automation

**Commands** (3 available):
- `/constitution` - Review architectural principles
- `/current` - Check implementation status
- `/ctx7 <library>` - Look up library documentation

### MCP Servers

Required MCP servers for this project:
- `@modelcontextprotocol/server-google-calendar` - Calendar operations
- `@modelcontextprotocol/server-gmail` - Email operations
- `@modelcontextprotocol/server-playwright` - Web scraping (optional)

---

## 🧪 Testing Strategy

See `.specify/spec.md` for comprehensive testing requirements:

- **Unit Tests**: All business logic (>80% coverage)
- **Integration Tests**: API endpoints, MCP integrations
- **E2E Tests**: Critical user flows
- **Performance Tests**: Load testing for 1000+ concurrent users
- **Security Tests**: OWASP Top 10 compliance

---

## 🔐 Security

Security is built-in from the foundation:

- **Authentication**: OAuth2 (Google), local auth with MFA
- **Authorization**: RBAC + ABAC models
- **Encryption**: AES-256 at rest, TLS 1.3 in transit
- **Compliance**: GDPR, CCPA ready
- **Auditing**: Complete audit trails

See [security.md](/.specify/security.md) for details.

---

## 📊 Success Metrics

**Phase 1 Targets**:
- Calendar sync latency: <2 seconds
- API response time: <200ms (p95)
- Uptime: 99.9%

**Phase 4 Targets**:
- Support 1M+ users
- 10M+ events/day
- 100K+ concurrent connections

---

## 🤝 Contributing

This project follows **constitutional specification-driven development**:

1. **All changes start with specs** - Update `.specify/` documents first
2. **Specs are source of truth** - Code implements specs, not vice versa
3. **Constitutional compliance** - All decisions align with 9 principles
4. **Test-driven** - Write tests from specs before implementation

---

## 📝 License

[To be determined]

---

## 🙏 Acknowledgments

- Built with [Claude Code](https://claude.ai/code) development environment
- Specifications generated with spec-driven-development-expert agent
- Architecture follows constitutional framework principles

---

**Current Status**: ✅ Specifications complete, ready for server deployment

**Repository**: https://github.com/manutej/calendar-availability-system

**Next Step**: Follow `DEPLOYMENT.md` for server setup, then begin Phase 1 implementation

**Multi-Agent Analysis**: Specifications refined through Sequential Thinking + MERCURIO + MARS synthesis (see `.specify/TRANSFORMATION-SUMMARY.md`)

For complete handoff details, see:
- `DEPLOYMENT.md` - Server deployment guide
- `docs/HANDOFF.md` - Developer onboarding (18 KB)
- `QUICK-START.md` - Fast reference guide
- `.specify/TRANSFORMATION-SUMMARY.md` - Complete analysis (20K words)
