import { test, expect } from './fixtures/test-data';

test.describe('API Health Endpoints E2E', () => {
  test('should return healthy status from health endpoint', async ({ request }) => {
    const response = await request.get('/trpc/health.status');
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.result.data.status).toBe('healthy');
    expect(body.result.data.timestamp).toBeDefined();
    expect(body.result.data.database).toBe('connected');
  });

  test('should respond to ping endpoint', async ({ request }) => {
    const response = await request.get('/trpc/health.ping');
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.result.data.message).toBe('pong');
    expect(body.result.data.timestamp).toBeDefined();
  });

  test('should return ready status', async ({ request }) => {
    const response = await request.get('/trpc/health.ready');
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.result.data.ready).toBe(true);
    expect(body.result.data.services).toBeDefined();
    expect(Array.isArray(body.result.data.services)).toBe(true);
  });

  test('should handle multiple concurrent health checks', async ({ request }) => {
    const promises = Array.from({ length: 10 }, () => 
      request.get('/trpc/health.status')
    );

    const responses = await Promise.all(promises);
    
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });

    const bodies = await Promise.all(responses.map(r => r.json()));
    bodies.forEach(body => {
      expect(body.result.data.status).toBe('healthy');
    });
  });

  test('should respond within acceptable time limits', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('/trpc/health.status');
    const responseTime = Date.now() - startTime;

    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
  });

  test('should maintain consistent response format', async ({ request }) => {
    const healthResponse = await request.get('/trpc/health.status');
    const pingResponse = await request.get('/trpc/health.ping');
    const readyResponse = await request.get('/trpc/health.ready');

    const healthBody = await healthResponse.json();
    const pingBody = await pingResponse.json();
    const readyBody = await readyResponse.json();

    // All should have tRPC response format
    expect(healthBody).toHaveProperty('result');
    expect(healthBody.result).toHaveProperty('data');
    
    expect(pingBody).toHaveProperty('result');
    expect(pingBody.result).toHaveProperty('data');
    
    expect(readyBody).toHaveProperty('result');
    expect(readyBody.result).toHaveProperty('data');
  });

  test('should handle invalid endpoints gracefully', async ({ request }) => {
    const response = await request.get('/trpc/health.nonexistent');
    
    // Should return 404 or appropriate error status
    expect([400, 404, 405]).toContain(response.status());
  });

  test('should support different HTTP methods appropriately', async ({ request }) => {
    // GET should work
    const getResponse = await request.get('/trpc/health.status');
    expect(getResponse.status()).toBe(200);

    // POST might not be supported for health checks
    const postResponse = await request.post('/trpc/health.status');
    // Accept either success or method not allowed
    expect([200, 405]).toContain(postResponse.status());
  });
});