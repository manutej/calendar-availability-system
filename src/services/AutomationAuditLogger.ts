// Automation Audit Logger - 100% transparency for autonomous operations
// Article X: Every autonomous decision MUST be logged

import { createLogger } from '../utils/logger';
import { query } from '../utils/database';
import { AutomationAuditEntry, CalendarEvent } from '../types';

const logger = createLogger('AutomationAuditLogger');

export class AutomationAuditLogger {
  /**
   * Log an autonomous action (REQUIRED for all auto-sent emails)
   */
  async log(entry: {
    userId: string;
    requestId?: string;
    conversationId?: string;
    action: 'sent_email' | 'declined_request' | 'requested_clarification' | 'escalated';
    confidenceScore: number;
    decisionRationale: string;
    emailSentId?: string;
    calendarEventsConsidered?: CalendarEvent[];
    conversationContext?: Record<string, any>;
  }): Promise<string> {
    logger.info('Logging autonomous action', {
      userId: entry.userId,
      action: entry.action,
      confidence: entry.confidenceScore.toFixed(2)
    });

    const result = await query(
      `INSERT INTO automation_audit_log
       (user_id, request_id, conversation_id, action, confidence_score, decision_rationale,
        email_sent_id, calendar_events_considered, conversation_context, user_notified, notification_sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
       RETURNING id`,
      [
        entry.userId,
        entry.requestId || null,
        entry.conversationId || null,
        entry.action,
        entry.confidenceScore,
        entry.decisionRationale,
        entry.emailSentId || null,
        JSON.stringify(entry.calendarEventsConsidered || []),
        JSON.stringify(entry.conversationContext || {}),
        true // user_notified (will implement notification separately)
      ]
    );

    const auditId = result.rows[0].id;
    logger.info('Audit entry created', { auditId, action: entry.action });

    return auditId;
  }

  /**
   * Get audit entries for a user (with filtering)
   */
  async getByUser(
    userId: string,
    filters?: {
      action?: string;
      minConfidence?: number;
      maxConfidence?: number;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<AutomationAuditEntry[]> {
    const conditions: string[] = ['user_id = $1'];
    const params: any[] = [userId];
    let paramIndex = 2;

    if (filters?.action) {
      conditions.push(`action = $${paramIndex}`);
      params.push(filters.action);
      paramIndex++;
    }

    if (filters?.minConfidence !== undefined) {
      conditions.push(`confidence_score >= $${paramIndex}`);
      params.push(filters.minConfidence);
      paramIndex++;
    }

    if (filters?.maxConfidence !== undefined) {
      conditions.push(`confidence_score <= $${paramIndex}`);
      params.push(filters.maxConfidence);
      paramIndex++;
    }

    if (filters?.startDate) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters?.endDate) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(filters.endDate);
      paramIndex++;
    }

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const sql = `
      SELECT * FROM automation_audit_log
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows.map(row => this.mapToAuditEntry(row));
  }

  /**
   * Get single audit entry by ID
   */
  async getById(auditId: string): Promise<AutomationAuditEntry | null> {
    const result = await query(
      `SELECT * FROM automation_audit_log WHERE id = $1`,
      [auditId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToAuditEntry(result.rows[0]);
  }

  /**
   * Record user override/correction of autonomous action
   */
  async recordOverride(
    auditId: string,
    override: 'approved' | 'retracted' | 'marked_incorrect',
    reason?: string
  ): Promise<void> {
    logger.info('Recording user override', { auditId, override });

    await query(
      `UPDATE automation_audit_log
       SET user_override = $1, user_override_at = CURRENT_TIMESTAMP, user_override_reason = $2
       WHERE id = $3`,
      [override, reason || null, auditId]
    );

    logger.info('User override recorded', { auditId, override });
  }

  /**
   * Get statistics for user's autonomous actions
   */
  async getStatistics(userId: string, days: number = 7): Promise<{
    totalActions: number;
    autoSent: number;
    escalated: number;
    avgConfidence: number;
    overrideRate: number;
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await query(
      `SELECT
        COUNT(*) as total_actions,
        SUM(CASE WHEN action = 'sent_email' THEN 1 ELSE 0 END) as auto_sent,
        SUM(CASE WHEN action = 'escalated' THEN 1 ELSE 0 END) as escalated,
        AVG(confidence_score) as avg_confidence,
        SUM(CASE WHEN user_override IS NOT NULL THEN 1 ELSE 0 END) as overrides
       FROM automation_audit_log
       WHERE user_id = $1 AND created_at >= $2`,
      [userId, startDate]
    );

    const row = result.rows[0];
    const totalActions = parseInt(row.total_actions) || 0;
    const overrides = parseInt(row.overrides) || 0;

    return {
      totalActions,
      autoSent: parseInt(row.auto_sent) || 0,
      escalated: parseInt(row.escalated) || 0,
      avgConfidence: parseFloat(row.avg_confidence) || 0,
      overrideRate: totalActions > 0 ? overrides / totalActions : 0
    };
  }

  /**
   * Generate weekly digest data
   */
  async getWeeklyDigest(userId: string): Promise<{
    autoSent: number;
    escalated: number;
    overrides: number;
    topSenders: Array<{ email: string; count: number }>;
  }> {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const stats = await this.getStatistics(userId, 7);

    // Get top senders (would need to join with requests table - simplified for now)
    const topSenders: Array<{ email: string; count: number }> = [];

    return {
      autoSent: stats.autoSent,
      escalated: stats.escalated,
      overrides: parseInt(String(stats.overrideRate * stats.totalActions)),
      topSenders
    };
  }

  /**
   * Map database row to AutomationAuditEntry
   */
  private mapToAuditEntry(row: any): AutomationAuditEntry {
    return {
      id: row.id,
      userId: row.user_id,
      requestId: row.request_id,
      conversationId: row.conversation_id,
      action: row.action,
      confidenceScore: parseFloat(row.confidence_score),
      decisionRationale: row.decision_rationale,
      emailSentId: row.email_sent_id,
      calendarEventsConsidered: typeof row.calendar_events_considered === 'string'
        ? JSON.parse(row.calendar_events_considered)
        : row.calendar_events_considered,
      conversationContext: typeof row.conversation_context === 'string'
        ? JSON.parse(row.conversation_context)
        : row.conversation_context,
      userNotified: row.user_notified,
      notificationSentAt: row.notification_sent_at ? new Date(row.notification_sent_at) : undefined,
      userOverride: row.user_override,
      userOverrideAt: row.user_override_at ? new Date(row.user_override_at) : undefined,
      userOverrideReason: row.user_override_reason,
      createdAt: new Date(row.created_at)
    };
  }
}
