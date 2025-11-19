// Integration tests for EmailOrchestrator
// Tests the complete autonomous workflow with mocked external dependencies

import { EmailOrchestrator } from '../../src/services/EmailOrchestrator';
import { query } from '../../src/utils/database';

// Mock external MCP clients
jest.mock('../../src/services/GmailMCPClient');
jest.mock('../../src/services/GoogleCalendarMCP');

describe('EmailOrchestrator Integration Tests', () => {
  let orchestrator: EmailOrchestrator;
  const testUserId = 'test-user-integration';
  const testMessageId = 'test-msg-123';

  beforeAll(async () => {
    // Initialize test database (assumes schema is already created)
    // In real setup, you'd use a test database
  });

  beforeEach(() => {
    orchestrator = new EmailOrchestrator();
  });

  afterEach(async () => {
    // Clean up test data
    await query('DELETE FROM automation_audit_log WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM confidence_assessments WHERE request_id IN (SELECT id FROM availability_requests WHERE user_id = $1)', [testUserId]);
    await query('DELETE FROM availability_requests WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM conversation_states WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM user_preferences WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  describe('End-to-End Autonomous Workflow', () => {
    it('should process scheduling request and auto-respond when confidence is high', async () => {
      // Setup: Create test user with automation enabled
      await query(
        `INSERT INTO users (id, email, full_name) VALUES ($1, $2, $3)`,
        [testUserId, 'test@example.com', 'Test User']
      );

      await query(
        `INSERT INTO user_preferences (user_id, automation_enabled, confidence_threshold, working_hours_start, working_hours_end)
         VALUES ($1, true, 0.85, '09:00', '17:00')`,
        [testUserId]
      );

      // Mock Gmail response with clear scheduling request
      const mockGmailClient = require('../../src/services/GmailMCPClient');
      mockGmailClient.GmailMCPClient.prototype.getMessage.mockResolvedValue({
        payload: {
          headers: [
            { name: 'Subject', value: 'Meeting Request' },
            { name: 'From', value: 'sender@example.com' }
          ],
          body: {
            data: Buffer.from('When are you available tomorrow at 2pm for a meeting?').toString('base64')
          }
        },
        threadId: 'thread-123'
      });

      // Mock Calendar response (user is available)
      const mockCalendarMCP = require('../../src/services/GoogleCalendarMCP');
      mockCalendarMCP.GoogleCalendarMCP.prototype.getFreeBusySlots.mockResolvedValue({
        free: [
          {
            start: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            end: new Date(Date.now() + 25 * 60 * 60 * 1000)
          }
        ],
        busy: []
      });

      // Mock email sending
      mockGmailClient.GmailMCPClient.prototype.sendMessage.mockResolvedValue({
        id: 'sent-msg-123'
      });

      // Execute
      const result = await orchestrator.processIncomingEmail(testMessageId, testUserId);

      // Assertions
      expect(result.action).toBe('auto_responded');
      expect(result.emailSent).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      expect(result.auditId).toBeDefined();

      // Verify audit log entry was created
      const auditLog = await query(
        'SELECT * FROM automation_audit_log WHERE user_id = $1',
        [testUserId]
      );
      expect(auditLog.rows.length).toBe(1);
      expect(auditLog.rows[0].action).toBe('sent_email');
    });

    it('should escalate to user when confidence is below threshold', async () => {
      // Setup user
      await query(
        `INSERT INTO users (id, email, full_name) VALUES ($1, $2, $3)`,
        [testUserId, 'test@example.com', 'Test User']
      );

      await query(
        `INSERT INTO user_preferences (user_id, automation_enabled, confidence_threshold)
         VALUES ($1, true, 0.85)`,
        [testUserId]
      );

      // Mock unclear scheduling request
      const mockGmailClient = require('../../src/services/GmailMCPClient');
      mockGmailClient.GmailMCPClient.prototype.getMessage.mockResolvedValue({
        payload: {
          headers: [
            { name: 'Subject', value: 'Quick question' },
            { name: 'From', value: 'unknown@example.com' }
          ],
          body: {
            data: Buffer.from('Maybe we could meet sometime?').toString('base64')
          }
        },
        threadId: 'thread-456'
      });

      // Execute
      const result = await orchestrator.processIncomingEmail(testMessageId, testUserId);

      // Assertions
      expect(result.action).toBe('pending_approval');
      expect(result.confidence).toBeLessThan(0.85);
      expect(result.emailSent).toBeUndefined();
    });

    it('should respect automation disabled setting', async () => {
      // Setup user with automation DISABLED
      await query(
        `INSERT INTO users (id, email, full_name) VALUES ($1, $2, $3)`,
        [testUserId, 'test@example.com', 'Test User']
      );

      await query(
        `INSERT INTO user_preferences (user_id, automation_enabled)
         VALUES ($1, false)`,
        [testUserId]
      );

      // Mock clear scheduling request
      const mockGmailClient = require('../../src/services/GmailMCPClient');
      mockGmailClient.GmailMCPClient.prototype.getMessage.mockResolvedValue({
        payload: {
          headers: [
            { name: 'Subject', value: 'Meeting Request' },
            { name: 'From', value: 'sender@example.com' }
          ],
          body: {
            data: Buffer.from('When are you available tomorrow at 2pm?').toString('base64')
          }
        },
        threadId: 'thread-789'
      });

      // Execute
      const result = await orchestrator.processIncomingEmail(testMessageId, testUserId);

      // Assertions
      expect(result.action).toBe('pending_approval');
      expect(result.reason).toBe('Automation disabled');
    });

    it('should respect circuit breaker when open', async () => {
      // Setup user
      await query(
        `INSERT INTO users (id, email, full_name) VALUES ($1, $2, $3)`,
        [testUserId, 'test@example.com', 'Test User']
      );

      await query(
        `INSERT INTO user_preferences (user_id, automation_enabled)
         VALUES ($1, true)`,
        [testUserId]
      );

      // Set circuit breaker to OPEN
      await query(
        `INSERT INTO circuit_breaker_state (user_id, state, consecutive_low_confidence)
         VALUES ($1, 'open', 5)`,
        [testUserId]
      );

      // Mock request
      const mockGmailClient = require('../../src/services/GmailMCPClient');
      mockGmailClient.GmailMCPClient.prototype.getMessage.mockResolvedValue({
        payload: {
          headers: [
            { name: 'Subject', value: 'Meeting' },
            { name: 'From', value: 'sender@example.com' }
          ],
          body: {
            data: Buffer.from('Meeting request').toString('base64')
          }
        },
        threadId: 'thread-cb'
      });

      // Execute
      const result = await orchestrator.processIncomingEmail(testMessageId, testUserId);

      // Assertions
      expect(result.action).toBe('pending_approval');
      expect(result.reason).toBe('Circuit breaker activated');
      expect(result.confidence).toBe(0);
    });

    it('should handle VIP whitelist correctly', async () => {
      // Setup user with VIP
      await query(
        `INSERT INTO users (id, email, full_name) VALUES ($1, $2, $3)`,
        [testUserId, 'test@example.com', 'Test User']
      );

      await query(
        `INSERT INTO user_preferences (user_id, automation_enabled, confidence_threshold, vip_whitelist)
         VALUES ($1, true, 0.85, ARRAY['vip@example.com'])`,
        [testUserId]
      );

      // Mock request from VIP
      const mockGmailClient = require('../../src/services/GmailMCPClient');
      mockGmailClient.GmailMCPClient.prototype.getMessage.mockResolvedValue({
        payload: {
          headers: [
            { name: 'Subject', value: 'Quick sync' },
            { name: 'From', value: 'vip@example.com' }
          ],
          body: {
            data: Buffer.from('Can we meet?').toString('base64')
          }
        },
        threadId: 'thread-vip'
      });

      const mockCalendarMCP = require('../../src/services/GoogleCalendarMCP');
      mockCalendarMCP.GoogleCalendarMCP.prototype.getFreeBusySlots.mockResolvedValue({
        free: [
          {
            start: new Date(Date.now() + 24 * 60 * 60 * 1000),
            end: new Date(Date.now() + 25 * 60 * 60 * 1000)
          }
        ],
        busy: []
      });

      mockGmailClient.GmailMCPClient.prototype.sendMessage.mockResolvedValue({
        id: 'sent-vip-123'
      });

      // Execute
      const result = await orchestrator.processIncomingEmail(testMessageId, testUserId);

      // VIP should boost confidence significantly
      expect(result.action).toBe('auto_responded');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe('Error Handling', () => {
    it('should handle Gmail API errors gracefully', async () => {
      const mockGmailClient = require('../../src/services/GmailMCPClient');
      mockGmailClient.GmailMCPClient.prototype.getMessage.mockRejectedValue(
        new Error('Gmail API error')
      );

      const result = await orchestrator.processIncomingEmail(testMessageId, testUserId);

      expect(result.action).toBe('error');
      expect(result.error).toContain('Gmail API error');
    });

    it('should handle database errors gracefully', async () => {
      // Non-existent user should cause database error
      const result = await orchestrator.processIncomingEmail(testMessageId, 'non-existent-user');

      expect(result.action).toBe('error');
      expect(result.error).toBeDefined();
    });
  });

  describe('Conversation State Management', () => {
    it('should track multi-turn conversations', async () => {
      // Setup user
      await query(
        `INSERT INTO users (id, email) VALUES ($1, $2)`,
        [testUserId, 'test@example.com']
      );

      await query(
        `INSERT INTO user_preferences (user_id, automation_enabled) VALUES ($1, true)`,
        [testUserId]
      );

      // First message
      const mockGmailClient = require('../../src/services/GmailMCPClient');
      mockGmailClient.GmailMCPClient.prototype.getMessage.mockResolvedValue({
        payload: {
          headers: [
            { name: 'Subject', value: 'Meeting' },
            { name: 'From', value: 'sender@example.com' }
          ],
          body: {
            data: Buffer.from('When are you available?').toString('base64')
          }
        },
        threadId: 'thread-conv-1'
      });

      const mockCalendarMCP = require('../../src/services/GoogleCalendarMCP');
      mockCalendarMCP.GoogleCalendarMCP.prototype.getFreeBusySlots.mockResolvedValue({
        free: [{ start: new Date(), end: new Date() }],
        busy: []
      });

      mockGmailClient.GmailMCPClient.prototype.sendMessage.mockResolvedValue({ id: 'sent-1' });

      await orchestrator.processIncomingEmail('msg-1', testUserId);

      // Check conversation state was created
      const conversations = await query(
        'SELECT * FROM conversation_states WHERE thread_id = $1',
        ['thread-conv-1']
      );

      expect(conversations.rows.length).toBe(1);
      expect(conversations.rows[0].state).toBe('availability_sent');
      expect(conversations.rows[0].turn_count).toBe(1);
    });
  });
});
