// Integration tests for REST API endpoints
// NOTE: These tests require a running PostgreSQL database
// They will be skipped if database is not available

import request from 'supertest';

// Check if database is available before running tests
let dbAvailable = false;
let app: any;
let query: any;

beforeAll(async () => {
  try {
    const dbModule = await import('../../src/utils/database');
    query = dbModule.query;
    await query('SELECT 1');
    dbAvailable = true;
    const serverModule = await import('../../src/server');
    app = serverModule.default;
  } catch (error) {
    console.log('⚠️  Database not available - skipping integration tests');
    console.log('   To run integration tests, start PostgreSQL and configure .env');
    dbAvailable = false;
  }
});

const describeIfDb = () => dbAvailable ? describe : describe.skip;

describeIfDb()('Automation API Integration Tests', () => {
  const testUserId = 'test-api-user';
  const authHeader = { 'x-user-id': testUserId };

  beforeAll(async () => {
    if (!dbAvailable) return;
    // Create test user
    await query(
      `INSERT INTO users (id, email, full_name) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [testUserId, 'apitest@example.com', 'API Test User']
    );
  });

  afterAll(async () => {
    if (!dbAvailable) return;
    // Cleanup
    await query('DELETE FROM automation_audit_log WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM user_preferences WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM circuit_breaker_state WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  describe('GET /api/automation/settings', () => {
    it('should return default settings for new user', async () => {
      const response = await request(app)
        .get('/api/automation/settings')
        .set(authHeader)
        .expect(200);

      expect(response.body).toHaveProperty('automationEnabled');
      expect(response.body).toHaveProperty('confidenceThreshold');
      expect(response.body).toHaveProperty('workingHoursStart');
      expect(response.body).toHaveProperty('workingHoursEnd');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/automation/settings')
        .expect(401);
    });
  });

  describe('PUT /api/automation/settings', () => {
    it('should update automation settings', async () => {
      const newSettings = {
        automationEnabled: true,
        confidenceThreshold: 0.90,
        workingHoursStart: '08:00',
        workingHoursEnd: '18:00',
        responseTone: 'casual'
      };

      const response = await request(app)
        .put('/api/automation/settings')
        .set(authHeader)
        .send(newSettings)
        .expect(200);

      expect(response.body.message).toBe('Settings updated successfully');

      // Verify settings were persisted
      const getResponse = await request(app)
        .get('/api/automation/settings')
        .set(authHeader)
        .expect(200);

      expect(getResponse.body.confidenceThreshold).toBe(0.90);
      expect(getResponse.body.workingHoursStart).toBe('08:00');
      expect(getResponse.body.responseTone).toBe('casual');
    });

    it('should validate confidence threshold range', async () => {
      await request(app)
        .put('/api/automation/settings')
        .set(authHeader)
        .send({ confidenceThreshold: 1.5 })
        .expect(400);
    });

    it('should validate working hours format', async () => {
      await request(app)
        .put('/api/automation/settings')
        .set(authHeader)
        .send({ workingHoursStart: '25:00' })
        .expect(400);
    });
  });

  describe('POST /api/automation/vip', () => {
    it('should add email to VIP whitelist', async () => {
      const response = await request(app)
        .post('/api/automation/vip')
        .set(authHeader)
        .send({ email: 'vip@example.com' })
        .expect(200);

      expect(response.body.message).toBe('VIP added successfully');
    });

    it('should validate email format', async () => {
      await request(app)
        .post('/api/automation/vip')
        .set(authHeader)
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  describe('GET /api/automation/vip', () => {
    it('should return VIP list', async () => {
      // Add a VIP first
      await request(app)
        .post('/api/automation/vip')
        .set(authHeader)
        .send({ email: 'boss@example.com' });

      const response = await request(app)
        .get('/api/automation/vip')
        .set(authHeader)
        .expect(200);

      expect(response.body.vips).toBeInstanceOf(Array);
      expect(response.body.vips).toContain('boss@example.com');
    });
  });

  describe('DELETE /api/automation/vip/:email', () => {
    it('should remove email from VIP whitelist', async () => {
      // Add then remove
      await request(app)
        .post('/api/automation/vip')
        .set(authHeader)
        .send({ email: 'temp@example.com' });

      await request(app)
        .delete('/api/automation/vip/temp@example.com')
        .set(authHeader)
        .expect(200);

      // Verify removed
      const response = await request(app)
        .get('/api/automation/vip')
        .set(authHeader);

      expect(response.body.vips).not.toContain('temp@example.com');
    });
  });

  describe('GET /api/automation/audit', () => {
    it('should return audit log entries', async () => {
      const response = await request(app)
        .get('/api/automation/audit')
        .set(authHeader)
        .expect(200);

      expect(response.body.entries).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/automation/audit?page=1&pageSize=5')
        .set(authHeader)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(5);
    });

    it('should filter by action type', async () => {
      const response = await request(app)
        .get('/api/automation/audit?action=sent_email')
        .set(authHeader)
        .expect(200);

      expect(response.body.entries.every((e: any) => e.action === 'sent_email')).toBe(true);
    });
  });

  describe('GET /api/automation/circuit-breaker', () => {
    it('should return circuit breaker status', async () => {
      const response = await request(app)
        .get('/api/automation/circuit-breaker')
        .set(authHeader)
        .expect(200);

      expect(response.body).toHaveProperty('state');
      expect(response.body).toHaveProperty('consecutiveLowConfidence');
      expect(['closed', 'open', 'half_open']).toContain(response.body.state);
    });
  });

  describe('POST /api/automation/circuit-breaker/reset', () => {
    it('should reset circuit breaker', async () => {
      const response = await request(app)
        .post('/api/automation/circuit-breaker/reset')
        .set(authHeader)
        .expect(200);

      expect(response.body.message).toBe('Circuit breaker reset successfully');

      // Verify state is closed
      const statusResponse = await request(app)
        .get('/api/automation/circuit-breaker')
        .set(authHeader);

      expect(statusResponse.body.state).toBe('closed');
    });
  });

  describe('GET /api/automation/stats', () => {
    it('should return automation statistics', async () => {
      const response = await request(app)
        .get('/api/automation/stats')
        .set(authHeader)
        .expect(200);

      expect(response.body).toHaveProperty('totalRequests');
      expect(response.body).toHaveProperty('autoResponded');
      expect(response.body).toHaveProperty('pendingApproval');
      expect(response.body).toHaveProperty('averageConfidence');
    });

    it('should support time range filtering', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/automation/stats?startDate=${startDate}&endDate=${endDate}`)
        .set(authHeader)
        .expect(200);

      expect(response.body).toHaveProperty('totalRequests');
    });
  });

  describe('POST /api/automation/blacklist', () => {
    it('should add email to blacklist', async () => {
      const response = await request(app)
        .post('/api/automation/blacklist')
        .set(authHeader)
        .send({ email: 'spam@example.com' })
        .expect(200);

      expect(response.body.message).toBe('Email added to blacklist');
    });
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });
  });
});
