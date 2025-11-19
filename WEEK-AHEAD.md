# Week-Ahead Roadmap: Ship Autonomous Scheduling Assistant

**Goal**: Deploy working autonomous email scheduling assistant by Friday  
**Timeline**: 5 days  
**Team Size**: Adjust estimates based on your team  
**Risk Level**: 🟡 Medium (external dependencies: Google OAuth, MCP servers)

---

## 📅 Daily Breakdown

### **Monday: Environment Setup & Validation** ⚙️

**Goal**: Everyone has working development environment  
**Time**: 3-4 hours  
**Owner**: Entire team

#### Morning (2 hours)
- [ ] **9:00am** - Team kickoff meeting
  - Review this roadmap
  - Assign roles (who does OAuth setup, who tests MCP, etc.)
  - Set up team communication channel
  
- [ ] **9:30am** - Individual setup
  ```bash
  git clone <repo>
  git checkout claude/demo-skills-build-spec-01AVcxbkbAhC216AN5T13GC6
  ./scripts/setup.sh
  ```
  - Follow prompts for database setup
  - Takes ~15-20 minutes per person

- [ ] **10:00am** - Validate environments
  ```bash
  ./scripts/validate-env.sh
  ```
  - Fix any red ✗ errors
  - Document any issues in shared doc

#### Afternoon (2 hours)
- [ ] **1:00pm** - Google Cloud setup (parallel work)
  - **Person A**: Create Google Cloud project
  - **Person B**: Enable APIs (Gmail, Calendar)
  - **Person C**: Set up OAuth consent screen
  - See [SETUP.md Step 4](./SETUP.md#step-4-google-cloud-setup-15-min)

- [ ] **2:00pm** - Share OAuth credentials
  - Add GOOGLE_CLIENT_ID to shared secure doc
  - Add GOOGLE_CLIENT_SECRET to shared secure doc
  - Everyone updates .env file

- [ ] **2:30pm** - First run test
  ```bash
  npm run build
  npm test
  npm run dev
  curl http://localhost:3000/health
  ```

#### End of Day Success Criteria ✅
- [ ] All team members have green ✓ from `validate-env.sh`
- [ ] Server starts without errors
- [ ] All 17 unit tests passing
- [ ] Health endpoint returns 200

#### Blockers to Watch 🚨
- **PostgreSQL not running**: `sudo systemctl start postgresql`
- **MCP paths incorrect**: Use absolute paths in .env
- **Google OAuth quota limits**: Use same project for all team members initially

---

### **Tuesday: MCP Integration & OAuth Flow** 🔌

**Goal**: Gmail and Calendar MCP servers connected and authenticated  
**Time**: 4-5 hours  
**Owner**: Backend developers

#### Morning (3 hours)
- [ ] **9:00am** - MCP server configuration
  - Clone MCP servers if setup script didn't work:
    ```bash
    cd mcp-servers
    git clone https://github.com/devdattatalele/gmail-mcp-server.git
    git clone https://github.com/guinacio/mcp-google-calendar.git
    cd gmail-mcp-server && npm install && npm run build
    cd ../mcp-google-calendar && npm install && npm run build
    ```
  
- [ ] **9:30am** - Configure MCP OAuth
  - Add credentials to `mcp-servers/gmail-mcp-server/.env`
  - Add credentials to `mcp-servers/mcp-google-calendar/.env`
  - Test MCP server startup independently

- [ ] **10:30am** - Build OAuth route handler
  - Create `src/routes/oauth.ts`:
    ```typescript
    router.get('/oauth/google', (req, res) => {
      // Redirect to Google OAuth
    });
    
    router.get('/oauth/google/callback', async (req, res) => {
      // Exchange code for tokens
      // Store tokens in database
    });
    ```
  - Add to server.ts

- [ ] **11:30am** - Test OAuth flow
  - Visit http://localhost:3000/oauth/google
  - Grant permissions
  - Verify tokens stored in users table

#### Afternoon (2 hours)
- [ ] **1:00pm** - Test MCP client connections
  ```typescript
  // Quick test script
  import { GmailMCPClient } from './src/services/GmailMCPClient';
  import { GoogleCalendarMCP } from './src/services/GoogleCalendarMCP';
  
  const gmail = new GmailMCPClient();
  await gmail.connect();
  const messages = await gmail.listMessages({ maxResults: 5 });
  console.log('Gmail working:', messages);
  
  const calendar = new GoogleCalendarMCP();
  await calendar.connect();
  const events = await calendar.getEvents(calendarId, new Date(), new Date());
  console.log('Calendar working:', events);
  ```

- [ ] **2:00pm** - Integration debugging
  - Fix any connection issues
  - Check logs for MCP communication
  - Verify data formats match expectations

- [ ] **3:00pm** - Create test user in database
  ```sql
  INSERT INTO users (id, email, full_name) 
  VALUES ('test-user-1', 'your-gmail@gmail.com', 'Test User');
  
  INSERT INTO user_preferences (user_id, automation_enabled, confidence_threshold)
  VALUES ('test-user-1', true, 0.85);
  ```

#### End of Day Success Criteria ✅
- [ ] OAuth flow completes successfully
- [ ] Tokens stored in database
- [ ] Can fetch emails from Gmail MCP
- [ ] Can fetch calendar events from Calendar MCP
- [ ] No MCP connection errors in logs

#### Blockers to Watch 🚨
- **OAuth redirect mismatch**: Check exact URI match in Google Console
- **MCP server won't start**: Check Node version (18+), rebuild
- **Token refresh failures**: Implement refresh token logic
- **Rate limiting**: Google has quotas, use test mode sparingly

---

### **Wednesday: End-to-End Workflow Testing** 🧪

**Goal**: EmailOrchestrator processes real email autonomously  
**Time**: 5-6 hours  
**Owner**: Full team (backend + testing)

#### Morning (3 hours)
- [ ] **9:00am** - Review EmailOrchestrator code
  - Read `src/services/EmailOrchestrator.ts`
  - Understand 11-step workflow
  - Identify any TODOs or incomplete logic

- [ ] **9:30am** - Set up test email scenario
  - Send test email to your Gmail: "When are you available tomorrow at 2pm?"
  - Note the message ID
  - Create test calendar event (conflict scenario)

- [ ] **10:00am** - Manual workflow test
  ```typescript
  // Create test script: scripts/test-workflow.ts
  import { EmailOrchestrator } from '../src/services/EmailOrchestrator';
  
  const orchestrator = new EmailOrchestrator();
  const messageId = 'actual-gmail-message-id';
  const userId = 'test-user-1';
  
  const result = await orchestrator.processIncomingEmail(messageId, userId);
  console.log('Result:', result);
  ```

- [ ] **11:00am** - Debug workflow issues
  - Check each step with logging
  - Verify NLP classification works
  - Confirm confidence scoring
  - Test calendar availability check

#### Afternoon (3 hours)
- [ ] **1:00pm** - Run integration tests
  ```bash
  npm run test:integration
  ```
  - Fix any failing tests
  - Update mocks if real API responses differ

- [ ] **2:00pm** - Test edge cases
  - [ ] Unclear scheduling request (low confidence)
  - [ ] VIP sender (should auto-respond)
  - [ ] Blacklisted sender (should decline)
  - [ ] Calendar conflict (should suggest alternatives)
  - [ ] Circuit breaker triggered (should escalate)

- [ ] **3:30pm** - Verify audit logging
  ```sql
  SELECT * FROM automation_audit_log ORDER BY created_at DESC LIMIT 10;
  ```
  - Check all actions logged
  - Verify decision rationale captured
  - Confirm calendar events recorded

#### End of Day Success Criteria ✅
- [ ] EmailOrchestrator processes test email successfully
- [ ] Correct confidence score calculated
- [ ] Calendar availability checked accurately
- [ ] Response generated in correct tone
- [ ] Email sent through Gmail MCP
- [ ] Audit log entry created
- [ ] Integration tests passing (at least 80%)

#### Blockers to Watch 🚨
- **NLP misclassifies emails**: Tune patterns in NLPIntentClassifier
- **Calendar conflicts not detected**: Check timezone handling
- **Email not sending**: Verify Gmail API permissions (send scope)
- **Database constraint violations**: Check schema matches code

---

### **Thursday: Monitoring, Refinement & Documentation** 📊

**Goal**: Production-ready system with monitoring and updated docs  
**Time**: 4-5 hours  
**Owner**: DevOps + Documentation lead

#### Morning (2 hours)
- [ ] **9:00am** - Add monitoring/logging
  - Set up log aggregation (Winston to file)
  - Add metrics collection (request counts, confidence scores)
  - Create dashboard queries:
    ```sql
    -- Daily stats
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as total_requests,
      COUNT(*) FILTER (WHERE action = 'sent_email') as auto_responded,
      AVG(confidence_score) as avg_confidence
    FROM automation_audit_log
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY DATE(created_at);
    ```

- [ ] **10:00am** - Performance testing
  - Test with 10 emails in quick succession
  - Check response times
  - Monitor database connection pool
  - Look for memory leaks

- [ ] **11:00am** - Security review
  - [ ] No credentials in logs
  - [ ] No SQL injection vulnerabilities (use parameterized queries)
  - [ ] Rate limiting on API endpoints
  - [ ] Input validation on all endpoints
  - [ ] CORS configured correctly

#### Afternoon (2 hours)
- [ ] **1:00pm** - Update documentation
  - Update PROJECT-STATUS.md with what's working
  - Document any deviations from spec
  - Add troubleshooting section for issues found this week

- [ ] **2:00pm** - Create runbook
  - How to restart service
  - How to check logs
  - How to manually override automation
  - Emergency contact procedures

- [ ] **3:00pm** - User acceptance testing prep
  - Create test scenarios document
  - Prepare demo environment
  - Record demo video

#### End of Day Success Criteria ✅
- [ ] Logging works end-to-end
- [ ] Performance acceptable (<2s per email)
- [ ] Security checklist completed
- [ ] Documentation updated
- [ ] Runbook created for ops team

#### Blockers to Watch 🚨
- **Memory leaks**: Check for unclosed connections
- **Slow queries**: Add database indexes
- **Log storage**: Configure log rotation

---

### **Friday: Deployment & Handoff** 🚀

**Goal**: System running in production with team trained  
**Time**: 3-4 hours  
**Owner**: DevOps + PM

#### Morning (2 hours)
- [ ] **9:00am** - Pre-deployment checklist
  - [ ] All tests passing
  - [ ] No console.log statements
  - [ ] Environment variables documented
  - [ ] Database backups configured
  - [ ] Rollback plan documented

- [ ] **9:30am** - Deploy to staging/production
  ```bash
  # Build production bundle
  npm run build
  
  # Set NODE_ENV=production in .env
  
  # Start with PM2 (process manager)
  npm install -g pm2
  pm2 start dist/server.js --name calendar-availability
  pm2 save
  pm2 startup  # Configure auto-restart
  ```

- [ ] **10:30am** - Smoke tests in production
  - Visit /health endpoint
  - Test OAuth flow
  - Process one test email
  - Check logs

#### Afternoon (2 hours)
- [ ] **1:00pm** - Team training session
  - Demo the system
  - Walk through API endpoints
  - Show audit log interface
  - Explain how to override automation
  - Q&A

- [ ] **2:00pm** - Monitoring setup
  - Configure uptime monitoring
  - Set up alerts (email/Slack)
  - Create status page

- [ ] **2:30pm** - Retrospective
  - What went well?
  - What was harder than expected?
  - What would we do differently?
  - Action items for next sprint

- [ ] **3:00pm** - 🎉 Celebrate!

#### End of Day Success Criteria ✅
- [ ] System running in production
- [ ] At least 1 real email processed autonomously
- [ ] Team trained on system usage
- [ ] Monitoring/alerts configured
- [ ] Documentation complete

#### Blockers to Watch 🚨
- **Production environment different**: Test thoroughly in staging first
- **Google OAuth consent pending**: Use test mode initially
- **Database migration issues**: Have rollback SQL ready

---

## 📊 Daily Standup Template

Use this every morning (15 min max):

```
Yesterday:
- What did I complete?
- What blockers did I hit?

Today:
- What am I working on?
- Do I need help with anything?

Blockers:
- What's preventing progress?
- Who can unblock me?
```

---

## 🚨 Contingency Plans

### If Google OAuth Takes Too Long
**Fallback**: Hard-code test tokens temporarily
```typescript
// TEMPORARY - for testing only
const TEST_TOKENS = {
  access_token: 'ya29.a0...',
  refresh_token: '1//...'
};
```

### If MCP Servers Don't Work
**Fallback**: Create mock services that return fake data
```typescript
class MockGmailMCPClient {
  async getMessage(id: string) {
    return {
      payload: {
        headers: [
          { name: 'Subject', value: 'Test Meeting' },
          { name: 'From', value: 'test@example.com' }
        ],
        body: { data: Buffer.from('When are you available?').toString('base64') }
      },
      threadId: 'test-thread'
    };
  }
}
```

### If Integration Tests Fail
**Fallback**: Focus on unit tests + manual testing
- Get core logic working
- Defer full integration until next week

### If Database Issues
**Fallback**: Use in-memory storage temporarily
```typescript
const inMemoryStore = new Map();
// Replace database queries with Map operations
```

---

## ✅ Definition of Done

By Friday EOD, we have:
1. ✅ System deployed and accessible
2. ✅ At least 1 real autonomous email processed
3. ✅ All critical paths tested
4. ✅ Team trained on usage
5. ✅ Documentation complete and accurate
6. ✅ Monitoring and alerts configured
7. ✅ Rollback plan documented

---

## 📞 Who to Ask for Help

**Google OAuth issues**: [Link to Google Cloud docs]  
**PostgreSQL issues**: [DBA contact or Stack Overflow]  
**MCP server issues**: [GitHub Issues on respective repos]  
**TypeScript/Node.js**: [Team's senior dev]  
**General architecture**: [This codebase CONTRIBUTING.md]

---

## 🎯 Success Metrics

Track these daily:
- **Environment setup**: % of team with working env
- **Tests passing**: Unit + integration test count
- **Blockers**: Number of blockers identified and resolved
- **Code coverage**: Aim for 70%+ by Friday
- **Deployment readiness**: Red/Yellow/Green status

---

**Remember**: Done is better than perfect. Ship something working this week, iterate next week. 🚀
