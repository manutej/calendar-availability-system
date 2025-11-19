# Calendar Availability System - Deployment Guide

**Repository**: https://github.com/manutej/calendar-availability-system
**Status**: ✅ Ready for Server Deployment
**Last Updated**: 2025-11-18

---

## 🎯 Quick Deployment Overview

This repository contains a **complete specification package** for an Autonomous Scheduling Assistant. All specifications have been refined through multi-agent analysis (Sequential Thinking + MERCURIO + MARS) and are ready for development team handoff.

---

## 📦 What's Included

### Specifications (`.specify/` - 7 files)
```
.specify/
├── constitution.md           # Constitutional framework (v1.1.0 with Article X)
├── spec.md                   # Technical specification (autonomous-first)
├── api-spec.md              # OpenAPI 3.0 specification
├── db-schema.md             # PostgreSQL database schema
├── phases.md                # 16-week implementation roadmap
├── integrations.md          # MCP integration patterns
├── security.md              # Security model
└── TRANSFORMATION-SUMMARY.md # 20K-word multi-agent analysis
```

### Documentation (`docs/` + root)
```
docs/
├── HANDOFF.md              # Complete developer onboarding (18 KB)
├── PROJECT-SUMMARY.md      # Executive overview (15 KB)
└── (to be added during implementation)

Root:
├── README.md               # Project overview
├── QUICK-START.md          # Fast developer reference
└── DEPLOYMENT.md           # This file
```

### Configuration Files
```
├── package.json            # Node.js dependencies
├── tsconfig.json           # TypeScript strict configuration
├── .eslintrc.json          # Linting rules
├── .env.example            # Environment template
└── .gitignore              # Git exclusions
```

### Claude Code Support (`.claude/`)
```
.claude/
├── skills/                 # 6 development skills
│   ├── nodejs-development
│   ├── expressjs-development
│   ├── postgresql
│   ├── graphql-api-development
│   ├── fastapi-development
│   └── docker-compose-orchestration
├── agents/                 # 4 specialized agents
│   ├── api-architect.md
│   ├── spec-driven-development-expert.md
│   ├── test-engineer.md
│   └── deployment-orchestrator.md
└── commands/               # 3 utility commands
    ├── constitution.md
    ├── current.md
    └── ctx7.md
```

---

## 🚀 Server Deployment Steps

### Prerequisites

**Server Requirements**:
- Ubuntu 20.04+ or similar Linux distribution
- Node.js 18+ and npm
- PostgreSQL 15+
- Git
- Minimum 2 GB RAM, 10 GB storage

**Access Requirements**:
- Google Cloud project with Calendar & Gmail API enabled
- OAuth2 credentials (client ID, client secret)
- MCP servers: `@modelcontextprotocol/server-google-calendar`, `@modelcontextprotocol/server-gmail`

### Step 1: Clone Repository on Server

```bash
# SSH into your server
ssh user@your-server.com

# Clone the repository
git clone https://github.com/manutej/calendar-availability-system.git
cd calendar-availability-system

# Verify all files present
ls -la .specify/  # Should show 8 files
ls -la docs/      # Should show 2 files
```

### Step 2: Environment Setup

```bash
# Install Node.js 18+ (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify versions
node --version  # Should be 18.x or higher
npm --version   # Should be 9.x or higher

# Install PostgreSQL 15+ (if not already installed)
sudo apt-get install postgresql-15 postgresql-client-15

# Create database
sudo -u postgres createdb calendar_availability_prod
```

### Step 3: Application Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env

# Required variables:
# - NODE_ENV=production
# - DATABASE_URL=postgresql://user:password@localhost:5432/calendar_availability_prod
# - GOOGLE_CLIENT_ID=your_google_client_id
# - GOOGLE_CLIENT_SECRET=your_google_client_secret
# - GMAIL_CLIENT_ID=your_gmail_client_id
# - GMAIL_CLIENT_SECRET=your_gmail_client_secret
# - JWT_SECRET=your_secure_random_string_32_chars
# - ENCRYPTION_KEY=your_base64_encoded_32_byte_key
```

### Step 4: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Run linting to verify code quality
npm run lint

# Run type checking
npm run build
```

### Step 5: Database Initialization

```bash
# Apply database schema (once implementation is complete)
# For now, schema is documented in .specify/db-schema.md

# Example (when scripts are implemented):
# npm run db:migrate
```

### Step 6: Start Application

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start

# Using PM2 for process management (recommended)
sudo npm install -g pm2
pm2 start dist/server.js --name calendar-availability
pm2 save
pm2 startup  # Follow instructions to enable startup on boot
```

### Step 7: Configure Reverse Proxy (Optional but Recommended)

```bash
# Install nginx
sudo apt-get install nginx

# Create nginx configuration
sudo nano /etc/nginx/sites-available/calendar-availability

# Paste configuration:
# server {
#     listen 80;
#     server_name your-domain.com;
#
#     location / {
#         proxy_pass http://localhost:3000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_cache_bypass $http_upgrade;
#     }
# }

# Enable site
sudo ln -s /etc/nginx/sites-available/calendar-availability /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 8: SSL Certificate (Production)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured by certbot
```

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] All secrets in environment variables (never in code)
- [ ] OAuth2 credentials configured correctly
- [ ] Database credentials secured
- [ ] Firewall configured (only ports 22, 80, 443 open)
- [ ] SSL/TLS enabled for all connections
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Backup strategy in place (database + .env file)

---

## 📊 Post-Deployment Verification

### Health Check

```bash
# Test health endpoint (once implemented)
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-11-18T...",
#   "version": "0.1.0"
# }
```

### Database Connection

```bash
# Verify database connectivity
psql -h localhost -U postgres -d calendar_availability_prod -c "SELECT version();"
```

### Logs

```bash
# View application logs (PM2)
pm2 logs calendar-availability

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🔄 Continuous Deployment

### Pull Latest Changes

```bash
# Navigate to repository
cd /path/to/calendar-availability-system

# Pull latest changes
git pull origin master

# Install new dependencies (if any)
npm install

# Rebuild
npm run build

# Restart application
pm2 restart calendar-availability
```

### Automated Deployment (Optional)

Create a GitHub Actions workflow (`.github/workflows/deploy.yml`):

```yaml
name: Deploy to Server

on:
  push:
    branches: [ master ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /path/to/calendar-availability-system
            git pull origin master
            npm install
            npm run build
            pm2 restart calendar-availability
```

---

## 📈 Monitoring

### Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# Check status
pm2 status calendar-availability

# Resource usage
pm2 show calendar-availability
```

### Database Monitoring

```bash
# Check database size
psql -U postgres -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) FROM pg_database;"

# Active connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'calendar_availability_prod';"
```

---

## 🆘 Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs calendar-availability --lines 100

# Common issues:
# - Missing environment variables (.env not configured)
# - Database connection failed (check DATABASE_URL)
# - Port already in use (change PORT in .env)
# - Node.js version too old (requires 18+)
```

### Database Connection Errors

```bash
# Test PostgreSQL connection
psql -h localhost -U postgres -d calendar_availability_prod

# Check PostgreSQL is running
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### MCP Integration Issues

```bash
# Verify MCP server packages installed
npm list @modelcontextprotocol/server-google-calendar
npm list @modelcontextprotocol/server-gmail

# Check OAuth credentials
# - Ensure redirect URI matches: http://your-domain.com/auth/google/callback
# - Verify scopes enabled in Google Cloud Console
```

---

## 📞 Support & Documentation

**Specifications**: All in `.specify/` directory
**Developer Onboarding**: `docs/HANDOFF.md`
**Quick Reference**: `QUICK-START.md`
**Architecture**: `.specify/spec.md` and `.specify/TRANSFORMATION-SUMMARY.md`

**Repository**: https://github.com/manutej/calendar-availability-system

**Constitutional Framework**: `.specify/constitution.md` (v1.1.0)
- Includes Article X: Autonomous Operation with Accountability

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Repository cloned on server
- [ ] Node.js 18+ installed
- [ ] PostgreSQL 15+ installed
- [ ] Database created
- [ ] `.env` configured with all required variables
- [ ] Dependencies installed (`npm install`)
- [ ] Build successful (`npm run build`)

### Deployment
- [ ] Application starts successfully
- [ ] Health check endpoint responds
- [ ] Database connection verified
- [ ] Logs show no errors
- [ ] PM2 process manager configured
- [ ] Nginx reverse proxy configured (optional)
- [ ] SSL certificate installed (production)

### Post-Deployment
- [ ] Monitoring configured (PM2, logs)
- [ ] Backup strategy in place
- [ ] Security checklist completed
- [ ] Team notified of deployment
- [ ] Documentation updated with server details

---

## 🎯 Current Status

**Specifications**: ✅ Complete and pushed to repository
**Implementation**: ⏳ Ready to begin (Phase 1 Week 1)
**Server Setup**: 📋 Follow this guide
**Development Team**: 🎯 Ready for handoff

**Next Action**: Development team should complete Pre-Deployment checklist, then begin Phase 1 implementation according to `.specify/phases.md`.

---

*This deployment guide assumes the application will be implemented according to the specifications in `.specify/`. Adjust commands and configurations as needed based on actual implementation details.*

**Last Updated**: 2025-11-18
**Repository**: https://github.com/manutej/calendar-availability-system
