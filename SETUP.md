# Calendar Availability System - Complete Setup Guide

**Estimated Time**: 45-60 minutes  
**Difficulty**: Intermediate  
**Prerequisites**: Node.js 18+, PostgreSQL 14+, Git

---

## 📋 Overview

This guide will walk you through setting up the Calendar Availability System from scratch. Follow each step carefully to ensure error-free installation.

---

## Step 1: System Prerequisites (5 min)

### Check Node.js Version
```bash
node --version  # Should be v18.0.0 or higher
npm --version   # Should be v9.0.0 or higher
```

**If not installed:**
- macOS: `brew install node@18`
- Ubuntu: `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs`
- Windows: Download from https://nodejs.org/

### Check PostgreSQL
```bash
psql --version  # Should be 14.0 or higher
```

**If not installed:**
- macOS: `brew install postgresql@14 && brew services start postgresql@14`
- Ubuntu: `sudo apt install postgresql-14 postgresql-contrib`
- Windows: Download from https://www.postgresql.org/download/windows/

---

## Step 2: Clone and Install Dependencies (5 min)

```bash
# Clone the repository
git clone https://github.com/manutej/calendar-availability-system.git
cd calendar-availability-system

# Install Node.js dependencies
npm install

# Verify installation
npm run build
```

**Expected Output**: No errors, TypeScript compilation successful ✓

---

## Step 3: Database Setup (10 min)

### 3.1 Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database and user (run these in psql shell)
CREATE DATABASE calendar_availability;
CREATE USER calendar_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE calendar_availability TO calendar_user;
\q
```

### 3.2 Initialize Schema

```bash
# Run database initialization script
psql -U calendar_user -d calendar_availability -f .specify/scripts/init-schema.sql
```

**Expected Output**: 10 tables created successfully

### 3.3 Verify Tables

```bash
psql -U calendar_user -d calendar_availability -c "\dt"
```

**You should see**:
- users
- user_preferences
- calendars
- calendar_events
- availability_requests
- email_responses
- confidence_assessments
- conversation_states
- automation_audit_log
- circuit_breaker_state

---

## Step 4: Google Cloud Setup (15 min)

### 4.1 Create Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Click "Create Project"
3. Name: "Calendar Availability System"
4. Click "Create"

### 4.2 Enable Required APIs

```bash
# Navigate to: APIs & Services > Library
# Search and enable:
```

1. **Gmail API** - Click "Enable"
2. **Google Calendar API** - Click "Enable"

### 4.3 Create OAuth2 Credentials

1. Go to: **APIs & Services > Credentials**
2. Click **"+ CREATE CREDENTIALS" > "OAuth client ID"**
3. If prompted, configure consent screen:
   - User Type: **External**
   - App name: "Calendar Availability System"
   - User support email: your email
   - Developer contact: your email
   - Click **Save and Continue** (skip scopes for now)
4. Back to "Create OAuth client ID":
   - Application type: **Web application**
   - Name: "Calendar Availability System"
   - Authorized redirect URIs:
     - `http://localhost:3000/oauth/google/callback`
     - `http://localhost:3000/oauth/callback`
5. Click **Create**
6. **SAVE** the Client ID and Client Secret (you'll need these!)

### 4.4 Add OAuth Scopes

1. Go to: **OAuth consent screen > Edit App**
2. Click **"Add or Remove Scopes"**
3. Add these scopes:
   ```
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/gmail.send
   https://www.googleapis.com/auth/calendar.readonly
   https://www.googleapis.com/auth/calendar.events
   ```
4. Click **Update** then **Save and Continue**

---

## Step 5: Install MCP Servers (15 min)

### 5.1 Create MCP Servers Directory

```bash
mkdir -p mcp-servers
cd mcp-servers
```

### 5.2 Install Gmail MCP Server

```bash
# Clone Gmail MCP server
git clone https://github.com/devdattatalele/gmail-mcp-server.git
cd gmail-mcp-server

# Install dependencies
npm install

# Build
npm run build

# Verify build
ls build/index.js  # Should exist

cd ..
```

### 5.3 Install Google Calendar MCP Server

```bash
# Clone Calendar MCP server
git clone https://github.com/guinacio/mcp-google-calendar.git
cd mcp-google-calendar

# Install dependencies
npm install

# Build
npm run build

# Verify build
ls build/index.js  # Should exist

cd ../..
```

### 5.4 Configure MCP Server OAuth

**For Gmail MCP Server:**
```bash
cd mcp-servers/gmail-mcp-server
cp .env.example .env
nano .env  # Or use your preferred editor
```

Add your Google OAuth credentials:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/google/callback
```

**For Calendar MCP Server:**
```bash
cd ../mcp-google-calendar
cp .env.example .env
nano .env
```

Add your Google OAuth credentials:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/google/callback
```

---

## Step 6: Configure Application (5 min)

### 6.1 Create .env File

```bash
cd /path/to/calendar-availability-system
cp .env.example .env
nano .env
```

### 6.2 Fill in ALL Environment Variables

```env
# Database Configuration
DATABASE_URL=postgresql://calendar_user:your_secure_password@localhost:5432/calendar_availability
DB_HOST=localhost
DB_PORT=5432
DB_NAME=calendar_availability
DB_USER=calendar_user
DB_PASSWORD=your_secure_password

# Server Configuration
PORT=3000
NODE_ENV=development

# MCP Server Paths (USE ABSOLUTE PATHS!)
GMAIL_MCP_SERVER_PATH=/full/path/to/mcp-servers/gmail-mcp-server/build/index.js
CALENDAR_MCP_SERVER_PATH=/full/path/to/mcp-servers/mcp-google-calendar/build/index.js

# Google OAuth2 Credentials (from Step 4)
GOOGLE_CLIENT_ID=your_actual_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_actual_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/google/callback

# Generate session secret
SESSION_SECRET=$(openssl rand -base64 32)

# Logging
LOG_LEVEL=info
```

**IMPORTANT**: Replace all placeholder values with actual values!

---

## Step 7: Run Tests (5 min)

```bash
npm test
```

**Expected Output**: All 17 tests passing ✓

---

## Step 8: Start the Server (2 min)

```bash
npm run dev
```

**Expected Output**:
```
[Server] Server starting...
[Server] Database connected successfully
[Server] Server listening on port 3000
```

### Verify Health Endpoint

```bash
curl http://localhost:3000/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-19T...",
  "version": "0.1.0"
}
```

---

## Step 9: OAuth Authentication Flow (5 min)

### 9.1 Initiate OAuth

Open browser to:
```
http://localhost:3000/oauth/google
```

### 9.2 Grant Permissions

1. Select your Google account
2. Review permissions (Gmail + Calendar access)
3. Click **"Allow"**
4. You'll be redirected back to the app

### 9.3 Verify Token Storage

```bash
psql -U calendar_user -d calendar_availability -c "SELECT id, email FROM users;"
```

You should see your user account listed.

---

## Step 10: Test Autonomous Workflow (Optional - 5 min)

### Create Test User Preferences

```bash
curl -X POST http://localhost:3000/api/automation/settings \
  -H "Content-Type: application/json" \
  -H "x-user-id: your_user_id" \
  -d '{
    "automationEnabled": true,
    "confidenceThreshold": 0.85,
    "workingHoursStart": "09:00",
    "workingHoursEnd": "17:00"
  }'
```

### Check Automation Status

```bash
curl http://localhost:3000/api/automation/settings \
  -H "x-user-id: your_user_id"
```

---

## 🔧 Troubleshooting

### Database Connection Error

**Error**: `ECONNREFUSED` or `password authentication failed`

**Fix**:
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list  # macOS

# Verify credentials
psql -U calendar_user -d calendar_availability
```

### MCP Server Path Error

**Error**: `Cannot find module '/path/to/mcp-servers/...'`

**Fix**:
- Use ABSOLUTE paths in .env file
- Verify build files exist: `ls mcp-servers/gmail-mcp-server/build/index.js`

### OAuth Redirect Mismatch

**Error**: `redirect_uri_mismatch`

**Fix**:
- Ensure redirect URI in Google Cloud Console EXACTLY matches .env file
- No trailing slashes
- Check http vs https

### TypeScript Build Errors

**Error**: `TS2304: Cannot find name...`

**Fix**:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Fix**:
```bash
# Find process using port 3000
lsof -i :3000
# Kill process
kill -9 <PID>
# Or change PORT in .env file
```

---

## 🚀 Production Deployment

For production deployment, see [DEPLOYMENT.md](./DEPLOYMENT.md)

Key changes needed:
- Set `NODE_ENV=production`
- Use proper SSL certificates (https://)
- Update redirect URIs in Google Cloud Console
- Use connection pooling for database
- Set up monitoring and logging
- Enable rate limiting

---

## 📚 Next Steps

1. ✅ **Setup Complete** - System is running
2. 📖 Read [README.md](./README.md) for usage guide
3. 🧪 Review [tests/](./tests/) for examples
4. 📋 Check [PROJECT-STATUS.md](./PROJECT-STATUS.md) for roadmap
5. 🔧 Customize user preferences via API

---

## 🆘 Getting Help

**Issues?** Open a GitHub issue with:
- Error message (full output)
- Steps to reproduce
- Environment (OS, Node version, PostgreSQL version)

**Questions?** Check:
- [.specify/mcp-integration-spec.md](./.specify/mcp-integration-spec.md) - MCP integration details
- [.specify/spec.md](./.specify/spec.md) - Technical specification
- [.specify/phases.md](./.specify/phases.md) - Implementation phases

---

**Setup Complete!** 🎉

Your Calendar Availability System is now ready to autonomously handle scheduling requests.
