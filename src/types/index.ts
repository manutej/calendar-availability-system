// Core types for Calendar Availability System - Autonomous Operation
// Based on .specify/spec.md v2.0.0

export interface User {
  id: string;
  email: string;
  name: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface UserPreferences {
  id: string;
  userId: string;
  workingHoursStart: string; // HH:MM format
  workingHoursEnd: string;
  bufferMinutes: number;
  defaultMeetingDuration: number;

  // Autonomous operation settings (Article X)
  automationEnabled: boolean;
  confidenceThreshold: number; // 0.0-1.0
  vipWhitelist: string[];
  blacklist: string[];
  notificationChannels: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  circuitBreakerConfig: {
    maxLowConfidence: number;
    cooldownMinutes: number;
  };
  learningEnabled: boolean;
  responseTone: 'formal' | 'casual' | 'professional';

  createdAt: Date;
  updatedAt: Date;
}

export interface Calendar {
  id: string;
  userId: string;
  type: 'google' | 'external';
  name: string;
  externalId?: string;
  connectionDetails?: Record<string, any>;
  syncStatus: 'pending' | 'active' | 'error' | 'paused';
  lastSyncAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  externalId: string;
  title?: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  status: 'confirmed' | 'tentative' | 'cancelled';
  recurrenceRule?: string;
  attendees: Array<{
    email: string;
    name?: string;
    responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  }>;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailabilityRequest {
  id: string;
  userId: string;
  requesterEmail: string;
  requesterName?: string;
  emailThreadId: string;
  emailMessageId: string;
  subject?: string;
  rawRequestText: string;
  proposedTimes: TimeSlot[];
  extractedParticipants: string[];
  status: 'pending' | 'processed' | 'responded' | 'scheduled' | 'declined';
  responseSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  proposed?: boolean;
  available?: boolean;
  confidence?: number;
}

export interface ConfidenceAssessment {
  id: string;
  requestId: string;
  overallConfidence: number; // 0.0-1.0
  intentConfidence?: number;
  timeParsingConfidence?: number;
  senderTrustScore?: number;
  conversationClarity?: number;
  factors: {
    intentClear: boolean;
    timesExtractedCleanly: boolean;
    knownSender: boolean;
    threadContext: string;
    [key: string]: any;
  };
  recommendation: 'auto_respond' | 'request_approval' | 'decline';
  createdAt: Date;
}

export interface ConversationState {
  id: string;
  threadId: string;
  userId: string;
  state: 'initial' | 'availability_sent' | 'confirmed' | 'scheduled' | 'closed';
  turnCount: number;
  currentRequestId?: string;
  previousRequestIds: string[];
  context: {
    lastProposedTimes?: TimeSlot[];
    lastResponse?: string;
    confirmationPending?: boolean;
    [key: string]: any;
  };
  lastActivity: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationAuditEntry {
  id: string;
  userId: string;
  requestId?: string;
  conversationId?: string;
  action: 'sent_email' | 'declined_request' | 'requested_clarification' | 'escalated';
  confidenceScore: number;
  decisionRationale: string;
  emailSentId?: string;
  calendarEventsConsidered: CalendarEvent[];
  conversationContext: Record<string, any>;
  userNotified: boolean;
  notificationSentAt?: Date;
  userOverride?: 'approved' | 'retracted' | 'marked_incorrect';
  userOverrideAt?: Date;
  userOverrideReason?: string;
  createdAt: Date;
}

export interface CircuitBreakerState {
  id: string;
  userId: string;
  state: 'closed' | 'open' | 'half_open';
  consecutiveLowConfidence: number;
  lastLowConfidenceAt?: Date;
  openedAt?: Date;
  closesAt?: Date;
  manualOverride: boolean;
  updatedAt: Date;
}

export interface EmailResponse {
  id: string;
  requestId: string;
  responseText: string;
  responseHtml?: string;
  sentAt?: Date;
  emailMessageId?: string;
  status: 'draft' | 'sent' | 'failed' | 'retracted';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Email orchestration types
export interface EmailClassification {
  isSchedulingRequest: boolean;
  confidence: number;
  intent: string;
  proposedTimes: TimeSlot[];
  participants: string[];
  requestType: 'initial' | 'confirmation' | 'rescheduling' | 'clarification';
  urgency: 'low' | 'medium' | 'high';
  threadId: string;
  messageId: string;
  from: string;
  subject?: string;
  rawText: string;
}

export interface OrchestratorResult {
  action: 'auto_responded' | 'pending_approval' | 'declined' | 'ignored' | 'error';
  confidence?: number;
  reason: string;
  auditId?: string;
  emailSent?: boolean;
  error?: string;
}

// NLP and confidence scoring types
export interface ScoringContext {
  classification: EmailClassification;
  conversation?: ConversationState;
  senderHistory?: SenderHistory;
  userPreferences: UserPreferences;
  calendarAvailability?: AvailabilityCheckResult;
}

export interface SenderHistory {
  email: string;
  totalEmails: number;
  schedulingRequests: number;
  successfulSchedules: number;
  lastInteraction?: Date;
  trustLevel: 'unknown' | 'known' | 'trusted' | 'vip';
}

export interface AvailabilityCheckResult {
  requested: TimeSlot[];
  available: TimeSlot[];
  conflicts: CalendarEvent[];
  suggested: TimeSlot[];
  hasConflicts: boolean;
}
