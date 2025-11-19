// Circuit Breaker - Safety mechanism to pause automation after consecutive low-confidence decisions
// Article X: Safety Mechanisms

import { createLogger } from '../utils/logger';
import { query } from '../utils/database';
import { CircuitBreakerState } from '../types';

const logger = createLogger('CircuitBreaker');

export class CircuitBreaker {
  /**
   * Check if circuit breaker is OPEN (automation paused)
   */
  async isOpen(userId: string): Promise<boolean> {
    const state = await this.getState(userId);

    if (state.state === 'open') {
      // Check if cooldown period has passed
      if (state.closesAt && new Date() >= state.closesAt) {
        await this.transitionToHalfOpen(userId);
        return false; // Half-open allows testing
      }
      return true; // Still open
    }

    return false;
  }

  /**
   * Get current circuit breaker state for user
   */
  async getState(userId: string): Promise<CircuitBreakerState> {
    const result = await query(
      `SELECT * FROM circuit_breaker_state WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Initialize circuit breaker for new user
      return await this.initialize(userId);
    }

    return this.mapToState(result.rows[0]);
  }

  /**
   * Initialize circuit breaker for new user
   */
  async initialize(userId: string): Promise<CircuitBreakerState> {
    const result = await query(
      `INSERT INTO circuit_breaker_state (user_id, state, consecutive_low_confidence)
       VALUES ($1, 'closed', 0)
       RETURNING *`,
      [userId]
    );

    logger.info('Initialized circuit breaker', { userId });
    return this.mapToState(result.rows[0]);
  }

  /**
   * Record low-confidence decision (increment counter)
   */
  async recordLowConfidence(userId: string, maxAllowed: number = 5): Promise<void> {
    logger.debug('Recording low-confidence decision', { userId });

    const result = await query(
      `UPDATE circuit_breaker_state
       SET consecutive_low_confidence = consecutive_low_confidence + 1,
           last_low_confidence_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING consecutive_low_confidence`,
      [userId]
    );

    const count = result.rows[0]?.consecutive_low_confidence || 0;

    if (count >= maxAllowed) {
      await this.open(userId);
      logger.warn('Circuit breaker OPENED due to consecutive low-confidence decisions', {
        userId,
        consecutiveCount: count
      });
    }
  }

  /**
   * Record high-confidence decision (reset counter)
   */
  async recordHighConfidence(userId: string): Promise<void> {
    await query(
      `UPDATE circuit_breaker_state
       SET consecutive_low_confidence = 0
       WHERE user_id = $1`,
      [userId]
    );

    logger.debug('Reset low-confidence counter', { userId });
  }

  /**
   * Open circuit breaker (pause automation)
   */
  async open(userId: string, cooldownMinutes: number = 60): Promise<void> {
    const closesAt = new Date(Date.now() + cooldownMinutes * 60 * 1000);

    await query(
      `UPDATE circuit_breaker_state
       SET state = 'open',
           opened_at = CURRENT_TIMESTAMP,
           closes_at = $1
       WHERE user_id = $2`,
      [closesAt, userId]
    );

    logger.warn('Circuit breaker OPENED', {
      userId,
      closesAt: closesAt.toISOString(),
      cooldownMinutes
    });
  }

  /**
   * Transition to half-open (testing state after cooldown)
   */
  async transitionToHalfOpen(userId: string): Promise<void> {
    await query(
      `UPDATE circuit_breaker_state
       SET state = 'half_open',
           consecutive_low_confidence = 0
       WHERE user_id = $1`,
      [userId]
    );

    logger.info('Circuit breaker transitioned to HALF-OPEN', { userId });
  }

  /**
   * Close circuit breaker (resume normal automation)
   */
  async close(userId: string): Promise<void> {
    await query(
      `UPDATE circuit_breaker_state
       SET state = 'closed',
           consecutive_low_confidence = 0,
           opened_at = NULL,
           closes_at = NULL
       WHERE user_id = $1`,
      [userId]
    );

    logger.info('Circuit breaker CLOSED (automation resumed)', { userId });
  }

  /**
   * Manual override by user (force close)
   */
  async manualOverride(userId: string, forceClose: boolean): Promise<void> {
    if (forceClose) {
      await query(
        `UPDATE circuit_breaker_state
         SET state = 'closed',
             consecutive_low_confidence = 0,
             manual_override = true
         WHERE user_id = $1`,
        [userId]
      );

      logger.info('Circuit breaker manually CLOSED by user', { userId });
    } else {
      await query(
        `UPDATE circuit_breaker_state
         SET manual_override = false
         WHERE user_id = $1`,
        [userId]
      );
    }
  }

  /**
   * Map database row to CircuitBreakerState
   */
  private mapToState(row: any): CircuitBreakerState {
    return {
      id: row.id,
      userId: row.user_id,
      state: row.state,
      consecutiveLowConfidence: row.consecutive_low_confidence,
      lastLowConfidenceAt: row.last_low_confidence_at ? new Date(row.last_low_confidence_at) : undefined,
      openedAt: row.opened_at ? new Date(row.opened_at) : undefined,
      closesAt: row.closes_at ? new Date(row.closes_at) : undefined,
      manualOverride: row.manual_override,
      updatedAt: new Date(row.updated_at)
    };
  }
}
