// Confidence Scoring Engine - Article X: Autonomous Operation
// Multi-factor assessment for autonomous email response decisions

import { createLogger } from '../utils/logger';
import {
  ConfidenceAssessment,
  ScoringContext,
  EmailClassification,
  SenderHistory,
  ConversationState
} from '../types';

const logger = createLogger('ConfidenceScorer');

export class ConfidenceScorer {
  /**
   * Calculate multi-factor confidence score for autonomous decision making
   * Factors:
   * - Intent confidence (40%): How confident are we this is a scheduling request?
   * - Time parsing confidence (30%): How clearly were dates/times extracted?
   * - Sender trust score (20%): Is this a known/trusted sender?
   * - Conversation clarity (10%): Is the conversation context clear?
   */
  async assess(context: ScoringContext): Promise<ConfidenceAssessment> {
    logger.info('Assessing confidence for scheduling request', {
      from: context.classification.from,
      threadId: context.classification.threadId
    });

    // Factor 1: Intent confidence (from NLP classification)
    const intentConfidence = this.assessIntentConfidence(context.classification);

    // Factor 2: Time parsing confidence
    const timeParsingConfidence = this.assessTimeParsingConfidence(context.classification);

    // Factor 3: Sender trust score
    const senderTrustScore = this.assessSenderTrust(
      context.classification.from,
      context.senderHistory,
      context.userPreferences
    );

    // Factor 4: Conversation clarity
    const conversationClarity = this.assessConversationClarity(context.conversation);

    // Weighted average
    const overallConfidence = this.calculateWeightedAverage({
      intentConfidence,
      timeParsingConfidence,
      senderTrustScore,
      conversationClarity
    });

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      overallConfidence,
      context.userPreferences.confidenceThreshold
    );

    const assessment: ConfidenceAssessment = {
      id: '', // Will be set by database
      requestId: '', // Will be set by caller
      overallConfidence,
      intentConfidence,
      timeParsingConfidence,
      senderTrustScore,
      conversationClarity,
      factors: {
        intentClear: intentConfidence >= 0.8,
        timesExtractedCleanly: timeParsingConfidence >= 0.7,
        knownSender: senderTrustScore >= 0.5,
        threadContext: context.conversation?.state || 'initial',
        urgencyLevel: context.classification.urgency,
        requestType: context.classification.requestType
      },
      recommendation,
      createdAt: new Date()
    };

    logger.info('Confidence assessment complete', {
      overall: overallConfidence.toFixed(2),
      recommendation,
      breakdown: {
        intent: intentConfidence.toFixed(2),
        timeParsing: timeParsingConfidence.toFixed(2),
        senderTrust: senderTrustScore.toFixed(2),
        conversationClarity: conversationClarity.toFixed(2)
      }
    });

    return assessment;
  }

  private assessIntentConfidence(classification: EmailClassification): number {
    // Use NLP classification confidence directly
    let confidence = classification.confidence;

    // Boost if request type is clear
    if (classification.requestType === 'confirmation') {
      confidence = Math.min(1.0, confidence + 0.1);
    }

    // Reduce if urgent (may be misclassified)
    if (classification.urgency === 'high' && classification.confidence < 0.9) {
      confidence = confidence * 0.9;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private assessTimeParsingConfidence(classification: EmailClassification): number {
    const { proposedTimes } = classification;

    if (!proposedTimes || proposedTimes.length === 0) {
      // No times extracted - low confidence unless it's a confirmation
      return classification.requestType === 'confirmation' ? 0.7 : 0.3;
    }

    // Check time slot quality
    let confidence = 0.5;

    // Boost for clear time slots
    const validSlots = proposedTimes.filter(slot => {
      const duration = slot.end.getTime() - slot.start.getTime();
      return duration > 0 && duration < 24 * 60 * 60 * 1000; // Between 0 and 24 hours
    });

    if (validSlots.length === proposedTimes.length) {
      confidence = 0.9;
    } else if (validSlots.length > 0) {
      confidence = 0.6;
    }

    // Boost for reasonable number of proposed times (1-5 slots)
    if (proposedTimes.length >= 1 && proposedTimes.length <= 5) {
      confidence = Math.min(1.0, confidence + 0.1);
    }

    return confidence;
  }

  private assessSenderTrust(
    senderEmail: string,
    history: SenderHistory | undefined,
    userPreferences: { vipWhitelist: string[]; blacklist: string[] }
  ): number {
    // Check VIP whitelist (instant trust)
    if (userPreferences.vipWhitelist.includes(senderEmail)) {
      return 1.0;
    }

    // Check blacklist (zero trust)
    if (userPreferences.blacklist.includes(senderEmail)) {
      return 0.0;
    }

    // No history - unknown sender
    if (!history || history.totalEmails === 0) {
      return 0.5; // Neutral trust for unknown senders
    }

    // Calculate trust based on history
    let trust = 0.6; // Base trust for known senders

    // Boost for successful past scheduling
    if (history.schedulingRequests > 0) {
      const successRate = history.successfulSchedules / history.schedulingRequests;
      trust += successRate * 0.3; // Up to +0.3 for 100% success rate
    }

    // Boost for frequent interaction
    if (history.totalEmails > 10) {
      trust += 0.1;
    }

    // Boost for recent interaction
    if (history.lastInteraction) {
      const daysSinceLastInteraction = (Date.now() - history.lastInteraction.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastInteraction < 30) {
        trust += 0.1;
      }
    }

    return Math.max(0, Math.min(1, trust));
  }

  private assessConversationClarity(conversation: ConversationState | undefined): number {
    if (!conversation) {
      return 0.8; // New conversation - reasonably clear
    }

    let clarity = 0.7;

    // Boost for ongoing conversations
    if (conversation.state === 'availability_sent') {
      clarity = 0.9; // Expecting confirmation/response
    }

    // Reduce for complex conversations
    if (conversation.turnCount > 5) {
      clarity = 0.5; // Many turns - may be complex negotiation
    }

    // Boost for simple confirmations
    if (conversation.state === 'confirmed') {
      clarity = 0.95;
    }

    return clarity;
  }

  private calculateWeightedAverage(scores: {
    intentConfidence: number;
    timeParsingConfidence: number;
    senderTrustScore: number;
    conversationClarity: number;
  }): number {
    const weights = {
      intent: 0.4,
      timeParsing: 0.3,
      senderTrust: 0.2,
      conversation: 0.1
    };

    const weighted =
      scores.intentConfidence * weights.intent +
      scores.timeParsingConfidence * weights.timeParsing +
      scores.senderTrustScore * weights.senderTrust +
      scores.conversationClarity * weights.conversation;

    return Math.max(0, Math.min(1, weighted));
  }

  private generateRecommendation(
    confidence: number,
    threshold: number
  ): 'auto_respond' | 'request_approval' | 'decline' {
    if (confidence >= threshold) {
      return 'auto_respond';
    } else if (confidence >= threshold - 0.15) {
      // Within 0.15 of threshold - request approval
      return 'request_approval';
    } else {
      return 'decline';
    }
  }
}
