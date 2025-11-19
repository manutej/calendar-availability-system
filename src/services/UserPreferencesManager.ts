// User Preferences Manager - CRUD operations for user automation settings
// Manages VIP whitelist, blacklist, confidence threshold, etc.

import { createLogger } from '../utils/logger';
import { query } from '../utils/database';
import { UserPreferences } from '../types';

const logger = createLogger('UserPreferencesManager');

export class UserPreferencesManager {
  /**
   * Get user preferences (create default if not exists)
   */
  async get(userId: string): Promise<UserPreferences> {
    const result = await query(
      `SELECT * FROM user_preferences WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return await this.createDefault(userId);
    }

    return this.mapToPreferences(result.rows[0]);
  }

  /**
   * Create default preferences for new user
   */
  async createDefault(userId: string): Promise<UserPreferences> {
    logger.info('Creating default preferences', { userId });

    const result = await query(
      `INSERT INTO user_preferences
       (user_id, working_hours_start, working_hours_end, buffer_minutes, default_meeting_duration,
        automation_enabled, confidence_threshold, vip_whitelist, blacklist,
        notification_channels, circuit_breaker_config, learning_enabled, response_tone)
       VALUES ($1, '09:00', '17:00', 15, 30, true, 0.85, '{}', '{}',
               '{"email": true, "push": false, "sms": false}',
               '{"maxLowConfidence": 5, "cooldownMinutes": 60}',
               true, 'professional')
       RETURNING *`,
      [userId]
    );

    return this.mapToPreferences(result.rows[0]);
  }

  /**
   * Update preferences
   */
  async update(
    userId: string,
    updates: Partial<Omit<UserPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<UserPreferences> {
    logger.info('Updating user preferences', { userId, updates });

    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.workingHoursStart !== undefined) {
      fields.push(`working_hours_start = $${paramIndex++}`);
      params.push(updates.workingHoursStart);
    }
    if (updates.workingHoursEnd !== undefined) {
      fields.push(`working_hours_end = $${paramIndex++}`);
      params.push(updates.workingHoursEnd);
    }
    if (updates.bufferMinutes !== undefined) {
      fields.push(`buffer_minutes = $${paramIndex++}`);
      params.push(updates.bufferMinutes);
    }
    if (updates.defaultMeetingDuration !== undefined) {
      fields.push(`default_meeting_duration = $${paramIndex++}`);
      params.push(updates.defaultMeetingDuration);
    }
    if (updates.automationEnabled !== undefined) {
      fields.push(`automation_enabled = $${paramIndex++}`);
      params.push(updates.automationEnabled);
    }
    if (updates.confidenceThreshold !== undefined) {
      // Validate threshold is between 0.70 and 0.95
      const threshold = Math.max(0.70, Math.min(0.95, updates.confidenceThreshold));
      fields.push(`confidence_threshold = $${paramIndex++}`);
      params.push(threshold);
    }
    if (updates.vipWhitelist !== undefined) {
      fields.push(`vip_whitelist = $${paramIndex++}`);
      params.push(updates.vipWhitelist);
    }
    if (updates.blacklist !== undefined) {
      fields.push(`blacklist = $${paramIndex++}`);
      params.push(updates.blacklist);
    }
    if (updates.notificationChannels !== undefined) {
      fields.push(`notification_channels = $${paramIndex++}`);
      params.push(JSON.stringify(updates.notificationChannels));
    }
    if (updates.circuitBreakerConfig !== undefined) {
      fields.push(`circuit_breaker_config = $${paramIndex++}`);
      params.push(JSON.stringify(updates.circuitBreakerConfig));
    }
    if (updates.learningEnabled !== undefined) {
      fields.push(`learning_enabled = $${paramIndex++}`);
      params.push(updates.learningEnabled);
    }
    if (updates.responseTone !== undefined) {
      fields.push(`response_tone = $${paramIndex++}`);
      params.push(updates.responseTone);
    }

    if (fields.length === 0) {
      logger.warn('No fields to update', { userId });
      return await this.get(userId);
    }

    params.push(userId); // For WHERE clause
    const result = await query(
      `UPDATE user_preferences
       SET ${fields.join(', ')}
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new Error(`Failed to update preferences for user ${userId}`);
    }

    logger.info('Preferences updated successfully', { userId });
    return this.mapToPreferences(result.rows[0]);
  }

  /**
   * Add email to VIP whitelist
   */
  async addToVipWhitelist(userId: string, email: string): Promise<void> {
    logger.info('Adding to VIP whitelist', { userId, email });

    await query(
      `UPDATE user_preferences
       SET vip_whitelist = array_append(vip_whitelist, $1)
       WHERE user_id = $2 AND NOT ($1 = ANY(vip_whitelist))`,
      [email.toLowerCase(), userId]
    );
  }

  /**
   * Remove email from VIP whitelist
   */
  async removeFromVipWhitelist(userId: string, email: string): Promise<void> {
    logger.info('Removing from VIP whitelist', { userId, email });

    await query(
      `UPDATE user_preferences
       SET vip_whitelist = array_remove(vip_whitelist, $1)
       WHERE user_id = $2`,
      [email.toLowerCase(), userId]
    );
  }

  /**
   * Add email to blacklist
   */
  async addToBlacklist(userId: string, email: string): Promise<void> {
    logger.info('Adding to blacklist', { userId, email });

    await query(
      `UPDATE user_preferences
       SET blacklist = array_append(blacklist, $1)
       WHERE user_id = $2 AND NOT ($1 = ANY(blacklist))`,
      [email.toLowerCase(), userId]
    );
  }

  /**
   * Remove email from blacklist
   */
  async removeFromBlacklist(userId: string, email: string): Promise<void> {
    logger.info('Removing from blacklist', { userId, email });

    await query(
      `UPDATE user_preferences
       SET blacklist = array_remove(blacklist, $1)
       WHERE user_id = $2`,
      [email.toLowerCase(), userId]
    );
  }

  /**
   * Check if email is in VIP whitelist
   */
  async isVip(userId: string, email: string): Promise<boolean> {
    const result = await query(
      `SELECT $1 = ANY(vip_whitelist) as is_vip
       FROM user_preferences
       WHERE user_id = $2`,
      [email.toLowerCase(), userId]
    );

    return result.rows[0]?.is_vip || false;
  }

  /**
   * Check if email is in blacklist
   */
  async isBlacklisted(userId: string, email: string): Promise<boolean> {
    const result = await query(
      `SELECT $1 = ANY(blacklist) as is_blacklisted
       FROM user_preferences
       WHERE user_id = $2`,
      [email.toLowerCase(), userId]
    );

    return result.rows[0]?.is_blacklisted || false;
  }

  /**
   * Map database row to UserPreferences
   */
  private mapToPreferences(row: any): UserPreferences {
    return {
      id: row.id,
      userId: row.user_id,
      workingHoursStart: row.working_hours_start,
      workingHoursEnd: row.working_hours_end,
      bufferMinutes: row.buffer_minutes,
      defaultMeetingDuration: row.default_meeting_duration,
      automationEnabled: row.automation_enabled,
      confidenceThreshold: parseFloat(row.confidence_threshold),
      vipWhitelist: row.vip_whitelist || [],
      blacklist: row.blacklist || [],
      notificationChannels: typeof row.notification_channels === 'string'
        ? JSON.parse(row.notification_channels)
        : row.notification_channels,
      circuitBreakerConfig: typeof row.circuit_breaker_config === 'string'
        ? JSON.parse(row.circuit_breaker_config)
        : row.circuit_breaker_config,
      learningEnabled: row.learning_enabled,
      responseTone: row.response_tone,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
