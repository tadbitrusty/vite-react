import { test, expect } from './fixtures/test-data';

test.describe('User Management E2E', () => {
  test('should create new user successfully', async ({ request, testData }) => {
    const createUserPayload = {
      email: testData.validUser.email,
      name: testData.validUser.name,
      phone: testData.validUser.phone,
      location: testData.validUser.location,
    };

    const response = await request.post('/trpc/user.create', {
      data: createUserPayload
    });

    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.result.data.id).toBeDefined();
    expect(body.result.data.email).toBe(testData.validUser.email);
    expect(body.result.data.name).toBe(testData.validUser.name);
    expect(body.result.data.isFirstTime).toBe(true);
    expect(body.result.data.emailVerified).toBe(false);
  });

  test('should retrieve user by ID', async ({ request, testData }) => {
    // First create a user
    const createResponse = await request.post('/trpc/user.create', {
      data: {
        email: 'retrieve-test@example.com',
        name: 'Retrieve Test User',
      }
    });

    const createBody = await createResponse.json();
    const userId = createBody.result.data.id;

    // Then retrieve the user
    const retrieveResponse = await request.get(`/trpc/user.getById?input=${encodeURIComponent(JSON.stringify({ id: userId }))}`);
    
    expect(retrieveResponse.status()).toBe(200);
    
    const retrieveBody = await retrieveResponse.json();
    expect(retrieveBody.result.data.id).toBe(userId);
    expect(retrieveBody.result.data.email).toBe('retrieve-test@example.com');
    expect(retrieveBody.result.data.name).toBe('Retrieve Test User');
  });

  test('should check if email exists', async ({ request, testData }) => {
    // First create a user
    await request.post('/trpc/user.create', {
      data: {
        email: 'exists-test@example.com',
        name: 'Exists Test User',
      }
    });

    // Check if email exists
    const existsResponse = await request.get(`/trpc/user.checkEmailExists?input=${encodeURIComponent(JSON.stringify({ email: 'exists-test@example.com' }))}`);
    
    expect(existsResponse.status()).toBe(200);
    
    const existsBody = await existsResponse.json();
    expect(existsBody.result.data.exists).toBe(true);

    // Check if non-existent email exists
    const notExistsResponse = await request.get(`/trpc/user.checkEmailExists?input=${encodeURIComponent(JSON.stringify({ email: 'nonexistent@example.com' }))}`);
    
    const notExistsBody = await notExistsResponse.json();
    expect(notExistsBody.result.data.exists).toBe(false);
  });

  test('should handle user creation validation', async ({ request }) => {
    // Test invalid email format
    const invalidEmailResponse = await request.post('/trpc/user.create', {
      data: {
        email: 'invalid-email-format',
        name: 'Test User',
      }
    });
    
    expect([400, 422]).toContain(invalidEmailResponse.status());

    // Test empty name
    const emptyNameResponse = await request.post('/trpc/user.create', {
      data: {
        email: 'valid@example.com',
        name: '',
      }
    });
    
    expect([400, 422]).toContain(emptyNameResponse.status());
  });

  test('should prevent duplicate email registration', async ({ request }) => {
    const userPayload = {
      email: 'duplicate-test@example.com',
      name: 'Duplicate Test User',
    };

    // Create first user
    const firstResponse = await request.post('/trpc/user.create', {
      data: userPayload
    });
    
    expect(firstResponse.status()).toBe(200);

    // Try to create second user with same email
    const secondResponse = await request.post('/trpc/user.create', {
      data: userPayload
    });
    
    // Should fail due to unique constraint
    expect([400, 409, 422]).toContain(secondResponse.status());
  });

  test('should handle user creation with optional fields', async ({ request }) => {
    const completeUserPayload = {
      email: 'complete-user@example.com',
      name: 'Complete User',
      phone: '+1-555-0123',
      location: 'Complete City, CC 12345',
    };

    const response = await request.post('/trpc/user.create', {
      data: completeUserPayload
    });

    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.result.data.email).toBe(completeUserPayload.email);
    expect(body.result.data.name).toBe(completeUserPayload.name);
    expect(body.result.data.phone).toBe(completeUserPayload.phone);
    expect(body.result.data.location).toBe(completeUserPayload.location);
  });

  test('should handle concurrent user creation gracefully', async ({ request }) => {
    // Try to create users with same email concurrently
    const userPayload = {
      email: 'concurrent-test@example.com',
      name: 'Concurrent Test User',
    };

    const concurrentRequests = Array.from({ length: 5 }, () =>
      request.post('/trpc/user.create', { data: userPayload })
    );

    const responses = await Promise.all(concurrentRequests.map(req => 
      req.catch(() => ({ status: () => 400 })) // Catch errors and return mock response
    ));

    // Only one should succeed
    const successfulResponses = responses.filter(r => r.status() === 200);
    expect(successfulResponses.length).toBe(1);
  });

  test('should retrieve user with proper data types', async ({ request, testData }) => {
    const createResponse = await request.post('/trpc/user.create', {
      data: {
        email: 'datatype-test@example.com',
        name: 'Data Type Test User',
        phone: '+1-555-0199',
        location: 'DataType City, DT',
      }
    });

    const createBody = await createResponse.json();
    const userId = createBody.result.data.id;

    const retrieveResponse = await request.get(`/trpc/user.getById?input=${encodeURIComponent(JSON.stringify({ id: userId }))}`);
    const retrieveBody = await retrieveResponse.json();
    const user = retrieveBody.result.data;

    // Check data types
    expect(typeof user.id).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(typeof user.name).toBe('string');
    expect(typeof user.isFirstTime).toBe('boolean');
    expect(typeof user.emailVerified).toBe('boolean');
    expect(user.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO date format
    expect(user.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO date format
  });

  test('should handle email existence check edge cases', async ({ request }) => {
    const edgeCaseEmails = [
      'user+tag@example.com',
      'user.with.dots@example.com',
      'user-with-dashes@example.com',
      'user_with_underscores@example.com',
      'user123@subdomain.example.com',
    ];

    for (const email of edgeCaseEmails) {
      // Check non-existence first
      const notExistsResponse = await request.get(`/trpc/user.checkEmailExists?input=${encodeURIComponent(JSON.stringify({ email }))}`);
      const notExistsBody = await notExistsResponse.json();
      expect(notExistsBody.result.data.exists).toBe(false);

      // Create user
      await request.post('/trpc/user.create', {
        data: {
          email,
          name: `Test User for ${email}`,
        }
      });

      // Check existence after creation
      const existsResponse = await request.get(`/trpc/user.checkEmailExists?input=${encodeURIComponent(JSON.stringify({ email }))}`);
      const existsBody = await existsResponse.json();
      expect(existsBody.result.data.exists).toBe(true);
    }
  });

  test('should maintain performance under load', async ({ request }) => {
    const startTime = Date.now();

    // Create 10 users concurrently with different emails
    const loadTestRequests = Array.from({ length: 10 }, (_, i) => 
      request.post('/trpc/user.create', {
        data: {
          email: `load-test-${i}@example.com`,
          name: `Load Test User ${i}`,
        }
      })
    );

    const responses = await Promise.all(loadTestRequests);
    const duration = Date.now() - startTime;

    // All should succeed
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });

    // Should complete within reasonable time
    expect(duration).toBeLessThan(5000); // 5 seconds
  });

  test('should handle user retrieval error cases', async ({ request }) => {
    // Test with non-existent user ID
    const nonExistentResponse = await request.get(`/trpc/user.getById?input=${encodeURIComponent(JSON.stringify({ id: 'non-existent-id' }))}`);
    
    expect([400, 404]).toContain(nonExistentResponse.status());

    // Test with invalid ID format
    const invalidIdResponse = await request.get(`/trpc/user.getById?input=${encodeURIComponent(JSON.stringify({ id: '' }))}`);
    
    expect([400, 422]).toContain(invalidIdResponse.status());
  });
});