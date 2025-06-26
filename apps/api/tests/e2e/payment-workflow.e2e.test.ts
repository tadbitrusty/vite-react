import { test, expect } from './fixtures/test-data';

test.describe('Payment Workflow E2E', () => {
  test('should create checkout session for template purchase', async ({ request, testData }) => {
    const checkoutPayload = {
      templateId: 'tech-focus',
      email: testData.validUser.email,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };

    const response = await request.post('/trpc/payment.createCheckoutSession', {
      data: checkoutPayload
    });

    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.result.data.success).toBe(true);
    expect(body.result.data.checkoutUrl).toBeDefined();
    expect(body.result.data.sessionId).toBeDefined();
    expect(body.result.data.checkoutUrl).toMatch(/^https:\/\//);
  });

  test('should create checkout session for resume builder', async ({ request, testData }) => {
    const builderPayload = {
      pricing: 'enhanced',
      email: testData.validUser.email,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };

    const response = await request.post('/trpc/payment.createResumeBuilderSession', {
      data: builderPayload
    });

    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.result.data.success).toBe(true);
    expect(body.result.data.checkoutUrl).toBeDefined();
    expect(body.result.data.sessionId).toBeDefined();
    expect(body.result.data.amount).toBe(7500); // $75.00 for enhanced
  });

  test('should verify payment status', async ({ request }) => {
    const verificationPayload = {
      sessionId: 'cs_test_session_12345',
    };

    const response = await request.post('/trpc/payment.verifyPayment', {
      data: verificationPayload
    });

    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.result.data.success).toBe(true);
    expect(body.result.data.status).toBeDefined();
    expect(body.result.data.amount).toBeDefined();
    expect(body.result.data.productId).toBeDefined();
  });

  test('should handle all template types in checkout', async ({ request, testData }) => {
    const templates = ['entry-clean', 'tech-focus', 'professional-plus', 'executive-format'];
    
    for (const templateId of templates) {
      const payload = {
        templateId: templateId as any,
        email: `${templateId}@example.com`,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      const response = await request.post('/trpc/payment.createCheckoutSession', {
        data: payload
      });

      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body.result.data.success).toBe(true);
      expect(body.result.data.checkoutUrl).toBeDefined();
    }
  });

  test('should handle both resume builder pricing tiers', async ({ request, testData }) => {
    const pricingTiers = [
      { pricing: 'basic', expectedAmount: 4500 },
      { pricing: 'enhanced', expectedAmount: 7500 }
    ] as const;

    for (const tier of pricingTiers) {
      const payload = {
        pricing: tier.pricing,
        email: `${tier.pricing}@example.com`,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      const response = await request.post('/trpc/payment.createResumeBuilderSession', {
        data: payload
      });

      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body.result.data.success).toBe(true);
      expect(body.result.data.amount).toBe(tier.expectedAmount);
    }
  });

  test('should validate payment input parameters', async ({ request }) => {
    // Test invalid template ID
    const invalidTemplatePayload = {
      templateId: 'invalid-template-id',
      email: 'test@example.com',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };

    const invalidTemplateResponse = await request.post('/trpc/payment.createCheckoutSession', {
      data: invalidTemplatePayload
    });
    
    expect([400, 422]).toContain(invalidTemplateResponse.status());

    // Test invalid email format
    const invalidEmailPayload = {
      templateId: 'tech-focus',
      email: 'invalid-email-format',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };

    const invalidEmailResponse = await request.post('/trpc/payment.createCheckoutSession', {
      data: invalidEmailPayload
    });
    
    expect([400, 422]).toContain(invalidEmailResponse.status());

    // Test invalid URL format
    const invalidUrlPayload = {
      templateId: 'tech-focus',
      email: 'test@example.com',
      successUrl: 'not-a-valid-url',
      cancelUrl: 'https://example.com/cancel',
    };

    const invalidUrlResponse = await request.post('/trpc/payment.createCheckoutSession', {
      data: invalidUrlPayload
    });
    
    expect([400, 422]).toContain(invalidUrlResponse.status());
  });

  test('should handle concurrent payment session creation', async ({ request, testData }) => {
    const concurrentRequests = Array.from({ length: 5 }, (_, i) => {
      const payload = {
        templateId: 'tech-focus' as const,
        email: `concurrent-payment-${i}@example.com`,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      return request.post('/trpc/payment.createCheckoutSession', { data: payload });
    });

    const responses = await Promise.all(concurrentRequests);
    
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });

    const bodies = await Promise.all(responses.map(r => r.json()));
    bodies.forEach(body => {
      expect(body.result.data.success).toBe(true);
      expect(body.result.data.sessionId).toBeDefined();
    });
  });

  test('should complete payment verification workflow', async ({ request }) => {
    // Create a checkout session first
    const checkoutPayload = {
      templateId: 'tech-focus' as const,
      email: 'verification-workflow@example.com',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };

    const checkoutResponse = await request.post('/trpc/payment.createCheckoutSession', {
      data: checkoutPayload
    });

    expect(checkoutResponse.status()).toBe(200);
    
    const checkoutBody = await checkoutResponse.json();
    const sessionId = checkoutBody.result.data.sessionId;

    // Now verify the payment
    const verificationPayload = { sessionId };

    const verificationResponse = await request.post('/trpc/payment.verifyPayment', {
      data: verificationPayload
    });

    expect(verificationResponse.status()).toBe(200);
    
    const verificationBody = await verificationResponse.json();
    expect(verificationBody.result.data.success).toBe(true);
    expect(verificationBody.result.data.status).toBeDefined();
  });

  test('should handle payment response time requirements', async ({ request, testData }) => {
    const startTime = Date.now();

    const payload = {
      templateId: 'tech-focus' as const,
      email: testData.validUser.email,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };

    const response = await request.post('/trpc/payment.createCheckoutSession', {
      data: payload
    });

    const responseTime = Date.now() - startTime;

    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
  });

  test('should handle edge case URL formats', async ({ request, testData }) => {
    const edgeCaseUrls = [
      'https://example.com:8080/success',
      'https://subdomain.example.com/path/to/success',
      'https://example.com/success?param=value&other=123',
      'https://example.com/success#fragment',
    ];

    for (let i = 0; i < edgeCaseUrls.length; i++) {
      const payload = {
        templateId: 'tech-focus' as const,
        email: `edge-case-${i}@example.com`,
        successUrl: edgeCaseUrls[i],
        cancelUrl: 'https://example.com/cancel',
      };

      const response = await request.post('/trpc/payment.createCheckoutSession', {
        data: payload
      });

      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body.result.data.success).toBe(true);
    }
  });

  test('should maintain consistent response format across endpoints', async ({ request, testData }) => {
    // Template checkout
    const templateResponse = await request.post('/trpc/payment.createCheckoutSession', {
      data: {
        templateId: 'tech-focus',
        email: testData.validUser.email,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      }
    });

    // Resume builder checkout
    const builderResponse = await request.post('/trpc/payment.createResumeBuilderSession', {
      data: {
        pricing: 'basic',
        email: testData.validUser.email,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      }
    });

    // Payment verification
    const verifyResponse = await request.post('/trpc/payment.verifyPayment', {
      data: { sessionId: 'cs_test_session' }
    });

    const templateBody = await templateResponse.json();
    const builderBody = await builderResponse.json();
    const verifyBody = await verifyResponse.json();

    // All should have tRPC response format
    expect(templateBody).toHaveProperty('result');
    expect(templateBody.result).toHaveProperty('data');
    expect(templateBody.result.data).toHaveProperty('success');

    expect(builderBody).toHaveProperty('result');
    expect(builderBody.result).toHaveProperty('data');
    expect(builderBody.result.data).toHaveProperty('success');

    expect(verifyBody).toHaveProperty('result');
    expect(verifyBody.result).toHaveProperty('data');
    expect(verifyBody.result.data).toHaveProperty('success');
  });
});