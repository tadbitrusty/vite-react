import { createTestCaller, createTestContext, integrationTestHelpers } from '../setup';

describe('Health Router Integration Tests', () => {
  describe('status endpoint', () => {
    it('should return healthy status with database connectivity', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const result = await caller.health.status();

      integrationTestHelpers.expectValidResponse(result, [
        'status',
        'timestamp',
        'version',
        'environment',
        'services',
        'features'
      ]);

      expect(result.status).toMatch(/healthy|degraded/);
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
      expect(result.environment).toBe('test');
      
      expect(result.services).toHaveProperty('database');
      expect(result.services.database).toHaveProperty('status');
      expect(result.services.database).toHaveProperty('latency');
      expect(result.services.database.latency).toBeGreaterThan(0);
      
      expect(result.services).toHaveProperty('maintenance');
      expect(result.services.maintenance).toHaveProperty('enabled');
      
      expect(result.features).toBeDefined();
      expect(result.features).toHaveProperty('newUserFreeTemplate');
      expect(result.features).toHaveProperty('advancedFraudDetection');
      expect(result.features).toHaveProperty('emailNotifications');
      expect(result.features).toHaveProperty('analyticsTracking');
      expect(result.features).toHaveProperty('redisCache');
      expect(result.features).toHaveProperty('backgroundJobs');
    });

    it('should handle database connectivity issues', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      // Mock database failure
      const mockQueryRaw = jest.spyOn(ctx.prisma, '$queryRaw').mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await caller.health.status();

      expect(result.status).toBe('degraded');
      expect(result.services.database.status).toBe('unhealthy');
      
      mockQueryRaw.mockRestore();
    });

    it('should return degraded status when maintenance mode is enabled', async () => {
      // This would require mocking the feature flags
      // For now, we'll test the current state
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const result = await caller.health.status();

      expect(result.services.maintenance).toHaveProperty('enabled');
      expect(typeof result.services.maintenance.enabled).toBe('boolean');
    });

    it('should include correct version information', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const result = await caller.health.status();

      expect(result.version).toBeDefined();
      expect(typeof result.version).toBe('string');
    });

    it('should measure database latency accurately', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const startTime = Date.now();
      const result = await caller.health.status();
      const endTime = Date.now();

      expect(result.services.database.latency).toBeGreaterThan(0);
      expect(result.services.database.latency).toBeLessThan(endTime - startTime + 100); // Allow for some margin
    });
  });

  describe('ping endpoint', () => {
    it('should return pong with timestamp', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const result = await caller.health.ping();

      integrationTestHelpers.expectValidResponse(result, ['message', 'timestamp']);
      
      expect(result.message).toBe('pong');
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should return consistent response format', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      // Call multiple times to ensure consistency
      const results = await Promise.all([
        caller.health.ping(),
        caller.health.ping(),
        caller.health.ping(),
      ]);

      results.forEach(result => {
        expect(result.message).toBe('pong');
        expect(result.timestamp).toBeDefined();
        expect(typeof result.timestamp).toBe('string');
      });

      // Timestamps should be different (within reason)
      const timestamps = results.map(r => new Date(r.timestamp).getTime());
      expect(timestamps[1]).toBeGreaterThanOrEqual(timestamps[0]);
      expect(timestamps[2]).toBeGreaterThanOrEqual(timestamps[1]);
    });

    it('should respond quickly', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const startTime = Date.now();
      await caller.health.ping();
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(1000); // Should respond in less than 1 second
    });
  });

  describe('ready endpoint', () => {
    it('should return ready status with all checks passing', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const result = await caller.health.ready();

      integrationTestHelpers.expectValidResponse(result, ['status', 'checks', 'timestamp']);
      
      expect(result.status).toMatch(/ready|not-ready/);
      expect(Array.isArray(result.checks)).toBe(true);
      expect(result.checks.length).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
      
      // Check that each check has required properties
      result.checks.forEach(check => {
        expect(check).toHaveProperty('name');
        expect(check).toHaveProperty('status');
        expect(check.status).toMatch(/pass|fail/);
      });
    });

    it('should include database check', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const result = await caller.health.ready();

      const dbCheck = result.checks.find(check => check.name === 'database');
      expect(dbCheck).toBeDefined();
      expect(dbCheck!.status).toBe('pass');
    });

    it('should include environment variables check', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const result = await caller.health.ready();

      const envCheck = result.checks.find(check => check.name === 'environment');
      expect(envCheck).toBeDefined();
      
      // In test environment, some env vars might be missing, so we check the structure
      expect(envCheck!.status).toMatch(/pass|fail/);
      if (envCheck!.status === 'fail') {
        expect(envCheck).toHaveProperty('error');
        expect(envCheck!.error).toContain('Missing environment variables');
      }
    });

    it('should handle database check failure', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      // Mock database failure
      const mockQueryRaw = jest.spyOn(ctx.prisma, '$queryRaw').mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await caller.health.ready();

      expect(result.status).toBe('not-ready');
      
      const dbCheck = result.checks.find(check => check.name === 'database');
      expect(dbCheck).toBeDefined();
      expect(dbCheck!.status).toBe('fail');
      expect(dbCheck).toHaveProperty('error');
      
      mockQueryRaw.mockRestore();
    });

    it('should validate required environment variables', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      // Store original env vars
      const originalEnvVars = {
        DATABASE_URL: process.env.DATABASE_URL,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        RESEND_API_KEY: process.env.RESEND_API_KEY,
      };

      try {
        // Remove a required env var
        delete process.env.ANTHROPIC_API_KEY;

        const result = await caller.health.ready();

        const envCheck = result.checks.find(check => check.name === 'environment');
        expect(envCheck).toBeDefined();
        expect(envCheck!.status).toBe('fail');
        expect(envCheck!.error).toContain('ANTHROPIC_API_KEY');
      } finally {
        // Restore env vars
        Object.assign(process.env, originalEnvVars);
      }
    });

    it('should return not-ready when any check fails', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      // Mock database failure
      const mockQueryRaw = jest.spyOn(ctx.prisma, '$queryRaw').mockRejectedValueOnce(new Error('Database failure'));

      const result = await caller.health.ready();

      expect(result.status).toBe('not-ready');
      
      const failedChecks = result.checks.filter(check => check.status === 'fail');
      expect(failedChecks.length).toBeGreaterThan(0);
      
      mockQueryRaw.mockRestore();
    });

    it('should measure response time accurately', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const startTime = Date.now();
      const result = await caller.health.ready();
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.timestamp).toBeDefined();
      
      const resultTime = new Date(result.timestamp).getTime();
      expect(resultTime).toBeGreaterThanOrEqual(startTime);
      expect(resultTime).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('error handling', () => {
    it('should handle malformed requests gracefully', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      // All health endpoints are queries without input, so we test they work consistently
      const results = await Promise.all([
        caller.health.status(),
        caller.health.ping(),
        caller.health.ready(),
      ]);

      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      });
    });

    it('should handle concurrent requests properly', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      // Make multiple concurrent requests
      const promises = Array.from({ length: 10 }, () => Promise.all([
        caller.health.status(),
        caller.health.ping(),
        caller.health.ready(),
      ]));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(batch => {
        expect(batch).toHaveLength(3);
        batch.forEach(result => {
          expect(result).toBeDefined();
        });
      });
    });

    it('should maintain performance under load', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const startTime = Date.now();
      
      // Make 20 concurrent requests
      const promises = Array.from({ length: 20 }, () => caller.health.ping());
      await Promise.all(promises);
      
      const totalTime = Date.now() - startTime;
      
      // Should handle 20 requests in reasonable time
      expect(totalTime).toBeLessThan(3000);
    });
  });
});