// Conversation State Machine - Multi-turn email thread tracking
// Manages state transitions: INITIAL → AVAILABILITY_SENT → CONFIRMED → SCHEDULED

import { createLogger } from '../utils/logger';
import { query } from '../utils/database';
import { ConversationState } from '../types';

const logger = createLogger('ConversationStateManager');

export class ConversationStateManager {
  /**
   * Get or create conversation state for an email thread
   */
  async getOrCreate(threadId: string, userId: string): Promise<ConversationState> {
    logger.debug('Getting or creating conversation state', { threadId, userId });

    // Try to find existing conversation
    const existing = await this.findByThreadId(threadId);

    if (existing) {
      logger.debug('Found existing conversation', {
        threadId,
        state: existing.state,
        turnCount: existing.turnCount
      });
      return existing;
    }

    // Create new conversation
    const conversation = await this.create({
      threadId,
      userId,
      state: 'initial',
      turnCount: 1,
      context: {}
    });

    logger.info('Created new conversation state', { threadId, id: conversation.id });
    return conversation;
  }

  /**
   * Find conversation by thread ID
   */
  async findByThreadId(threadId: string): Promise<ConversationState | null> {
    const result = await query(
      `SELECT * FROM conversation_states WHERE thread_id = $1 AND state != 'closed'`,
      [threadId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToConversation(result.rows[0]);
  }

  /**
   * Create new conversation state
   */
  async create(data: {
    threadId: string;
    userId: string;
    state: ConversationState['state'];
    turnCount: number;
    context: Record<string, any>;
    currentRequestId?: string;
  }): Promise<ConversationState> {
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days from now

    const result = await query(
      `INSERT INTO conversation_states
       (thread_id, user_id, state, turn_count, context, current_request_id, expires_at, last_activity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        data.threadId,
        data.userId,
        data.state,
        data.turnCount,
        JSON.stringify(data.context),
        data.currentRequestId || null,
        expiresAt
      ]
    );

    return this.mapToConversation(result.rows[0]);
  }

  /**
   * Transition conversation to new state
   */
  async transition(
    threadId: string,
    newState: ConversationState['state'],
    updates?: {
      currentRequestId?: string;
      context?: Record<string, any>;
    }
  ): Promise<ConversationState> {
    logger.info('Transitioning conversation state', { threadId, newState });

    const conversation = await this.findByThreadId(threadId);
    if (!conversation) {
      throw new Error(`Conversation not found for thread: ${threadId}`);
    }

    // Validate state transition
    this.validateTransition(conversation.state, newState);

    // Build update query
    const updateFields: string[] = ['state = $2', 'turn_count = turn_count + 1', 'last_activity = CURRENT_TIMESTAMP'];
    const params: any[] = [threadId, newState];
    let paramIndex = 3;

    if (updates?.currentRequestId) {
      updateFields.push(`current_request_id = $${paramIndex}`);
      params.push(updates.currentRequestId);
      paramIndex++;
    }

    if (updates?.context) {
      // Merge with existing context
      const mergedContext = { ...conversation.context, ...updates.context };
      updateFields.push(`context = $${paramIndex}`);
      params.push(JSON.stringify(mergedContext));
      paramIndex++;
    }

    const result = await query(
      `UPDATE conversation_states
       SET ${updateFields.join(', ')}
       WHERE thread_id = $1
       RETURNING *`,
      params
    );

    const updated = this.mapToConversation(result.rows[0]);
    logger.info('Conversation state transitioned', {
      threadId,
      oldState: conversation.state,
      newState: updated.state,
      turnCount: updated.turnCount
    });

    return updated;
  }

  /**
   * Update conversation context
   */
  async updateContext(threadId: string, contextUpdate: Record<string, any>): Promise<void> {
    const conversation = await this.findByThreadId(threadId);
    if (!conversation) {
      throw new Error(`Conversation not found for thread: ${threadId}`);
    }

    const mergedContext = { ...conversation.context, ...contextUpdate };

    await query(
      `UPDATE conversation_states
       SET context = $1, last_activity = CURRENT_TIMESTAMP
       WHERE thread_id = $2`,
      [JSON.stringify(mergedContext), threadId]
    );

    logger.debug('Updated conversation context', { threadId, updates: contextUpdate });
  }

  /**
   * Close conversation (final state)
   */
  async close(threadId: string): Promise<void> {
    await query(
      `UPDATE conversation_states
       SET state = 'closed', last_activity = CURRENT_TIMESTAMP
       WHERE thread_id = $1`,
      [threadId]
    );

    logger.info('Closed conversation', { threadId });
  }

  /**
   * Clean up expired conversations
   */
  async cleanupExpired(): Promise<number> {
    const result = await query(
      `UPDATE conversation_states
       SET state = 'closed'
       WHERE expires_at < CURRENT_TIMESTAMP AND state != 'closed'
       RETURNING id`
    );

    const count = result.rowCount || 0;
    if (count > 0) {
      logger.info('Cleaned up expired conversations', { count });
    }

    return count;
  }

  /**
   * Validate state transition is allowed
   */
  private validateTransition(currentState: string, newState: string): void {
    const validTransitions: Record<string, string[]> = {
      'initial': ['availability_sent', 'closed'],
      'availability_sent': ['confirmed', 'initial', 'closed'], // Can go back to initial for clarification
      'confirmed': ['scheduled', 'closed'],
      'scheduled': ['closed'],
      'closed': [] // Terminal state
    };

    const allowed = validTransitions[currentState] || [];
    if (!allowed.includes(newState)) {
      throw new Error(
        `Invalid state transition: ${currentState} → ${newState}. ` +
        `Allowed: ${allowed.join(', ')}`
      );
    }
  }

  /**
   * Map database row to ConversationState
   */
  private mapToConversation(row: any): ConversationState {
    return {
      id: row.id,
      threadId: row.thread_id,
      userId: row.user_id,
      state: row.state,
      turnCount: row.turn_count,
      currentRequestId: row.current_request_id,
      previousRequestIds: row.previous_request_ids || [],
      context: typeof row.context === 'string' ? JSON.parse(row.context) : row.context,
      lastActivity: new Date(row.last_activity),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
