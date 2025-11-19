# MCP Integration Specification - Google Calendar & Gmail
**Version**: 1.0.0
**Created**: 2025-11-19
**Purpose**: Detailed specifications for integrating Google Calendar and Gmail via Model Context Protocol (MCP) servers

---

## Executive Summary

Based on research of available MCP server implementations, we have identified the best MCP servers for Google Calendar and Gmail integration. This document provides complete specifications for integration.

---

## Recommended MCP Servers

### 1. Google Calendar MCP Server

**Recommended Implementation**: `guinacio/mcp-google-calendar`
**Repository**: https://github.com/guinacio/mcp-google-calendar
**Language**: TypeScript/Node.js
**License**: MIT

**Why This One**:
- ✅ Built specifically for AI assistants (Claude-compatible)
- ✅ Comprehensive OAuth2 support
- ✅ Availability checking built-in
- ✅ Active development (2025)
- ✅ Full CRUD operations on events

**Alternative**: `markelaugust74/mcp-google-calendar` (also excellent, similar features)

### 2. Gmail MCP Server

**Recommended Implementation**: `devdattatalele/gmail-mcp-server`
**Repository**: https://github.com/devdattatalele/gmail-mcp-server
**Language**: TypeScript/Node.js
**License**: MIT

**Why This One**:
- ✅ Robust OAuth2 with automatic token refresh
- ✅ Email monitoring capabilities
- ✅ Send/receive/search functionality
- ✅ Attachment support
- ✅ Thread management

**Alternative**: `GongRzhe/Gmail-MCP-Server` (auto-authentication support)

---

## Installation & Setup

### Google Calendar MCP

```bash
# Install the MCP server
npm install @guinacio/mcp-google-calendar

# Or clone repository
git clone https://github.com/guinacio/mcp-google-calendar.git
cd mcp-google-calendar
npm install
npm run build
```

### Gmail MCP

```bash
# Install the MCP server
npm install @devdattatalele/gmail-mcp-server

# Or clone repository
git clone https://github.com/devdattatalele/gmail-mcp-server.git
cd gmail-mcp-server
npm install
npm run build
```

---

## OAuth2 Configuration

### Google Cloud Console Setup

**Prerequisites**: Google Cloud Project with Calendar and Gmail APIs enabled

1. **Create OAuth2 Credentials**:
   ```
   Google Cloud Console → APIs & Services → Credentials
   → Create Credentials → OAuth 2.0 Client ID
   → Application Type: Web Application
   ```

2. **Configure Redirect URIs**:
   ```
   Authorized redirect URIs:
   - http://localhost:3000/oauth/callback
   - https://your-domain.com/oauth/callback
   ```

3. **Required Scopes**:
   ```
   Google Calendar:
   - https://www.googleapis.com/auth/calendar.readonly
   - https://www.googleapis.com/auth/calendar.events

   Gmail:
   - https://www.googleapis.com/auth/gmail.readonly
   - https://www.googleapis.com/auth/gmail.send
   - https://www.googleapis.com/auth/gmail.modify
   ```

4. **Download Credentials**:
   - Download `credentials.json` file
   - Store securely (DO NOT commit to git)

### Environment Variables

Create `.env` file:

```env
# Google OAuth2
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback

# Token Storage
GOOGLE_TOKEN_PATH=./tokens/google-tokens.json

# MCP Server Ports
CALENDAR_MCP_PORT=3001
GMAIL_MCP_PORT=3002
```

---

## API Capabilities

### Google Calendar MCP - Available Tools

#### 1. **list_calendars**
List all calendars accessible to the user.

```typescript
interface ListCalendarsInput {}

interface ListCalendarsOutput {
  calendars: Array<{
    id: string;
    summary: string;
    primary: boolean;
    accessRole: string;
  }>;
}
```

#### 2. **list_events**
List events within a time range.

```typescript
interface ListEventsInput {
  calendarId: string;
  timeMin: string; // ISO 8601
  timeMax: string; // ISO 8601
  maxResults?: number;
}

interface ListEventsOutput {
  events: Array<{
    id: string;
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    status: string;
    attendees?: Array<{ email: string; responseStatus: string }>;
  }>;
}
```

#### 3. **create_event**
Create a new calendar event.

```typescript
interface CreateEventInput {
  calendarId: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: Array<{ email: string }>;
  location?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: string; minutes: number }>;
  };
}

interface CreateEventOutput {
  event: CalendarEvent;
  htmlLink: string;
}
```

#### 4. **update_event**
Update an existing event.

```typescript
interface UpdateEventInput {
  calendarId: string;
  eventId: string;
  // Same fields as CreateEventInput
}
```

#### 5. **delete_event**
Delete a calendar event.

```typescript
interface DeleteEventInput {
  calendarId: string;
  eventId: string;
}
```

#### 6. **get_free_busy**
Check availability for given time ranges.

```typescript
interface GetFreeBusyInput {
  timeMin: string;
  timeMax: string;
  items: Array<{ id: string }>; // Calendar IDs to check
}

interface GetFreeBusyOutput {
  calendars: {
    [calendarId: string]: {
      busy: Array<{
        start: string;
        end: string;
      }>;
    };
  };
}
```

### Gmail MCP - Available Tools

#### 1. **list_messages**
List messages in mailbox.

```typescript
interface ListMessagesInput {
  query?: string; // Gmail search query
  maxResults?: number;
  labelIds?: string[]; // e.g., ['INBOX', 'UNREAD']
}

interface ListMessagesOutput {
  messages: Array<{
    id: string;
    threadId: string;
    snippet: string;
    labelIds: string[];
    internalDate: string;
  }>;
  nextPageToken?: string;
}
```

#### 2. **get_message**
Get full message details.

```typescript
interface GetMessageInput {
  messageId: string;
  format?: 'full' | 'metadata' | 'minimal';
}

interface GetMessageOutput {
  id: string;
  threadId: string;
  labelIds: string[];
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data: string }; // Base64 encoded
    parts?: Array<any>; // For multipart messages
  };
}
```

#### 3. **send_message**
Send an email.

```typescript
interface SendMessageInput {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string; // Plain text or HTML
  threadId?: string; // For replies
  attachments?: Array<{
    filename: string;
    mimeType: string;
    data: string; // Base64 encoded
  }>;
}

interface SendMessageOutput {
  id: string;
  threadId: string;
  labelIds: string[];
}
```

#### 4. **search_messages**
Advanced email search.

```typescript
interface SearchMessagesInput {
  query: string; // Gmail search syntax
  // Examples:
  // - "from:sender@example.com"
  // - "subject:meeting after:2025/11/01"
  // - "has:attachment is:unread"
}
```

#### 5. **create_draft**
Create a draft email.

```typescript
interface CreateDraftInput {
  // Same as SendMessageInput
}
```

#### 6. **watch_inbox**
Set up push notifications for inbox changes.

```typescript
interface WatchInboxInput {
  labelIds?: string[];
  webhookUrl: string;
}

interface WatchInboxOutput {
  historyId: string;
  expiration: string; // Unix timestamp
}
```

---

## Integration Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────┐
│                   Our Application                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Email Orchestrator                       │  │
│  └────────┬─────────────────────────┬────────────────┘  │
│           │                         │                   │
│           ▼                         ▼                   │
│  ┌─────────────────┐       ┌──────────────────┐       │
│  │  Gmail MCP      │       │ Calendar MCP     │       │
│  │  Client Wrapper │       │ Client Wrapper   │       │
│  └────────┬────────┘       └────────┬─────────┘       │
└───────────┼─────────────────────────┼──────────────────┘
            │                         │
            ▼                         ▼
   ┌────────────────────┐    ┌────────────────────┐
   │  Gmail MCP Server  │    │ Calendar MCP Server│
   │  (Port 3002)       │    │ (Port 3001)        │
   └────────┬───────────┘    └────────┬───────────┘
            │                         │
            ▼                         ▼
   ┌────────────────────┐    ┌────────────────────┐
   │  Gmail API         │    │ Calendar API       │
   │  (Google)          │    │ (Google)           │
   └────────────────────┘    └────────────────────┘
```

### MCP Communication Protocol

**Transport**: stdio or HTTP
**Format**: JSON-RPC 2.0

#### Request Format
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "list_events",
    "arguments": {
      "calendarId": "primary",
      "timeMin": "2025-11-19T00:00:00Z",
      "timeMax": "2025-11-26T00:00:00Z"
    }
  }
}
```

#### Response Format
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "events": [
      {
        "id": "evt123",
        "summary": "Team Meeting",
        "start": { "dateTime": "2025-11-20T14:00:00Z" },
        "end": { "dateTime": "2025-11-20T15:00:00Z" }
      }
    ]
  }
}
```

---

## Implementation Guide for Your Team

### Step 1: Start MCP Servers

Create `scripts/start-mcp-servers.sh`:

```bash
#!/bin/bash

# Start Calendar MCP Server
cd /path/to/mcp-google-calendar
npm start -- --port 3001 &
CALENDAR_PID=$!

# Start Gmail MCP Server
cd /path/to/gmail-mcp-server
npm start -- --port 3002 &
GMAIL_PID=$!

echo "Calendar MCP Server PID: $CALENDAR_PID"
echo "Gmail MCP Server PID: $GMAIL_PID"

# Save PIDs for cleanup
echo $CALENDAR_PID > /tmp/calendar-mcp.pid
echo $GMAIL_PID > /tmp/gmail-mcp.pid
```

### Step 2: Create MCP Client Wrappers

**Calendar MCP Client** (`src/services/CalendarMCPClient.ts`):

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class CalendarMCPClient {
  private client: Client;

  async connect() {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['/path/to/mcp-google-calendar/build/index.js']
    });

    this.client = new Client({
      name: 'calendar-availability-system',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await this.client.connect(transport);
  }

  async listEvents(calendarId: string, timeMin: string, timeMax: string) {
    const result = await this.client.callTool({
      name: 'list_events',
      arguments: { calendarId, timeMin, timeMax }
    });
    return result.content;
  }

  // ... other methods
}
```

**Gmail MCP Client** (`src/services/GmailMCPClient.ts`):

```typescript
export class GmailMCPClient {
  private client: Client;

  async connect() {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['/path/to/gmail-mcp-server/build/index.js']
    });

    this.client = new Client({
      name: 'calendar-availability-system',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await this.client.connect(transport);
  }

  async listMessages(query?: string, maxResults?: number) {
    const result = await this.client.callTool({
      name: 'list_messages',
      arguments: { query, maxResults }
    });
    return result.content;
  }

  async sendMessage(to: string[], subject: string, body: string, threadId?: string) {
    const result = await this.client.callTool({
      name: 'send_message',
      arguments: { to, subject, body, threadId }
    });
    return result.content;
  }

  // ... other methods
}
```

### Step 3: OAuth2 Flow

**Authorization URL** (`src/routes/oauth.ts`):

```typescript
router.get('/oauth/google/authorize', (req, res) => {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(
      'https://www.googleapis.com/auth/calendar.events ' +
      'https://www.googleapis.com/auth/gmail.readonly ' +
      'https://www.googleapis.com/auth/gmail.send'
    )}&` +
    `access_type=offline&` +
    `prompt=consent`;

  res.redirect(authUrl);
});
```

**Callback Handler**:

```typescript
router.get('/oauth/google/callback', async (req, res) => {
  const { code } = req.query;

  // Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    })
  });

  const tokens = await tokenResponse.json();

  // Store tokens securely
  await storeUserTokens(userId, tokens);

  res.redirect('/dashboard?auth=success');
});
```

---

## Testing Guide

### Manual Testing

**1. Test Calendar Connection**:
```bash
curl -X POST http://localhost:3001/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tools/call",
    "params": {
      "name": "list_calendars",
      "arguments": {}
    }
  }'
```

**2. Test Gmail Connection**:
```bash
curl -X POST http://localhost:3002/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tools/call",
    "params": {
      "name": "list_messages",
      "arguments": { "maxResults": 5 }
    }
  }'
```

### Integration Tests

Create `tests/integration/mcp-integration.test.ts`:

```typescript
describe('MCP Integration', () => {
  it('should fetch calendar events', async () => {
    const client = new CalendarMCPClient();
    await client.connect();

    const events = await client.listEvents(
      'primary',
      '2025-11-19T00:00:00Z',
      '2025-11-26T00:00:00Z'
    );

    expect(events).toBeDefined();
    expect(Array.isArray(events)).toBe(true);
  });

  it('should send email via Gmail MCP', async () => {
    const client = new GmailMCPClient();
    await client.connect();

    const result = await client.sendMessage(
      ['test@example.com'],
      'Test Subject',
      'Test body'
    );

    expect(result.id).toBeDefined();
  });
});
```

---

## Security Considerations

### 1. Token Storage
- ✅ Store OAuth tokens encrypted in database
- ✅ Use separate encryption key (not in git)
- ✅ Implement token rotation
- ✅ Monitor for suspicious access patterns

### 2. API Rate Limiting
- Google Calendar API: 1,000,000 queries/day
- Gmail API: 250 quota units/user/second
- Implement exponential backoff on 429 errors

### 3. Scope Management
- Request minimum required scopes
- Explain why each scope is needed
- Allow users to revoke access

---

## Troubleshooting

### Common Issues

**1. "Invalid grant" error**:
- Token expired - refresh token flow needed
- User revoked access - re-authenticate

**2. MCP server not responding**:
- Check server logs: `tail -f /var/log/mcp-calendar.log`
- Verify port not in use: `lsof -i :3001`

**3. OAuth redirect mismatch**:
- Ensure redirect URI matches exactly in Google Console
- Check for trailing slashes

---

## Next Steps for Team

1. ✅ **Week 1**: Set up Google Cloud Project, create OAuth credentials
2. ✅ **Week 2**: Install and configure MCP servers locally
3. ✅ **Week 3**: Build MCP client wrappers in our codebase
4. ✅ **Week 4**: Implement OAuth flow and test end-to-end

---

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Recommended Calendar MCP](https://github.com/guinacio/mcp-google-calendar)
- [Recommended Gmail MCP](https://github.com/devdattatalele/gmail-mcp-server)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-19
**Maintained By**: Development Team
