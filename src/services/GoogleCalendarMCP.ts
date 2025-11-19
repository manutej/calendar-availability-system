// Google Calendar MCP Client - Calendar data provider
// Handles OAuth2, event sync, and availability calculations

import { createLogger } from '../utils/logger';
import { query } from '../utils/database';
import { Calendar, CalendarEvent, TimeSlot } from '../types';

const logger = createLogger('GoogleCalendarMCP');

export class GoogleCalendarMCP {
  /**
   * Connect a Google Calendar account via OAuth2
   */
  async connect(userId: string, oauth2Code: string): Promise<Calendar> {
    logger.info('Connecting Google Calendar', { userId });

    // TODO: Exchange OAuth2 code for tokens via MCP
    // For now, create a placeholder calendar
    const result = await query(
      `INSERT INTO calendars (user_id, type, name, external_id, connection_details, sync_status)
       VALUES ($1, 'google', 'Primary Calendar', 'primary', $2, 'active')
       RETURNING *`,
      [userId, JSON.stringify({ oauth2Code, connectedAt: new Date() })]
    );

    logger.info('Google Calendar connected', { calendarId: result.rows[0].id });
    return this.mapToCalendar(result.rows[0]);
  }

  /**
   * Sync events from Google Calendar
   */
  async syncEvents(calendarId: string): Promise<number> {
    logger.info('Syncing calendar events', { calendarId });

    try {
      // TODO: Fetch events from Google Calendar API via MCP
      // For now, return mock sync
      const events = await this.fetchEventsFromGoogle(calendarId);

      // Upsert events into database
      let syncedCount = 0;
      for (const event of events) {
        await this.upsertEvent(calendarId, event);
        syncedCount++;
      }

      // Update calendar sync status
      await query(
        `UPDATE calendars SET last_sync_at = CURRENT_TIMESTAMP, sync_status = 'active' WHERE id = $1`,
        [calendarId]
      );

      logger.info('Calendar sync complete', { calendarId, eventCount: syncedCount });
      return syncedCount;
    } catch (error: any) {
      logger.error('Calendar sync failed', { calendarId, error: error.message });
      await query(
        `UPDATE calendars SET sync_status = 'error', last_error = $1 WHERE id = $2`,
        [error.message, calendarId]
      );
      throw error;
    }
  }

  /**
   * Get events for a time range
   */
  async getEvents(
    calendarId: string,
    startTime: Date,
    endTime: Date
  ): Promise<CalendarEvent[]> {
    const result = await query(
      `SELECT * FROM calendar_events
       WHERE calendar_id = $1
         AND start_time < $3
         AND end_time > $2
         AND status != 'cancelled'
       ORDER BY start_time ASC`,
      [calendarId, startTime, endTime]
    );

    return result.rows.map(row => this.mapToEvent(row));
  }

  /**
   * Get all calendars for a user
   */
  async getCalendarsForUser(userId: string): Promise<Calendar[]> {
    const result = await query(
      `SELECT * FROM calendars WHERE user_id = $1 AND sync_status = 'active'`,
      [userId]
    );

    return result.rows.map(row => this.mapToCalendar(row));
  }

  /**
   * Calculate free/busy periods for a user
   */
  async getFreeBusySlots(
    userId: string,
    startTime: Date,
    endTime: Date
  ): Promise<{ free: TimeSlot[]; busy: TimeSlot[] }> {
    // Get all user calendars
    const calendars = await this.getCalendarsForUser(userId);

    if (calendars.length === 0) {
      logger.warn('No calendars found for user', { userId });
      return { free: [], busy: [] };
    }

    // Get all events across all calendars
    const allEvents: CalendarEvent[] = [];
    for (const calendar of calendars) {
      const events = await this.getEvents(calendar.id, startTime, endTime);
      allEvents.push(...events);
    }

    // Convert events to busy slots
    const busySlots: TimeSlot[] = allEvents
      .filter(event => !event.isAllDay) // Skip all-day events for now
      .map(event => ({
        start: event.startTime,
        end: event.endTime
      }));

    // Calculate free slots (simplified - would need more logic for production)
    const freeSlots = this.calculateFreeSlots(startTime, endTime, busySlots);

    logger.debug('Calculated free/busy slots', {
      userId,
      freeCount: freeSlots.length,
      busyCount: busySlots.length
    });

    return { free: freeSlots, busy: busySlots };
  }

  /**
   * Create a calendar event
   */
  async createEvent(
    calendarId: string,
    eventData: {
      title: string;
      startTime: Date;
      endTime: Date;
      description?: string;
      attendees?: Array<{ email: string; name?: string }>;
      location?: string;
    }
  ): Promise<CalendarEvent> {
    logger.info('Creating calendar event', { calendarId, title: eventData.title });

    // TODO: Create event via Google Calendar API through MCP
    // For now, create in database only
    const externalId = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await query(
      `INSERT INTO calendar_events
       (calendar_id, external_id, title, description, start_time, end_time, status, attendees, location)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7, $8)
       RETURNING *`,
      [
        calendarId,
        externalId,
        eventData.title,
        eventData.description || null,
        eventData.startTime,
        eventData.endTime,
        JSON.stringify(eventData.attendees || []),
        eventData.location || null
      ]
    );

    logger.info('Event created', { eventId: result.rows[0].id, externalId });
    return this.mapToEvent(result.rows[0]);
  }

  /**
   * Disconnect calendar
   */
  async disconnect(calendarId: string): Promise<void> {
    logger.info('Disconnecting calendar', { calendarId });

    // TODO: Revoke OAuth tokens via MCP
    await query(
      `UPDATE calendars SET sync_status = 'paused' WHERE id = $1`,
      [calendarId]
    );
  }

  // ========== PRIVATE METHODS ==========

  /**
   * Fetch events from Google Calendar API (mock for now)
   */
  private async fetchEventsFromGoogle(calendarId: string): Promise<any[]> {
    // TODO: Implement actual MCP call to Google Calendar API
    // For now, return empty array
    logger.debug('Fetching events from Google Calendar (mock)', { calendarId });
    return [];
  }

  /**
   * Upsert event into database
   */
  private async upsertEvent(calendarId: string, event: any): Promise<void> {
    await query(
      `INSERT INTO calendar_events
       (calendar_id, external_id, title, description, start_time, end_time, is_all_day, status, attendees)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (calendar_id, external_id)
       DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         is_all_day = EXCLUDED.is_all_day,
         status = EXCLUDED.status,
         attendees = EXCLUDED.attendees,
         updated_at = CURRENT_TIMESTAMP`,
      [
        calendarId,
        event.externalId,
        event.title,
        event.description || null,
        event.startTime,
        event.endTime,
        event.isAllDay || false,
        event.status || 'confirmed',
        JSON.stringify(event.attendees || [])
      ]
    );
  }

  /**
   * Calculate free slots from busy periods
   */
  private calculateFreeSlots(
    startTime: Date,
    endTime: Date,
    busySlots: TimeSlot[]
  ): TimeSlot[] {
    if (busySlots.length === 0) {
      return [{ start: startTime, end: endTime }];
    }

    // Sort busy slots by start time
    const sorted = [...busySlots].sort((a, b) => a.start.getTime() - b.start.getTime());

    const freeSlots: TimeSlot[] = [];
    let currentTime = startTime;

    for (const busySlot of sorted) {
      // If there's a gap before this busy slot
      if (currentTime < busySlot.start) {
        freeSlots.push({
          start: currentTime,
          end: busySlot.start
        });
      }

      // Move current time to end of busy slot (or keep it if busy slot ends earlier)
      currentTime = new Date(Math.max(currentTime.getTime(), busySlot.end.getTime()));
    }

    // Add final free slot if there's time remaining
    if (currentTime < endTime) {
      freeSlots.push({
        start: currentTime,
        end: endTime
      });
    }

    return freeSlots;
  }

  /**
   * Map database row to Calendar
   */
  private mapToCalendar(row: any): Calendar {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      name: row.name,
      externalId: row.external_id,
      connectionDetails: typeof row.connection_details === 'string'
        ? JSON.parse(row.connection_details)
        : row.connection_details,
      syncStatus: row.sync_status,
      lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at) : undefined,
      lastError: row.last_error,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Map database row to CalendarEvent
   */
  private mapToEvent(row: any): CalendarEvent {
    return {
      id: row.id,
      calendarId: row.calendar_id,
      externalId: row.external_id,
      title: row.title,
      description: row.description,
      startTime: new Date(row.start_time),
      endTime: new Date(row.end_time),
      isAllDay: row.is_all_day,
      status: row.status,
      recurrenceRule: row.recurrence_rule,
      attendees: typeof row.attendees === 'string'
        ? JSON.parse(row.attendees)
        : row.attendees || [],
      location: row.location,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
