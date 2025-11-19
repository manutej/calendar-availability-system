// Gmail MCP Client - Minimal wrapper for email operations
// KISS principle: Only what we actually need

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createLogger } from '../utils/logger';

const logger = createLogger('GmailMCPClient');

export class GmailMCPClient {
  private client?: Client;
  private connected = false;

  /**
   * Connect to Gmail MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    const mcpServerPath = process.env.GMAIL_MCP_SERVER_PATH || './mcp-servers/gmail-mcp-server/build/index.js';

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
    logger.info('Connected to Gmail MCP server');
  }

  /**
   * List recent messages (for monitoring inbox)
   */
  async listMessages(query?: string, maxResults = 10): Promise<any> {
    await this.connect();
    const result = await this.client!.callTool({
      name: 'list_messages',
      arguments: { query, maxResults, labelIds: ['INBOX'] }
    });
    return result.content;
  }

  /**
   * Get full message details
   */
  async getMessage(messageId: string): Promise<any> {
    await this.connect();
    const result = await this.client!.callTool({
      name: 'get_message',
      arguments: { messageId, format: 'full' }
    });
    return result.content;
  }

  /**
   * Send email (reply or new)
   */
  async sendMessage(params: {
    to: string[];
    subject: string;
    body: string;
    threadId?: string;
  }): Promise<any> {
    await this.connect();
    const result = await this.client!.callTool({
      name: 'send_message',
      arguments: params
    });
    logger.info('Email sent', { to: params.to, threadId: params.threadId });
    return result.content;
  }

  /**
   * Search messages by query
   */
  async searchMessages(query: string): Promise<any> {
    return this.listMessages(query, 50);
  }
}
