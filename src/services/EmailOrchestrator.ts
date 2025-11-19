// Email Orchestrator - PRIMARY component for autonomous scheduling
// Coordinates NLP, confidence scoring, calendar checks, and email sending

import { createLogger } from '../utils/logger';
import { ConfidenceScorer } from './ConfidenceScorer';
import { NLPIntentClassifier } from './NLPIntentClassifier';
import { ConversationStateManager } from './ConversationStateManager';
import { AvailabilityService } from './AvailabilityService';
import { ResponseGenerator } from './ResponseGenerator';
import { AutomationAuditLogger } from './AutomationAuditLogger';
import { UserPreferencesManager } from './UserPreferencesManager';
import { CircuitBreaker } from './CircuitBreaker';
import { GmailMCPClient } from './GmailMCPClient';
import { GoogleCalendarMCP } from './GoogleCalendarMCP';
import {
  EmailClassification,
  OrchestratorResult,
  UserPreferences,
  ScoringContext,
  ConfidenceAssessment
} from '../types';

const logger = createLogger('EmailOrchestrator');

export class EmailOrchestrator {
  private confidenceScorer: ConfidenceScorer;
  private nlpClassifier: NLPIntentClassifier;
  private conversationManager: ConversationStateManager;
  private availabilityService: AvailabilityService;
  private responseGenerator: ResponseGenerator;
  private auditLogger: AutomationAuditLogger;
  private preferencesManager: UserPreferencesManager;
  private circuitBreaker: CircuitBreaker;
  private gmailClient: GmailMCPClient;
  private calendarMCP: GoogleCalendarMCP;

  constructor() {
    // Initialize all services
    this.confidenceScorer = new ConfidenceScorer();
    this.nlpClassifier = new NLPIntentClassifier();
    this.conversationManager = new ConversationStateManager();
    this.responseGenerator = new ResponseGenerator();
    this.auditLogger = new AutomationAuditLogger();
    this.preferencesManager = new UserPreferencesManager();
    this.circuitBreaker = new CircuitBreaker();
    this.gmailClient = new GmailMCPClient();
    this.calendarMCP = new GoogleCalendarMCP();

    // AvailabilityService needs dependencies
    this.availabilityService = new AvailabilityService(
      this.calendarMCP,
      this.preferencesManager
    );
  }

  /**
   * Process incoming email and determine autonomous action
   * This is the main entry point for email-triggered workflows
   */
  async processIncomingEmail(
    messageId: string,
    userId: string
  ): Promise<OrchestratorResult> {
    logger.info('Processing incoming email', { messageId, userId });

    try {
      // Step 1: Get email content from Gmail
      const emailData = await this.gmailClient.getMessage(messageId);
      const { subject, body, from, threadId } = this.parseEmailData(emailData);

      // Step 2: Classify intent using NLP
      const classification = await this.nlpClassifier.classify(body, subject);
      classification.messageId = messageId;
      classification.threadId = threadId;
      classification.from = from;

      if (!classification.isSchedulingRequest) {
        logger.info('Email is not a scheduling request, ignoring', { messageId });
        return {
          action: 'ignored',
          reason: 'Not a scheduling request',
          confidence: classification.confidence
        };
      }

      // Step 3: Get or create conversation state
      const conversation = await this.conversationManager.getOrCreate(threadId, userId);

      // Step 4: Get user preferences
      const userPreferences = await this.preferencesManager.get(userId);

      // Check if automation is enabled
      if (!userPreferences.automationEnabled) {
        logger.info('Automation disabled for user', { userId });
        return {
          action: 'pending_approval',
          reason: 'Automation disabled',
          confidence: classification.confidence
        };
      }

      // Check circuit breaker
      const circuitBreakerOpen = await this.circuitBreaker.isOpen(userId);
      if (circuitBreakerOpen) {
        logger.warn('Circuit breaker is OPEN, escalating to user', { userId });
        return {
          action: 'pending_approval',
          reason: 'Circuit breaker activated',
          confidence: 0
        };
      }

      // Step 5: Calculate confidence
      const confidence = await this.assessConfidence({
        classification,
        conversation,
        userPreferences,
        senderHistory: await this.getSenderHistory(from, userId)
      });

      // Create availability request record
      const requestId = await this.createAvailabilityRequest(classification, userId);

      // Store confidence assessment (link to request)
      confidence.requestId = requestId;
      await this.storeConfidenceAssessment(requestId, confidence);

      // Update circuit breaker based on confidence
      if (confidence.overallConfidence < userPreferences.confidenceThreshold) {
        await this.circuitBreaker.recordLowConfidence(
          userId,
          userPreferences.circuitBreakerConfig.maxLowConfidence
        );
      } else {
        await this.circuitBreaker.recordHighConfidence(userId);
      }

      // Step 6: Make autonomous decision
      if (confidence.recommendation === 'auto_respond') {
        // Step 7: Get calendar availability
        const availability = await this.availabilityService.checkAvailability(
          userId,
          classification.proposedTimes
        );

        // Step 8: Generate response
        const response = await this.responseGenerator.generateAvailabilityResponse(
          availability,
          userPreferences,
          this.extractName(from)
        );

        // Step 9: Send email via Gmail
        await this.gmailClient.sendMessage({
          to: [from],
          subject: `Re: ${subject}`,
          body: response.text,
          threadId
        });

        // Step 10: Audit log
        const auditId = await this.auditLogger.log({
          userId,
          requestId,
          conversationId: conversation.id,
          action: 'sent_email',
          confidenceScore: confidence.overallConfidence,
          decisionRationale: this.buildDecisionRationale(confidence),
          emailSentId: messageId,
          calendarEventsConsidered: availability.conflicts,
          conversationContext: conversation.context
        });

        // Step 11: Update conversation state
        await this.conversationManager.transition(threadId, 'availability_sent', {
          currentRequestId: requestId,
          context: { lastResponse: response.summary }
        });

        logger.info('Email auto-responded successfully', {
          messageId,
          confidence: confidence.overallConfidence.toFixed(2),
          auditId
        });

        return {
          action: 'auto_responded',
          confidence: confidence.overallConfidence,
          reason: 'Confidence threshold met',
          auditId,
          emailSent: true
        };
      } else {
        // Escalate to user for manual approval
        logger.info('Escalating to user for approval', {
          messageId,
          confidence: confidence.overallConfidence.toFixed(2)
        });

        return {
          action: 'pending_approval',
          confidence: confidence.overallConfidence,
          reason: confidence.recommendation === 'decline'
            ? 'Confidence too low'
            : 'User approval required'
        };
      }
    } catch (error: any) {
      logger.error('Error processing email', { messageId, error: error.message });
      return {
        action: 'error',
        reason: `Processing error: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Parse email data from Gmail MCP response
   */
  private parseEmailData(emailData: any): {
    subject: string;
    body: string;
    from: string;
    threadId: string;
  } {
    // Gmail MCP returns message in specific format
    const payload = emailData.payload || {};
    const headers = payload.headers || [];

    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(no subject)';
    const from = headers.find((h: any) => h.name === 'From')?.value || '';
    const threadId = emailData.threadId || '';

    // Extract body from parts
    let body = '';
    if (payload.parts) {
      const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain');
      if (textPart && textPart.body && textPart.body.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    } else if (payload.body && payload.body.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    return { subject, body, from, threadId };
  }

  /**
   * Extract name from email address (simple extraction)
   */
  private extractName(email: string): string | undefined {
    // Format: "John Doe <john@example.com>" or just "john@example.com"
    const match = email.match(/^([^<]+)\s*</);
    if (match && match[1]) {
      return match[1].trim();
    }

    // Fallback: use part before @ and capitalize
    const parts = email.split('@');
    if (parts.length === 0 || !parts[0]) return undefined;

    const username = parts[0];
    return username
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private async assessConfidence(context: ScoringContext): Promise<ConfidenceAssessment> {
    return this.confidenceScorer.assess(context);
  }

  /**
   * Get sender history from database
   */
  private async getSenderHistory(email: string, userId: string): Promise<any> {
    const { query } = await import('../utils/database');

    // Get total emails and scheduling requests from audit log
    const result = await query(
      `SELECT
        COUNT(*) as total_emails,
        COUNT(*) FILTER (WHERE action = 'sent_email') as scheduling_requests,
        COUNT(*) FILTER (WHERE action = 'sent_email' AND user_override IS NULL) as successful_schedules,
        MAX(created_at) as last_interaction
       FROM automation_audit_log
       WHERE user_id = $1 AND email_from = $2`,
      [userId, email]
    );

    const stats = result.rows[0];
    const totalEmails = parseInt(stats.total_emails) || 0;
    const schedulingRequests = parseInt(stats.scheduling_requests) || 0;
    const successfulSchedules = parseInt(stats.successful_schedules) || 0;

    let trustLevel: 'vip' | 'trusted' | 'known' | 'unknown' = 'unknown';
    if (totalEmails === 0) {
      trustLevel = 'unknown';
    } else if (schedulingRequests >= 3 && successfulSchedules >= 2) {
      trustLevel = 'trusted';
    } else if (totalEmails > 0) {
      trustLevel = 'known';
    }

    return {
      email,
      totalEmails,
      schedulingRequests,
      successfulSchedules,
      lastInteraction: stats.last_interaction,
      trustLevel
    };
  }

  /**
   * Create availability request in database
   */
  private async createAvailabilityRequest(
    classification: EmailClassification,
    userId: string
  ): Promise<string> {
    const { query } = await import('../utils/database');

    const result = await query(
      `INSERT INTO availability_requests
       (user_id, requester_email, subject, request_type, urgency, raw_email_text, proposed_times, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING id`,
      [
        userId,
        classification.from,
        classification.subject,
        classification.requestType,
        classification.urgency,
        classification.rawText,
        JSON.stringify(classification.proposedTimes)
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Store confidence assessment in database
   */
  private async storeConfidenceAssessment(
    requestId: string,
    confidence: ConfidenceAssessment
  ): Promise<void> {
    const { query } = await import('../utils/database');

    await query(
      `INSERT INTO confidence_assessments
       (request_id, overall_confidence, intent_confidence, time_parsing_confidence,
        sender_trust_score, conversation_clarity, factors, recommendation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        requestId,
        confidence.overallConfidence,
        confidence.intentConfidence,
        confidence.timeParsingConfidence,
        confidence.senderTrustScore,
        confidence.conversationClarity,
        JSON.stringify(confidence.factors),
        confidence.recommendation
      ]
    );

    logger.info('Confidence assessment stored', {
      requestId,
      confidence: confidence.overallConfidence.toFixed(2)
    });
  }


  private buildDecisionRationale(confidence: ConfidenceAssessment): string {
    const parts = [];
    if (confidence.intentConfidence && confidence.intentConfidence >= 0.8) {
      parts.push('clear scheduling intent');
    }
    if (confidence.timeParsingConfidence && confidence.timeParsingConfidence >= 0.7) {
      parts.push('well-defined time slots');
    }
    if (confidence.senderTrustScore && confidence.senderTrustScore >= 0.5) {
      parts.push('known/trusted sender');
    }
    return `Auto-sent because: ${parts.join(', ')}. Confidence: ${confidence.overallConfidence.toFixed(2)}`;
  }
}
