// Unit tests for Confidence Scoring Engine
// Article III: Test-First Imperative

import { ConfidenceScorer } from '../../src/services/ConfidenceScorer';
import {
  EmailClassification,
  ScoringContext,
  UserPreferences,
  SenderHistory
} from '../../src/types';

describe('ConfidenceScorer', () => {
  let scorer: ConfidenceScorer;
  let mockUserPreferences: UserPreferences;

  beforeEach(() => {
    scorer = new ConfidenceScorer();
    mockUserPreferences = {
      id: 'user-1',
      userId: 'user-1',
      workingHoursStart: '09:00',
      workingHoursEnd: '17:00',
      bufferMinutes: 15,
      defaultMeetingDuration: 30,
      automationEnabled: true,
      confidenceThreshold: 0.85,
      vipWhitelist: ['vip@example.com'],
      blacklist: ['spam@example.com'],
      notificationChannels: { email: true, push: false, sms: false },
      circuitBreakerConfig: { maxLowConfidence: 5, cooldownMinutes: 60 },
      learningEnabled: true,
      responseTone: 'professional',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  describe('High Confidence Scenarios', () => {
    it('should score high confidence for clear scheduling request with known sender', async () => {
      const classification: EmailClassification = {
        isSchedulingRequest: true,
        confidence: 0.95,
        intent: 'schedule_meeting',
        proposedTimes: [
          { start: new Date('2025-11-20T14:00:00Z'), end: new Date('2025-11-20T15:00:00Z') }
        ],
        participants: ['user@example.com', 'sender@example.com'],
        requestType: 'initial',
        urgency: 'medium',
        threadId: 'thread-123',
        messageId: 'msg-123',
        from: 'sender@example.com',
        subject: 'Meeting Request',
        rawText: 'Can we meet tomorrow at 2pm?'
      };

      const senderHistory: SenderHistory = {
        email: 'sender@example.com',
        totalEmails: 20,
        schedulingRequests: 5,
        successfulSchedules: 5,
        lastInteraction: new Date(),
        trustLevel: 'trusted'
      };

      const context: ScoringContext = {
        classification,
        senderHistory,
        userPreferences: mockUserPreferences
      };

      const assessment = await scorer.assess(context);

      expect(assessment.overallConfidence).toBeGreaterThanOrEqual(0.85);
      expect(assessment.recommendation).toBe('auto_respond');
      expect(assessment.intentConfidence).toBeGreaterThanOrEqual(0.9);
      expect(assessment.senderTrustScore).toBeGreaterThanOrEqual(0.7);
    });

    it('should score maximum confidence for VIP whitelist sender', async () => {
      const classification: EmailClassification = {
        isSchedulingRequest: true,
        confidence: 0.9,
        intent: 'schedule_meeting',
        proposedTimes: [
          { start: new Date('2025-11-20T14:00:00Z'), end: new Date('2025-11-20T15:00:00Z') }
        ],
        participants: [],
        requestType: 'initial',
        urgency: 'medium',
        threadId: 'thread-vip',
        messageId: 'msg-vip',
        from: 'vip@example.com',
        rawText: 'Meeting request'
      };

      const context: ScoringContext = {
        classification,
        userPreferences: mockUserPreferences
      };

      const assessment = await scorer.assess(context);

      expect(assessment.senderTrustScore).toBe(1.0);
      expect(assessment.overallConfidence).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe('Low Confidence Scenarios', () => {
    it('should score low confidence for blacklisted sender', async () => {
      const classification: EmailClassification = {
        isSchedulingRequest: true,
        confidence: 0.9,
        intent: 'schedule_meeting',
        proposedTimes: [],
        participants: [],
        requestType: 'initial',
        urgency: 'medium',
        threadId: 'thread-spam',
        messageId: 'msg-spam',
        from: 'spam@example.com',
        rawText: 'Meeting request'
      };

      const context: ScoringContext = {
        classification,
        userPreferences: mockUserPreferences
      };

      const assessment = await scorer.assess(context);

      expect(assessment.senderTrustScore).toBe(0.0);
      expect(assessment.recommendation).not.toBe('auto_respond');
    });

    it('should score low confidence for ambiguous request without time slots', async () => {
      const classification: EmailClassification = {
        isSchedulingRequest: true,
        confidence: 0.6,
        intent: 'unclear',
        proposedTimes: [],
        participants: [],
        requestType: 'initial',
        urgency: 'low',
        threadId: 'thread-unclear',
        messageId: 'msg-unclear',
        from: 'unknown@example.com',
        rawText: 'Maybe we should meet sometime?'
      };

      const context: ScoringContext = {
        classification,
        userPreferences: mockUserPreferences
      };

      const assessment = await scorer.assess(context);

      expect(assessment.overallConfidence).toBeLessThan(0.7);
      expect(assessment.recommendation).toBe('decline');
    });

    it('should score medium confidence for unknown sender with clear intent', async () => {
      const classification: EmailClassification = {
        isSchedulingRequest: true,
        confidence: 0.9,
        intent: 'schedule_meeting',
        proposedTimes: [
          { start: new Date('2025-11-20T14:00:00Z'), end: new Date('2025-11-20T15:00:00Z') }
        ],
        participants: [],
        requestType: 'initial',
        urgency: 'medium',
        threadId: 'thread-new',
        messageId: 'msg-new',
        from: 'newperson@example.com',
        rawText: 'Can we meet tomorrow at 2pm?'
      };

      const context: ScoringContext = {
        classification,
        senderHistory: {
          email: 'newperson@example.com',
          totalEmails: 0,
          schedulingRequests: 0,
          successfulSchedules: 0,
          trustLevel: 'unknown'
        },
        userPreferences: mockUserPreferences
      };

      const assessment = await scorer.assess(context);

      expect(assessment.overallConfidence).toBeGreaterThan(0.7);
      expect(assessment.overallConfidence).toBeLessThan(0.85);
      expect(assessment.recommendation).toBe('request_approval');
    });
  });

  describe('Edge Cases', () => {
    it('should handle confirmation requests with high clarity', async () => {
      const classification: EmailClassification = {
        isSchedulingRequest: true,
        confidence: 0.95,
        intent: 'confirm_meeting',
        proposedTimes: [],
        participants: [],
        requestType: 'confirmation',
        urgency: 'medium',
        threadId: 'thread-confirm',
        messageId: 'msg-confirm',
        from: 'sender@example.com',
        rawText: 'Tuesday at 2pm works for me'
      };

      const senderHistory: SenderHistory = {
        email: 'sender@example.com',
        totalEmails: 15,
        schedulingRequests: 3,
        successfulSchedules: 3,
        lastInteraction: new Date(),
        trustLevel: 'trusted'
      };

      const context: ScoringContext = {
        classification,
        senderHistory,
        conversation: {
          id: 'conv-1',
          threadId: 'thread-confirm',
          userId: 'user-1',
          state: 'availability_sent',
          turnCount: 2,
          currentRequestId: 'req-1',
          previousRequestIds: [],
          context: {},
          lastActivity: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        userPreferences: mockUserPreferences
      };

      const assessment = await scorer.assess(context);

      expect(assessment.conversationClarity).toBeGreaterThanOrEqual(0.9);
      expect(assessment.senderTrustScore).toBeGreaterThanOrEqual(0.75);
      expect(assessment.overallConfidence).toBeGreaterThanOrEqual(0.85);
    });
  });
});
