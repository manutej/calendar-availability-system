// Availability Service - Converts calendar events to available time slots
// Core business logic for scheduling decisions

import { createLogger } from '../utils/logger';
import { GoogleCalendarMCP } from './GoogleCalendarMCP';
import { UserPreferencesManager } from './UserPreferencesManager';
import { TimeSlot, AvailabilityCheckResult, CalendarEvent } from '../types';

const logger = createLogger('AvailabilityService');

export class AvailabilityService {
  constructor(
    private calendarMCP: GoogleCalendarMCP,
    private preferencesManager: UserPreferencesManager
  ) {}

  /**
   * Check availability for proposed time slots
   */
  async checkAvailability(
    userId: string,
    proposedTimes: TimeSlot[]
  ): Promise<AvailabilityCheckResult> {
    logger.info('Checking availability', {
      userId,
      proposedSlots: proposedTimes.length
    });

    if (proposedTimes.length === 0) {
      // No specific times proposed - generate suggestions
      return await this.generateSuggestions(userId);
    }

    // Get user preferences for working hours and buffer
    const preferences = await this.preferencesManager.get(userId);

    // Determine time range to check
    const minTime = this.getMinTime(proposedTimes);
    const maxTime = this.getMaxTime(proposedTimes);

    // Get free/busy periods from calendar
    const { free, busy } = await this.calendarMCP.getFreeBusySlots(
      userId,
      minTime,
      maxTime
    );

    // Find conflicts with proposed times
    const { available, conflicts } = this.checkProposedTimes(
      proposedTimes,
      busy
    );

    // Get calendar events for conflicts (for audit trail)
    const conflictEvents = await this.getConflictingEvents(
      userId,
      conflicts,
      minTime,
      maxTime
    );

    // Generate alternative suggestions if there are conflicts
    const suggested = conflicts.length > 0
      ? await this.generateAlternatives(userId, proposedTimes, busy, preferences)
      : [];

    const result: AvailabilityCheckResult = {
      requested: proposedTimes,
      available,
      conflicts: conflictEvents,
      suggested,
      hasConflicts: conflicts.length > 0
    };

    logger.info('Availability check complete', {
      userId,
      availableCount: available.length,
      conflictCount: conflicts.length,
      suggestedCount: suggested.length
    });

    return result;
  }

  /**
   * Generate suggested meeting times (when no specific times proposed)
   */
  async generateSuggestions(
    userId: string,
    daysAhead: number = 7
  ): Promise<AvailabilityCheckResult> {
    logger.info('Generating availability suggestions', { userId, daysAhead });

    const preferences = await this.preferencesManager.get(userId);

    // Generate time range (next N business days)
    const startTime = this.getNextBusinessDay();
    const endTime = new Date(startTime.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    // Get free/busy periods
    const { free, busy } = await this.calendarMCP.getFreeBusySlots(
      userId,
      startTime,
      endTime
    );

    // Filter free slots by working hours
    const workingHourSlots = this.filterByWorkingHours(free, preferences);

    // Generate meeting slot suggestions (e.g., 30min or 60min slots)
    const suggestedSlots = this.generateMeetingSlots(
      workingHourSlots,
      preferences.defaultMeetingDuration,
      preferences.bufferMinutes
    );

    // Take top 5 suggestions
    const suggested = suggestedSlots.slice(0, 5);

    return {
      requested: [],
      available: suggested,
      conflicts: [],
      suggested,
      hasConflicts: false
    };
  }

  /**
   * Check if proposed times conflict with busy periods
   */
  private checkProposedTimes(
    proposedTimes: TimeSlot[],
    busySlots: TimeSlot[]
  ): { available: TimeSlot[]; conflicts: TimeSlot[] } {
    const available: TimeSlot[] = [];
    const conflicts: TimeSlot[] = [];

    for (const proposed of proposedTimes) {
      const hasConflict = busySlots.some(busy =>
        this.slotsOverlap(proposed, busy)
      );

      if (hasConflict) {
        conflicts.push(proposed);
      } else {
        available.push(proposed);
      }
    }

    return { available, conflicts };
  }

  /**
   * Check if two time slots overlap
   */
  private slotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    return slot1.start < slot2.end && slot1.end > slot2.start;
  }

  /**
   * Get calendar events that conflict with time slots
   */
  private async getConflictingEvents(
    userId: string,
    conflictingSlots: TimeSlot[],
    minTime: Date,
    maxTime: Date
  ): Promise<CalendarEvent[]> {
    if (conflictingSlots.length === 0) {
      return [];
    }

    const calendars = await this.calendarMCP.getCalendarsForUser(userId);
    const allEvents: CalendarEvent[] = [];

    for (const calendar of calendars) {
      const events = await this.calendarMCP.getEvents(calendar.id, minTime, maxTime);
      allEvents.push(...events);
    }

    // Filter to only events that overlap with conflicts
    return allEvents.filter(event =>
      conflictingSlots.some(slot =>
        this.slotsOverlap(
          slot,
          { start: event.startTime, end: event.endTime }
        )
      )
    );
  }

  /**
   * Generate alternative time suggestions when there are conflicts
   */
  private async generateAlternatives(
    userId: string,
    proposedTimes: TimeSlot[],
    busySlots: TimeSlot[],
    preferences: any
  ): Promise<TimeSlot[]> {
    // Find similar times on adjacent days
    const alternatives: TimeSlot[] = [];

    for (const proposed of proposedTimes) {
      // Try same time next day
      const nextDay = new Date(proposed.start.getTime() + 24 * 60 * 60 * 1000);
      const nextDaySlot: TimeSlot = {
        start: nextDay,
        end: new Date(nextDay.getTime() + (proposed.end.getTime() - proposed.start.getTime()))
      };

      const conflictsNextDay = busySlots.some(busy => this.slotsOverlap(nextDaySlot, busy));
      if (!conflictsNextDay) {
        alternatives.push(nextDaySlot);
      }

      // Try same time previous day
      const prevDay = new Date(proposed.start.getTime() - 24 * 60 * 60 * 1000);
      const prevDaySlot: TimeSlot = {
        start: prevDay,
        end: new Date(prevDay.getTime() + (proposed.end.getTime() - proposed.start.getTime()))
      };

      const conflictsPrevDay = busySlots.some(busy => this.slotsOverlap(prevDaySlot, busy));
      if (!conflictsPrevDay) {
        alternatives.push(prevDaySlot);
      }
    }

    // Return top 3 alternatives
    return alternatives.slice(0, 3);
  }

  /**
   * Filter time slots by working hours
   */
  private filterByWorkingHours(
    slots: TimeSlot[],
    preferences: any
  ): TimeSlot[] {
    const workingStart = this.parseTime(preferences.workingHoursStart); // e.g., "09:00"
    const workingEnd = this.parseTime(preferences.workingHoursEnd); // e.g., "17:00"

    return slots.filter(slot => {
      const slotStartTime = slot.start.getHours() * 60 + slot.start.getMinutes();
      const slotEndTime = slot.end.getHours() * 60 + slot.end.getMinutes();

      return slotStartTime >= workingStart && slotEndTime <= workingEnd;
    });
  }

  /**
   * Generate meeting slots from free periods
   */
  private generateMeetingSlots(
    freeSlots: TimeSlot[],
    durationMinutes: number,
    bufferMinutes: number
  ): TimeSlot[] {
    const meetingSlots: TimeSlot[] = [];

    for (const free of freeSlots) {
      const freeDurationMs = free.end.getTime() - free.start.getTime();
      const requiredMs = (durationMinutes + bufferMinutes) * 60 * 1000;

      if (freeDurationMs >= requiredMs) {
        // Can fit a meeting in this free slot
        const meetingEnd = new Date(free.start.getTime() + durationMinutes * 60 * 1000);

        meetingSlots.push({
          start: free.start,
          end: meetingEnd
        });

        // Could generate multiple slots from one long free period
        // For simplicity, just take the first available slot
      }
    }

    return meetingSlots;
  }

  /**
   * Get minimum start time from proposed slots
   */
  private getMinTime(slots: TimeSlot[]): Date {
    return new Date(Math.min(...slots.map(s => s.start.getTime())));
  }

  /**
   * Get maximum end time from proposed slots
   */
  private getMaxTime(slots: TimeSlot[]): Date {
    return new Date(Math.max(...slots.map(s => s.end.getTime())));
  }

  /**
   * Get next business day (skip weekends)
   */
  private getNextBusinessDay(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // Skip weekends
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }

    return tomorrow;
  }

  /**
   * Parse time string "HH:MM" to minutes since midnight
   */
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
