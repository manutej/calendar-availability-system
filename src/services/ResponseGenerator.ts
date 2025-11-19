// Response Generator - Template-based email response generation
// Generates natural language availability responses

import { createLogger } from '../utils/logger';
import { UserPreferences, TimeSlot, AvailabilityCheckResult } from '../types';

const logger = createLogger('ResponseGenerator');

export class ResponseGenerator {
  /**
   * Generate availability response email
   */
  async generateAvailabilityResponse(
    availability: AvailabilityCheckResult,
    preferences: UserPreferences,
    recipientName?: string
  ): Promise<{ text: string; html: string; summary: string }> {
    logger.debug('Generating availability response', {
      availableSlots: availability.available.length,
      hasConflicts: availability.hasConflicts,
      tone: preferences.responseTone
    });

    const greeting = this.generateGreeting(recipientName, preferences.responseTone);
    const availabilityText = this.generateAvailabilityText(availability);
    const closing = this.generateClosing(preferences.responseTone);

    const text = `${greeting}\n\n${availabilityText}\n\n${closing}`;
    const html = this.convertToHtml(text);
    const summary = this.generateSummary(availability);

    return { text, html, summary };
  }

  /**
   * Generate confirmation response
   */
  async generateConfirmation(
    confirmedSlot: TimeSlot,
    preferences: UserPreferences,
    recipientName?: string
  ): Promise<{ text: string; html: string; summary: string }> {
    logger.debug('Generating confirmation response', {
      slot: confirmedSlot,
      tone: preferences.responseTone
    });

    const greeting = this.generateGreeting(recipientName, preferences.responseTone);
    const confirmationText = this.generateConfirmationText(confirmedSlot, preferences.responseTone);
    const closing = this.generateClosing(preferences.responseTone);

    const text = `${greeting}\n\n${confirmationText}\n\n${closing}`;
    const html = this.convertToHtml(text);
    const summary = `Confirmed meeting on ${this.formatDateTime(confirmedSlot.start)}`;

    return { text, html, summary };
  }

  /**
   * Generate clarification request
   */
  async generateClarification(
    reason: string,
    preferences: UserPreferences,
    recipientName?: string
  ): Promise<{ text: string; html: string; summary: string }> {
    const greeting = this.generateGreeting(recipientName, preferences.responseTone);
    const clarificationText = this.generateClarificationText(reason, preferences.responseTone);
    const closing = this.generateClosing(preferences.responseTone);

    const text = `${greeting}\n\n${clarificationText}\n\n${closing}`;
    const html = this.convertToHtml(text);

    return { text, html, summary: 'Requested clarification' };
  }

  /**
   * Generate greeting based on tone
   */
  private generateGreeting(recipientName: string | undefined, tone: string): string {
    const name = recipientName || 'there';

    switch (tone) {
      case 'formal':
        return `Dear ${recipientName || 'Sir/Madam'},`;
      case 'casual':
        return `Hey ${name}!`;
      case 'professional':
      default:
        return `Hi ${name},`;
    }
  }

  /**
   * Generate availability text
   */
  private generateAvailabilityText(availability: AvailabilityCheckResult): string {
    if (availability.available.length === 0) {
      return "Unfortunately, I don't have any availability during the times you suggested. Here are some alternative times that work for me:\n\n" +
        this.formatTimeSlots(availability.suggested);
    }

    if (availability.available.length === availability.requested.length) {
      return "Great! I'm available at all the times you suggested:\n\n" +
        this.formatTimeSlots(availability.available);
    }

    return "I'm available at the following times:\n\n" +
      this.formatTimeSlots(availability.available) +
      (availability.suggested.length > 0
        ? "\n\nIf those don't work, here are some alternative options:\n\n" + this.formatTimeSlots(availability.suggested)
        : '');
  }

  /**
   * Generate confirmation text
   */
  private generateConfirmationText(slot: TimeSlot, tone: string): string {
    const dateTime = this.formatDateTime(slot.start);
    const duration = this.calculateDuration(slot);

    switch (tone) {
      case 'formal':
        return `I am pleased to confirm our meeting scheduled for ${dateTime}. The meeting is expected to last ${duration} minutes. I have added this to my calendar.`;
      case 'casual':
        return `Perfect! ${dateTime} works for me. I've added it to my calendar. See you then!`;
      case 'professional':
      default:
        return `Sounds good! I've confirmed ${dateTime} for our meeting (${duration} minutes). It's now on my calendar.`;
    }
  }

  /**
   * Generate clarification text
   */
  private generateClarificationText(reason: string, tone: string): string {
    switch (tone) {
      case 'formal':
        return `I would appreciate some clarification regarding your meeting request. ${reason}. Please provide additional details at your earliest convenience.`;
      case 'casual':
        return `Quick question about the meeting - ${reason}. Can you clarify?`;
      case 'professional':
      default:
        return `I need a bit more information to schedule this meeting. ${reason}. Could you please clarify?`;
    }
  }

  /**
   * Generate closing based on tone
   */
  private generateClosing(tone: string): string {
    switch (tone) {
      case 'formal':
        return 'Best regards';
      case 'casual':
        return 'Cheers!';
      case 'professional':
      default:
        return 'Best';
    }
  }

  /**
   * Format time slots for display
   */
  private formatTimeSlots(slots: TimeSlot[]): string {
    return slots.map((slot, index) => {
      const date = this.formatDate(slot.start);
      const timeRange = this.formatTimeRange(slot.start, slot.end);
      return `${index + 1}. ${date} at ${timeRange}`;
    }).join('\n');
  }

  /**
   * Format date (e.g., "Monday, November 20")
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Format time range (e.g., "2:00 PM - 3:00 PM")
   */
  private formatTimeRange(start: Date, end: Date): string {
    const startTime = start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const endTime = end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return `${startTime} - ${endTime}`;
  }

  /**
   * Format date and time (e.g., "Monday, November 20 at 2:00 PM")
   */
  private formatDateTime(date: Date): string {
    return `${this.formatDate(date)} at ${date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })}`;
  }

  /**
   * Calculate duration in minutes
   */
  private calculateDuration(slot: TimeSlot): number {
    return Math.round((slot.end.getTime() - slot.start.getTime()) / (1000 * 60));
  }

  /**
   * Convert text to HTML
   */
  private convertToHtml(text: string): string {
    return text
      .split('\n\n')
      .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
      .join('\n');
  }

  /**
   * Generate summary for audit log
   */
  private generateSummary(availability: AvailabilityCheckResult): string {
    if (availability.available.length === 0) {
      return `No availability, suggested ${availability.suggested.length} alternatives`;
    }
    return `Shared ${availability.available.length} available slot(s)`;
  }
}
