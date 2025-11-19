# Calendar Availability System

**Status**: 🔴 Specification Phase | 🎯 Ready for Development Handoff

A comprehensive calendar integration and availability management system with intelligent scheduling, email automation, and multi-source calendar aggregation.

---

## 📋 Project Overview

This system provides automated calendar availability management with:
- **Google Calendar Integration** via MCP (Model Context Protocol)
- **Gmail Integration** for automated availability replies
- **Smart Availability Detection** with conflict resolution
- **Multi-Calendar Aggregation** across different sources
- **Website Scraping** with authentication for external calendars
- **Natural Language Processing** for availability requests

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
- Specification-driven development (specs as source of truth)
- Constitutional architecture (9 immutable principles)
- MCP-first integration design
- Event-driven architecture
- CQRS for read-heavy operations

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

### Phase 1: Foundation (Weeks 1-4)
- ✅ Specifications complete
- ⏳ Database setup
- ⏳ Google Calendar MCP integration
- ⏳ Basic availability API

### Phase 2: Email Intelligence (Weeks 5-8)
- ⏳ Gmail MCP integration
- ⏳ Email parsing & NLP
- ⏳ Automated reply system

### Phase 3: Web Scraping (Weeks 9-12)
- ⏳ Playwright integration
- ⏳ Authentication handling
- ⏳ Multi-source aggregation

### Phase 4: Advanced Features (Weeks 13-16)
- ⏳ Smart scheduling
- ⏳ Conflict resolution
- ⏳ Analytics & reporting

See [phases.md](/.specify/phases.md) for detailed breakdown.

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

**Current Status**: ✅ Specifications complete, ready for developer handoff

**Next Step**: Initialize Git repository and begin Phase 1 implementation

For questions or handoff details, see `docs/HANDOFF.md` (to be created).
