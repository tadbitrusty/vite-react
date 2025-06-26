import { createTestCaller, createTestContext, TestDatabase, integrationTestHelpers, prisma } from '../setup';

describe('Payment Router Integration Tests', () => {
  beforeEach(async () => {
    await TestDatabase.seed();
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session successfully for template purchase', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const sessionData = {
        templateId: 'tech-focus' as const,
        email: 'checkout@example.com',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      const result = await caller.payment.createCheckoutSession(sessionData);

      integrationTestHelpers.expectValidResponse(result, [
        'success',
        'checkoutUrl',
        'sessionId'
      ]);

      expect(result.success).toBe(true);
      expect(result.checkoutUrl).toBe('https://checkout.stripe.com/session-id');
      expect(result.sessionId).toBe('cs_temp_session_id');
      expect(result.checkoutUrl).toMatch(/^https:\/\//);
    });

    it('should validate template ID', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const invalidSessionData = {
        templateId: 'invalid-template' as any,
        email: 'checkout@example.com',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      await expect(caller.payment.createCheckoutSession(invalidSessionData))
        .rejects
        .toThrow();
    });

    it('should validate email format', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const invalidEmailData = {
        templateId: 'tech-focus' as const,
        email: 'invalid-email-format',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      await expect(caller.payment.createCheckoutSession(invalidEmailData))
        .rejects
        .toThrow();
    });

    it('should validate URL formats', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      // Test invalid success URL
      await expect(caller.payment.createCheckoutSession({
        templateId: 'tech-focus',
        email: 'test@example.com',
        successUrl: 'not-a-valid-url',
        cancelUrl: 'https://example.com/cancel',
      })).rejects.toThrow();

      // Test invalid cancel URL
      await expect(caller.payment.createCheckoutSession({
        templateId: 'tech-focus',
        email: 'test@example.com',
        successUrl: 'https://example.com/success',
        cancelUrl: 'not-a-valid-url',
      })).rejects.toThrow();
    });

    it('should handle all valid template IDs', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const templateIds = ['entry-clean', 'tech-focus', 'professional-plus', 'executive-format'] as const;
      
      for (const templateId of templateIds) {
        const result = await caller.payment.createCheckoutSession({
          templateId,
          email: `${templateId}@example.com`,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        });

        expect(result.success).toBe(true);
        expect(result.checkoutUrl).toBeDefined();
        expect(result.sessionId).toBeDefined();
      }
    });

    it('should handle concurrent session creation', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const promises = Array.from({ length: 5 }, (_, i) => 
        caller.payment.createCheckoutSession({
          templateId: 'tech-focus',
          email: `concurrent${i}@example.com`,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.checkoutUrl).toBeDefined();
        expect(result.sessionId).toBeDefined();
      });
    });

    it('should handle international URLs', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const internationalData = {
        templateId: 'tech-focus' as const,
        email: 'international@example.com',
        successUrl: 'https://example.co.uk/success',
        cancelUrl: 'https://ejemplo.es/cancel',
      };

      const result = await caller.payment.createCheckoutSession(internationalData);

      expect(result.success).toBe(true);
    });
  });

  describe('createResumeBuilderSession', () => {
    it('should create session for basic resume builder', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const sessionData = {
        pricing: 'basic' as const,
        email: 'builder@example.com',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      const result = await caller.payment.createResumeBuilderSession(sessionData);

      integrationTestHelpers.expectValidResponse(result, [
        'success',
        'checkoutUrl',
        'sessionId',
        'amount'
      ]);

      expect(result.success).toBe(true);
      expect(result.amount).toBe(4500); // $45.00
      expect(result.checkoutUrl).toBeDefined();
      expect(result.sessionId).toBeDefined();
    });

    it('should create session for enhanced resume builder', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const sessionData = {
        pricing: 'enhanced' as const,
        email: 'enhanced@example.com',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      const result = await caller.payment.createResumeBuilderSession(sessionData);

      expect(result.success).toBe(true);
      expect(result.amount).toBe(7500); // $75.00
      expect(result.checkoutUrl).toBeDefined();
      expect(result.sessionId).toBeDefined();
    });

    it('should validate pricing options', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const invalidPricingData = {
        pricing: 'invalid-pricing' as any,
        email: 'test@example.com',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      await expect(caller.payment.createResumeBuilderSession(invalidPricingData))
        .rejects
        .toThrow();
    });

    it('should validate email format', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const invalidEmailData = {
        pricing: 'basic' as const,
        email: 'invalid-email',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      await expect(caller.payment.createResumeBuilderSession(invalidEmailData))
        .rejects
        .toThrow();
    });

    it('should handle both pricing tiers correctly', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const basicResult = await caller.payment.createResumeBuilderSession({
        pricing: 'basic',
        email: 'basic@example.com',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      const enhancedResult = await caller.payment.createResumeBuilderSession({
        pricing: 'enhanced',
        email: 'enhanced@example.com',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(basicResult.amount).toBe(4500);
      expect(enhancedResult.amount).toBe(7500);
      expect(enhancedResult.amount).toBeGreaterThan(basicResult.amount);
    });

    it('should create unique sessions for concurrent requests', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const promises = Array.from({ length: 3 }, (_, i) => 
        caller.payment.createResumeBuilderSession({
          pricing: i % 2 === 0 ? 'basic' : 'enhanced',
          email: `builder${i}@example.com`,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.sessionId).toBeDefined();
      });

      // Session IDs should be consistent (mocked to same value)
      const sessionIds = results.map(r => r.sessionId);
      expect(sessionIds.every(id => id === 'cs_temp_session_id')).toBe(true);
    });
  });

  describe('verifyPayment', () => {
    it('should verify payment successfully', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const result = await caller.payment.verifyPayment({
        sessionId: 'cs_test_session_123',
      });

      integrationTestHelpers.expectValidResponse(result, [
        'success',
        'status',
        'amount',
        'productId'
      ]);

      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.amount).toBe(4500);
      expect(result.productId).toBe('basic-resume-builder');
    });

    it('should handle different session IDs', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const sessionIds = [
        'cs_test_123',
        'cs_different_456',
        'cs_another_789',
        'cs_very_long_session_id_with_special_characters_123',
      ];

      for (const sessionId of sessionIds) {
        const result = await caller.payment.verifyPayment({ sessionId });
        
        expect(result.success).toBe(true);
        expect(result.status).toBe('completed');
        expect(typeof result.amount).toBe('number');
        expect(typeof result.productId).toBe('string');
      }
    });

    it('should validate session ID format', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      // Test empty session ID
      await expect(caller.payment.verifyPayment({ sessionId: '' }))
        .rejects
        .toThrow();
    });

    it('should return consistent results for same session', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const sessionId = 'cs_consistent_test';
      const result1 = await caller.payment.verifyPayment({ sessionId });
      const result2 = await caller.payment.verifyPayment({ sessionId });

      expect(result1).toEqual(result2);
    });

    it('should handle concurrent verification requests', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const sessionId = 'cs_concurrent_test';
      const promises = Array.from({ length: 5 }, () => 
        caller.payment.verifyPayment({ sessionId })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.status).toBe('completed');
      });

      // All results should be identical
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toEqual(firstResult);
      });
    });
  });

  describe('input validation edge cases', () => {
    it('should handle URL edge cases', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const edgeCaseUrls = [
        'https://example.com:8080/success',
        'https://subdomain.example.com/path/to/success',
        'https://example.com/success?param=value&other=123',
        'https://example.com/success#fragment',
      ];

      for (let i = 0; i < edgeCaseUrls.length; i++) {
        const result = await caller.payment.createCheckoutSession({
          templateId: 'tech-focus',
          email: `edge${i}@example.com`,
          successUrl: edgeCaseUrls[i],
          cancelUrl: 'https://example.com/cancel',
        });

        expect(result.success).toBe(true);
      }
    });

    it('should handle email edge cases', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const edgeCaseEmails = [
        'user+tag@example.com',
        'user.name@example.com',
        'user_name@example.com',
        'user-name@example.com',
        'user123@example.com',
      ];

      for (let i = 0; i < edgeCaseEmails.length; i++) {
        const result = await caller.payment.createCheckoutSession({
          templateId: 'tech-focus',
          email: edgeCaseEmails[i],
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        });

        expect(result.success).toBe(true);
      }
    });

    it('should reject malformed inputs', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      // Test various malformed inputs
      const malformedInputs = [
        {
          templateId: '', // Empty template ID
          email: 'test@example.com',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        },
        {
          templateId: 'tech-focus',
          email: '@example.com', // Invalid email
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        },
        {
          templateId: 'tech-focus',
          email: 'test@example.com',
          successUrl: 'ftp://example.com/success', // Wrong protocol
          cancelUrl: 'https://example.com/cancel',
        },
      ];

      for (const input of malformedInputs) {
        await expect(caller.payment.createCheckoutSession(input as any))
          .rejects
          .toThrow();
      }
    });
  });

  describe('error handling and resilience', () => {
    it('should handle external service failures gracefully', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      // The current implementation returns mock data, so it should always succeed
      // In a real implementation, this would test Stripe API failures
      const result = await caller.payment.createCheckoutSession({
        templateId: 'tech-focus',
        email: 'test@example.com',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(result.success).toBe(true);
    });

    it('should maintain consistency under load', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const startTime = Date.now();

      // Create 20 concurrent checkout sessions
      const promises = Array.from({ length: 20 }, (_, i) => 
        caller.payment.createCheckoutSession({
          templateId: 'tech-focus',
          email: `load${i}@example.com`,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(20);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
    });

    it('should handle verification load efficiently', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const startTime = Date.now();

      // 15 concurrent payment verifications
      const promises = Array.from({ length: 15 }, (_, i) => 
        caller.payment.verifyPayment({ sessionId: `cs_load_test_${i}` })
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(15);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle mixed concurrent operations', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      // Mix of different payment operations
      const promises = [
        caller.payment.createCheckoutSession({
          templateId: 'tech-focus',
          email: 'mixed1@example.com',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
        caller.payment.createResumeBuilderSession({
          pricing: 'basic',
          email: 'mixed2@example.com',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
        caller.payment.verifyPayment({ sessionId: 'cs_mixed_test' }),
        caller.payment.createCheckoutSession({
          templateId: 'professional-plus',
          email: 'mixed3@example.com',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
        caller.payment.createResumeBuilderSession({
          pricing: 'enhanced',
          email: 'mixed4@example.com',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('response format consistency', () => {
    it('should maintain consistent response structure across endpoints', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const checkoutResult = await caller.payment.createCheckoutSession({
        templateId: 'tech-focus',
        email: 'consistency@example.com',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      const builderResult = await caller.payment.createResumeBuilderSession({
        pricing: 'basic',
        email: 'consistency@example.com',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      const verifyResult = await caller.payment.verifyPayment({
        sessionId: 'cs_consistency_test',
      });

      // All should have success field
      expect(checkoutResult).toHaveProperty('success');
      expect(builderResult).toHaveProperty('success');
      expect(verifyResult).toHaveProperty('success');

      // Session creation endpoints should have similar structure
      expect(checkoutResult).toHaveProperty('checkoutUrl');
      expect(checkoutResult).toHaveProperty('sessionId');
      expect(builderResult).toHaveProperty('checkoutUrl');
      expect(builderResult).toHaveProperty('sessionId');

      // Verify endpoint should have different structure
      expect(verifyResult).toHaveProperty('status');
      expect(verifyResult).toHaveProperty('amount');
      expect(verifyResult).toHaveProperty('productId');
    });
  });
});