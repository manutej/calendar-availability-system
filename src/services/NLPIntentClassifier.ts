// NLP Intent Classifier - Pragmatic minimal implementation
// Uses simple pattern matching initially, can swap for Claude API later
// YAGNI: Start simple, add complexity only when needed

import { createLogger } from '../utils/logger';
import { EmailClassification, TimeSlot } from '../types';

const logger = createLogger('NLPIntentClassifier');

export class NLPIntentClassifier {
  /**
   * Classify email intent (simple pattern matching for MVP)
   * TODO: Replace with Claude API for production
   */
  async classify(emailText: string, subject?: string): Promise<EmailClassification> {
    const text = (subject + ' ' + emailText).toLowerCase();

    // Simple pattern matching (good enough for MVP)
    const isSchedulingRequest = this.detectSchedulingIntent(text);
    const confidence = isSchedulingRequest ? this.calculateConfidence(text) : 0.2;
    const proposedTimes = this.extractTimes(text);
    const participants = this.extractEmails(emailText);
    const requestType = this.detectRequestType(text);
    const urgency = this.detectUrgency(text);

    const classification: EmailClassification = {
      isSchedulingRequest,
      confidence,
      intent: isSchedulingRequest ? 'schedule_meeting' : 'other',
      proposedTimes,
      participants,
      requestType,
      urgency,
      threadId: '', // Set by caller
      messageId: '', // Set by caller
      from: '', // Set by caller
      subject: subject || '',
      rawText: emailText
    };

    logger.debug('Email classified', {
      isScheduling: isSchedulingRequest,
      confidence: confidence.toFixed(2),
      proposedTimes: proposedTimes.length
    });

    return classification;
  }

  /**
   * Detect if email is asking about scheduling/availability
   */
  private detectSchedulingIntent(text: string): boolean {
    const schedulingKeywords = [
      'available', 'availability', 'meet', 'meeting', 'schedule', 'calendar',
      'time', 'when can', 'free', 'busy', 'appointment', 'call', 'coffee',
      'lunch', 'dinner', 'catch up', 'sync', 'touch base'
    ];

    return schedulingKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Calculate confidence based on signal strength
   */
  private calculateConfidence(text: string): number {
    let score = 0.5;

    // Strong signals boost confidence
    if (text.includes('when are you available') || text.includes('when can you')) score += 0.3;
    if (text.includes('schedule') || text.includes('meeting')) score += 0.2;
    if (text.includes('calendar')) score += 0.1;
    if (this.hasTimeReferences(text)) score += 0.2;

    // Question marks indicate request
    if (text.includes('?')) score += 0.1;

    return Math.min(1.0, score);
  }

  /**
   * Detect request type
   */
  private detectRequestType(text: string): EmailClassification['requestType'] {
    if (text.includes('works for me') || text.includes('sounds good') || text.includes('confirmed')) {
      return 'confirmation';
    }
    if (text.includes('reschedule') || text.includes('change the time')) {
      return 'rescheduling';
    }
    if (text.includes('clarif') || text.includes('what time') || text.includes('which day')) {
      return 'clarification';
    }
    return 'initial';
  }

  /**
   * Detect urgency
   */
  private detectUrgency(text: string): 'low' | 'medium' | 'high' {
    if (text.includes('urgent') || text.includes('asap') || text.includes('immediately')) {
      return 'high';
    }
    if (text.includes('soon') || text.includes('today') || text.includes('tomorrow')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Simple time extraction (MVP - extract obvious patterns)
   * TODO: Use proper NLP library for production
   */
  private extractTimes(text: string): TimeSlot[] {
    const slots: TimeSlot[] = [];

    // Look for "tomorrow at 2pm" pattern
    const tomorrowMatch = text.match(/tomorrow\s+at\s+(\d+)(?::(\d+))?\s*(am|pm)/i);
    if (tomorrowMatch && tomorrowMatch[1] && tomorrowMatch[3]) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      let hours = parseInt(tomorrowMatch[1]);
      const minutes = parseInt(tomorrowMatch[2] || '0');
      const ampm = tomorrowMatch[3].toLowerCase();

      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;

      tomorrow.setHours(hours, minutes, 0, 0);
      const end = new Date(tomorrow.getTime() + 60 * 60 * 1000); // 1 hour default

      slots.push({ start: tomorrow, end });
    }

    // Look for "Monday at 3pm" pattern
    const dayMatch = text.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+at\s+(\d+)(?::(\d+))?\s*(am|pm)/i);
    if (dayMatch && dayMatch[1] && dayMatch[2] && dayMatch[4]) {
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = daysOfWeek.indexOf(dayMatch[1].toLowerCase());
      const today = new Date();
      const currentDay = today.getDay();

      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;

      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysUntil);

      let hours = parseInt(dayMatch[2]);
      const minutes = parseInt(dayMatch[3] || '0');
      const ampm = dayMatch[4].toLowerCase();

      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;

      targetDate.setHours(hours, minutes, 0, 0);
      const end = new Date(targetDate.getTime() + 60 * 60 * 1000);

      slots.push({ start: targetDate, end });
    }

    return slots;
  }

  /**
   * Extract email addresses from text
   */
  private extractEmails(text: string): string[] {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return text.match(emailRegex) || [];
  }

  /**
   * Check if text has time references
   */
  private hasTimeReferences(text: string): boolean {
    const timeWords = ['today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'am', 'pm', 'morning', 'afternoon', 'evening'];
    return timeWords.some(word => text.includes(word));
  }
}
