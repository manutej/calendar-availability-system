# Quick Start Guide

**Get running in 3 ways:**

## Option 1: Automated Setup (Recommended) ⚡

```bash
# Run automated setup script
./scripts/setup.sh
```

This script will:
- ✅ Check prerequisites (Node.js, PostgreSQL)
- ✅ Install npm dependencies
- ✅ Create database and initialize schema
- ✅ Clone and build MCP servers
- ✅ Generate .env file with secure defaults
- ✅ Run tests to verify installation

**Then:**
1. Edit `.env` with your Google OAuth credentials
2. Run `npm run dev`
3. Visit `http://localhost:3000/health`

---

## Option 2: Manual Setup (Step-by-Step)

See [SETUP.md](./SETUP.md) for complete 60-minute walkthrough.

---

## Option 3: Docker (Coming Soon)

```bash
docker-compose up -d
```

---

## Pre-Flight Checklist ✈️

Before starting, ensure you have:

- [ ] **Node.js 18+** - `node --version`
- [ ] **PostgreSQL 14+** - `psql --version`
- [ ] **Git** - `git --version`
- [ ] **Google Cloud account** (free tier works)
- [ ] **30-60 minutes** for full setup

---

## What You Need From Google Cloud

1. **Project created** at https://console.cloud.google.com/
2. **APIs enabled**: Gmail API + Google Calendar API
3. **OAuth2 credentials**: Client ID + Client Secret
4. **Redirect URI**: `http://localhost:3000/oauth/google/callback`

See [SETUP.md Step 4](./SETUP.md#step-4-google-cloud-setup-15-min) for detailed instructions.

---

## Minimal Working Configuration

**Absolute minimum to run:**

```env
# .env file
DATABASE_URL=postgresql://user:pass@localhost:5432/calendar_availability
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GMAIL_MCP_SERVER_PATH=/absolute/path/to/mcp-servers/gmail-mcp-server/build/index.js
CALENDAR_MCP_SERVER_PATH=/absolute/path/to/mcp-servers/mcp-google-calendar/build/index.js
```

---

## Verify Installation

```bash
# 1. Build passes
npm run build

# 2. Tests pass
npm test

# 3. Server starts
npm run dev

# 4. Health check
curl http://localhost:3000/health
# Should return: {"status":"healthy",...}
```

---

## Common Issues

### "Database connection failed"
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify credentials in .env match database

### "Cannot find MCP server"
- Use **absolute paths** in .env (not relative paths like `./mcp-servers/...`)
- Run: `ls -la $(grep GMAIL_MCP_SERVER_PATH .env | cut -d'=' -f2)`

### "OAuth redirect URI mismatch"
- Ensure Google Cloud Console redirect URI **exactly** matches .env
- No trailing slashes

### "Port 3000 already in use"
- Change `PORT=3001` in .env
- Or kill process: `lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill`

---

## Next Steps After Setup

1. **Test the API**:
   ```bash
   # Get automation settings
   curl http://localhost:3000/api/automation/settings -H "x-user-id: test-user"
   ```

2. **Configure preferences**:
   ```bash
   curl -X PUT http://localhost:3000/api/automation/settings \
     -H "Content-Type: application/json" \
     -H "x-user-id: test-user" \
     -d '{"automationEnabled":true,"confidenceThreshold":0.85}'
   ```

3. **View audit log**:
   ```bash
   curl http://localhost:3000/api/automation/audit -H "x-user-id: test-user"
   ```

---

## Development Workflow

```bash
# Watch mode (auto-rebuild on changes)
npm run dev

# Run specific test file
npm test -- ConfidenceScorer.test.ts

# Check code style
npm run lint

# Database migration (after schema changes)
psql -U calendar_user -d calendar_availability -f .specify/scripts/init-schema.sql
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Gmail (Incoming Email)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              EmailOrchestrator (Main Controller)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ NLP Classify │→ │ Confidence   │→ │ Availability │      │
│  │              │  │ Scorer       │  │ Service      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Database (Audit Trail) + Gmail (Auto-send Response)        │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
calendar-availability-system/
├── src/
│   ├── services/          # Core business logic
│   │   ├── EmailOrchestrator.ts      # Main controller
│   │   ├── ConfidenceScorer.ts       # Decision engine
│   │   ├── NLPIntentClassifier.ts    # Email parsing
│   │   ├── AvailabilityService.ts    # Calendar logic
│   │   └── ...
│   ├── routes/            # REST API endpoints
│   ├── types/             # TypeScript definitions
│   └── utils/             # Database, logger, etc.
├── tests/                 # Unit tests
├── .specify/              # Specifications & docs
│   ├── spec.md            # Technical spec
│   └── scripts/init-schema.sql  # Database schema
├── mcp-servers/           # MCP integrations (cloned)
├── .env                   # Environment config (create this)
└── SETUP.md               # Full setup guide
```

---

## Getting Help

**Read First:**
- [SETUP.md](./SETUP.md) - Complete setup walkthrough
- [PROJECT-STATUS.md](./PROJECT-STATUS.md) - What's implemented
- [.specify/mcp-integration-spec.md](./.specify/mcp-integration-spec.md) - MCP details

**Still stuck?**
Open GitHub issue with:
- Error message (full output)
- Steps to reproduce
- Environment: OS, Node version, PostgreSQL version

---

**Ready to start? Run:** `./scripts/setup.sh` 🚀
