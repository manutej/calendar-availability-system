// Automation API Routes - /automation/* endpoints
// User control and oversight of autonomous operations

import { Router, Request, Response } from 'express';
import { AutomationAuditLogger } from '../services/AutomationAuditLogger';
import { UserPreferencesManager } from '../services/UserPreferencesManager';
import { CircuitBreaker } from '../services/CircuitBreaker';
import { createLogger } from '../utils/logger';

const router = Router();
const logger = createLogger('AutomationRoutes');

// Services
const auditLogger = new AutomationAuditLogger();
const preferencesManager = new UserPreferencesManager();
const circuitBreaker = new CircuitBreaker();

// Middleware to extract userId (simplified - would use real auth in production)
function requireAuth(req: Request, res: Response, next: any): void {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  (req as any).userId = userId;
  next();
}

// GET /automation/settings - Get automation configuration
router.get('/settings', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const preferences = await preferencesManager.get(userId);
    const cbState = await circuitBreaker.getState(userId);

    res.json({
      automationEnabled: preferences.automationEnabled,
      confidenceThreshold: preferences.confidenceThreshold,
      vipWhitelist: preferences.vipWhitelist,
      blacklist: preferences.blacklist,
      responseTone: preferences.responseTone,
      workingHours: {
        start: preferences.workingHoursStart,
        end: preferences.workingHoursEnd
      },
      bufferMinutes: preferences.bufferMinutes,
      notificationChannels: preferences.notificationChannels,
      circuitBreakerConfig: preferences.circuitBreakerConfig,
      circuitBreakerState: {
        state: cbState.state,
        consecutiveLowConfidence: cbState.consecutiveLowConfidence
      },
      learningEnabled: preferences.learningEnabled
    });
  } catch (error: any) {
    logger.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /automation/settings - Update automation configuration
router.put('/settings', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const updates = req.body;

    // Validate updates
    if (updates.confidenceThreshold !== undefined) {
      const threshold = parseFloat(updates.confidenceThreshold);
      if (isNaN(threshold) || threshold < 0.7 || threshold > 0.95) {
        res.status(400).json({
          error: 'Confidence threshold must be between 0.70 and 0.95'
        });
        return;
      }
    }

    const updated = await preferencesManager.update(userId, updates);

    logger.info('Settings updated', { userId, updates });
    res.json({
      message: 'Settings updated successfully',
      settings: updated
    });
  } catch (error: any) {
    logger.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// GET /automation/audit - List autonomous actions
router.get('/audit', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const {
      action,
      minConfidence,
      maxConfidence,
      startDate,
      endDate,
      limit,
      offset
    } = req.query;

    const filters: any = {};
    if (action) filters.action = action as string;
    if (minConfidence) filters.minConfidence = parseFloat(minConfidence as string);
    if (maxConfidence) filters.maxConfidence = parseFloat(maxConfidence as string);
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (limit) filters.limit = parseInt(limit as string);
    if (offset) filters.offset = parseInt(offset as string);

    const entries = await auditLogger.getByUser(userId, filters);
    const stats = await auditLogger.getStatistics(userId, 7);

    res.json({
      entries,
      stats,
      pagination: {
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        total: entries.length
      }
    });
  } catch (error: any) {
    logger.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// GET /automation/audit/:auditId - Get detailed audit entry
router.get('/audit/:auditId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const auditId = req.params.auditId || '';
    const entry = await auditLogger.getById(auditId);

    if (!entry) {
      res.status(404).json({ error: 'Audit entry not found' });
      return;
    }

    // Verify user owns this entry
    const userId = (req as any).userId;
    if (entry.userId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json(entry);
  } catch (error: any) {
    logger.error('Error fetching audit entry:', error);
    res.status(500).json({ error: 'Failed to fetch audit entry' });
  }
});

// POST /automation/audit/:auditId/override - Override autonomous decision
router.post('/audit/:auditId/override', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const auditId = req.params.auditId || '';
    const { override, reason } = req.body;

    if (!['approved', 'retracted', 'marked_incorrect'].includes(override)) {
      res.status(400).json({
        error: 'Invalid override value. Must be: approved, retracted, or marked_incorrect'
      });
    }

    await auditLogger.recordOverride(auditId, override as any, reason || undefined);

    logger.info('User override recorded', { auditId, override });
    res.json({
      message: 'Override recorded successfully',
      auditId,
      override
    });
  } catch (error: any) {
    logger.error('Error recording override:', error);
    res.status(500).json({ error: 'Failed to record override' });
  }
});

// GET /automation/vip - Get VIP whitelist
router.get('/vip', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const preferences = await preferencesManager.get(userId);

    res.json({
      vipWhitelist: preferences.vipWhitelist
    });
  } catch (error: any) {
    logger.error('Error fetching VIP whitelist:', error);
    res.status(500).json({ error: 'Failed to fetch VIP whitelist' });
  }
});

// POST /automation/vip - Add to VIP whitelist
router.post('/vip', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Valid email required' });
    }

    await preferencesManager.addToVipWhitelist(userId, email);

    logger.info('Added to VIP whitelist', { userId, email });
    res.json({
      message: 'Email added to VIP whitelist',
      email
    });
  } catch (error: any) {
    logger.error('Error adding to VIP whitelist:', error);
    res.status(500).json({ error: 'Failed to add to VIP whitelist' });
  }
});

// DELETE /automation/vip/:email - Remove from VIP whitelist
router.delete('/vip/:email', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const email = decodeURIComponent(req.params.email || '');

    await preferencesManager.removeFromVipWhitelist(userId, email);

    logger.info('Removed from VIP whitelist', { userId, email });
    res.json({
      message: 'Email removed from VIP whitelist',
      email
    });
  } catch (error: any) {
    logger.error('Error removing from VIP whitelist:', error);
    res.status(500).json({ error: 'Failed to remove from VIP whitelist' });
  }
});

// GET /automation/blacklist - Get blacklist
router.get('/blacklist', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const preferences = await preferencesManager.get(userId);

    res.json({
      blacklist: preferences.blacklist
    });
  } catch (error: any) {
    logger.error('Error fetching blacklist:', error);
    res.status(500).json({ error: 'Failed to fetch blacklist' });
  }
});

// POST /automation/blacklist - Add to blacklist
router.post('/blacklist', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Valid email required' });
    }

    await preferencesManager.addToBlacklist(userId, email);

    logger.info('Added to blacklist', { userId, email });
    res.json({
      message: 'Email added to blacklist',
      email
    });
  } catch (error: any) {
    logger.error('Error adding to blacklist:', error);
    res.status(500).json({ error: 'Failed to add to blacklist' });
  }
});

// DELETE /automation/blacklist/:email - Remove from blacklist
router.delete('/blacklist/:email', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const email = decodeURIComponent(req.params.email || '');

    await preferencesManager.removeFromBlacklist(userId, email);

    logger.info('Removed from blacklist', { userId, email });
    res.json({
      message: 'Email removed from blacklist',
      email
    });
  } catch (error: any) {
    logger.error('Error removing from blacklist:', error);
    res.status(500).json({ error: 'Failed to remove from blacklist' });
  }
});

// GET /automation/circuit-breaker - Get circuit breaker status
router.get('/circuit-breaker', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const state = await circuitBreaker.getState(userId);

    res.json({
      state: state.state,
      consecutiveLowConfidence: state.consecutiveLowConfidence,
      lastLowConfidenceAt: state.lastLowConfidenceAt,
      openedAt: state.openedAt,
      closesAt: state.closesAt,
      manualOverride: state.manualOverride
    });
  } catch (error: any) {
    logger.error('Error fetching circuit breaker state:', error);
    res.status(500).json({ error: 'Failed to fetch circuit breaker state' });
  }
});

// POST /automation/circuit-breaker/reset - Manually reset circuit breaker
router.post('/circuit-breaker/reset', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    await circuitBreaker.manualOverride(userId, true);

    logger.info('Circuit breaker manually reset', { userId });
    res.json({
      message: 'Circuit breaker reset successfully',
      state: 'closed'
    });
  } catch (error: any) {
    logger.error('Error resetting circuit breaker:', error);
    res.status(500).json({ error: 'Failed to reset circuit breaker' });
  }
});

// GET /automation/stats - Get automation statistics
router.get('/stats', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const days = parseInt(req.query.days as string) || 7;

    const stats = await auditLogger.getStatistics(userId, days);
    const weeklyDigest = await auditLogger.getWeeklyDigest(userId);

    res.json({
      period: `${days} days`,
      ...stats,
      weeklyDigest
    });
  } catch (error: any) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
