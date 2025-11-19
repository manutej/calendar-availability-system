// Calendar MCP Client - Minimal wrapper for calendar operations
// Pragmatic: Only essential methods, no over-abstraction

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createLogger } from '../utils/logger';

const logger = createLogger('CalendarMCPClient');

export class CalendarMCPClient {
  private client?: Client;
  private connected = false;

  /**
   * Connect to Calendar MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    const mcpServerPath = process.env.CALENDAR_MCP_SERVER_PATH || './mcp-servers/mcp-google-calendar/build/index.js';

    const transport = new StdioClientTransport({
      command: 'node',
      args: [mcpServerPath]
    });

    this.client = new Client({
      name: 'calendar-availability-system',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await this.client.connect(transport);
    this.connected = true;
    logger.info('Connected to Calendar MCP server');
  }

  /**
   * List events in time range
   */
  async listEvents(calendarId: string, timeMin: string, timeMax: string): Promise<any> {
    await this.connect();
    const result = await this.client!.callTool({
      name: 'list_events',
      arguments: { calendarId, timeMin, timeMax }
    });
    return result.content;
  }

  /**
   * Check free/busy for calendars
   */
  async getFreeBusy(calendarIds: string[], timeMin: string, timeMax: string): Promise<any> {
    await this.connect();
    const result = await this.client!.callTool({
      name: 'get_free_busy',
      arguments: {
        timeMin,
        timeMax,
        items: calendarIds.map(id => ({ id }))
      }
    });
    return result.content;
  }

  /**
   * Create calendar event
   */
  async createEvent(calendarId: string, event: {
    summary: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    attendees?: Array<{ email: string }>;
    description?: string;
  }): Promise<any> {
    await this.connect();
    const result = await this.client!.callTool({
      name: 'create_event',
      arguments: { calendarId, ...event }
    });
    logger.info('Event created', { summary: event.summary });
    return result.content;
  }
}
