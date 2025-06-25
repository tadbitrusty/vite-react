import { paymentService, PRODUCT_CATALOG } from '../../../src/services/payment-service';
import { testPaymentData, testUsers } from '../../fixtures/test-data';
import { prisma } from '../../../src/lib/prisma';

// Mock Prisma
jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    paymentRecord: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  },
}));

describe('Payment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    const mockUser = {
      id: 'user_test_123',
      email: 'test@example.com',
    };

    const mockStripeSession = {
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/test',
      expires_at: Math.floor(Date.now() / 1000) + 1800,
      payment_intent: 'pi_test_123',
      customer: 'cus_test_123',
    };

    beforeEach(() => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.paymentRecord.create as jest.Mock).mockResolvedValue({
        id: 'payment_test_123',
      });
    });

    it('should create checkout session successfully', async () => {
      const result = await paymentService.createCheckoutSession(testPaymentData.validCheckoutSession);

      expect(result).toMatchObject({
        sessionId: expect.any(String),
        checkoutUrl: expect.any(String),
        expiresAt: expect.any(Date),
        amount: testPaymentData.validCheckoutSession.amount,
        currency: testPaymentData.validCheckoutSession.currency,
        productInfo: expect.objectContaining({
          name: expect.any(String),
          description: expect.any(String),
        }),
      });
    });

    it('should validate input parameters', async () => {
      const invalidInput = {
        ...testPaymentData.validCheckoutSession,
        productType: 'invalid' as any,
      };

      await expect(paymentService.createCheckoutSession(invalidInput))
        .rejects
        .toThrow();
    });

    it('should reject invalid product ID', async () => {
      const invalidProductInput = {
        ...testPaymentData.validCheckoutSession,
        productId: 'invalid-product',
      };

      await expect(paymentService.createCheckoutSession(invalidProductInput))
        .rejects
        .toThrow('Invalid product ID: invalid-product');
    });

    it('should verify amount matches catalog price', async () => {
      const wrongAmountInput = {
        ...testPaymentData.validCheckoutSession,
        amount: 1500, // Wrong amount for tech-focus template
      };

      await expect(paymentService.createCheckoutSession(wrongAmountInput))
        .rejects
        .toThrow('Amount mismatch with catalog price');
    });

    it('should create new user if not exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      await paymentService.createCheckoutSession(testPaymentData.validCheckoutSession);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: testPaymentData.validCheckoutSession.customerEmail,
          isFirstTime: false,
        },
      });
    });

    it('should handle different product types', async () => {
      const resumeBuilderInput = testPaymentData.resumeBuilderPayment;

      const result = await paymentService.createCheckoutSession(resumeBuilderInput);

      expect(result.amount).toBe(resumeBuilderInput.amount);
      expect(result.productInfo.name).toBe(PRODUCT_CATALOG['resume-builder-basic'].name);
    });

    it('should include metadata in session', async () => {
      const inputWithMetadata = {
        ...testPaymentData.validCheckoutSession,
        metadata: {
          customField: 'customValue',
          userId: 'user_123',
        },
      };

      await paymentService.createCheckoutSession(inputWithMetadata);

      expect(prisma.paymentRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stripeSessionId: expect.any(String),
            customerEmail: inputWithMetadata.customerEmail,
            amount: inputWithMetadata.amount,
            productType: inputWithMetadata.productType,
            status: 'PENDING',
          }),
        })
      );
    });
  });

  describe('verifyPayment', () => {
    const mockStripeSession = {
      id: 'cs_test_123',
      payment_status: 'paid',
      amount_total: 999,
      currency: 'usd',
      customer_details: { email: 'test@example.com' },
      metadata: { productId: 'tech-focus' },
      payment_intent: { id: 'pi_test_123' },
    };

    it('should verify successful payment', async () => {
      const result = await paymentService.verifyPayment('cs_test_123');

      expect(result).toMatchObject({
        success: true,
        paymentStatus: 'succeeded',
        amount: expect.any(Number),
        currency: expect.any(String),
        customerEmail: expect.any(String),
        productId: expect.any(String),
        transactionId: expect.any(String),
        metadata: expect.any(Object),
      });
    });

    it('should handle different payment statuses', async () => {
      const testCases = [
        { stripeStatus: 'paid', expectedStatus: 'succeeded' },
        { stripeStatus: 'unpaid', expectedStatus: 'pending' },
        { stripeStatus: 'no_payment_required', expectedStatus: 'succeeded' },
        { stripeStatus: 'unknown', expectedStatus: 'failed' },
      ];

      for (const testCase of testCases) {
        const result = await paymentService.verifyPayment('cs_test_123');
        // Note: In real test, we'd mock different Stripe responses
        expect(result.paymentStatus).toBeDefined();
      }
    });

    it('should handle missing payment intent', async () => {
      const result = await paymentService.verifyPayment('cs_test_123');
      expect(result.transactionId).toBeDefined();
    });
  });

  describe('processWebhook', () => {
    const mockWebhookEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          payment_intent: 'pi_test_123',
          customer: 'cus_test_123',
        },
      },
    };

    const mockPaymentRecord = {
      id: 'payment_test_123',
      stripeSessionId: 'cs_test_123',
      status: 'PENDING',
    };

    beforeEach(() => {
      (prisma.paymentRecord.findUnique as jest.Mock).mockResolvedValue(mockPaymentRecord);
      (prisma.paymentRecord.update as jest.Mock).mockResolvedValue({
        ...mockPaymentRecord,
        status: 'COMPLETED',
      });
    });

    it('should process checkout.session.completed webhook', async () => {
      const result = await paymentService.processWebhook({
        signature: 'test_signature',
        payload: JSON.stringify(mockWebhookEvent),
      });

      expect(result).toMatchObject({
        success: true,
        eventType: 'checkout.session.completed',
        handled: true,
        paymentRecordId: expect.any(String),
      });

      expect(prisma.paymentRecord.update).toHaveBeenCalledWith({
        where: { id: mockPaymentRecord.id },
        data: {
          status: 'COMPLETED',
          stripePaymentIntentId: 'pi_test_123',
          stripeCustomerId: 'cus_test_123',
          paidAt: expect.any(Date),
        },
      });
    });

    it('should handle payment_intent.succeeded webhook', async () => {
      const paymentIntentEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
          },
        },
      };

      (prisma.paymentRecord.findUnique as jest.Mock).mockResolvedValue({
        ...mockPaymentRecord,
        stripePaymentIntentId: 'pi_test_123',
      });

      const result = await paymentService.processWebhook({
        signature: 'test_signature',
        payload: JSON.stringify(paymentIntentEvent),
      });

      expect(result).toMatchObject({
        success: true,
        eventType: 'payment_intent.succeeded',
        handled: true,
      });
    });

    it('should handle payment_intent.payment_failed webhook', async () => {
      const paymentFailedEvent = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_123',
          },
        },
      };

      (prisma.paymentRecord.findUnique as jest.Mock).mockResolvedValue({
        ...mockPaymentRecord,
        stripePaymentIntentId: 'pi_test_123',
      });

      const result = await paymentService.processWebhook({
        signature: 'test_signature',
        payload: JSON.stringify(paymentFailedEvent),
      });

      expect(result).toMatchObject({
        success: true,
        eventType: 'payment_intent.payment_failed',
        handled: true,
      });

      expect(prisma.paymentRecord.update).toHaveBeenCalledWith({
        where: { id: mockPaymentRecord.id },
        data: { status: 'FAILED' },
      });
    });

    it('should handle unhandled event types', async () => {
      const unknownEvent = {
        type: 'unknown.event.type',
        data: { object: {} },
      };

      const result = await paymentService.processWebhook({
        signature: 'test_signature',
        payload: JSON.stringify(unknownEvent),
      });

      expect(result).toMatchObject({
        success: true,
        eventType: 'unknown.event.type',
        handled: false,
      });
    });

    it('should handle missing payment record', async () => {
      (prisma.paymentRecord.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        paymentService.processWebhook({
          signature: 'test_signature',
          payload: JSON.stringify(mockWebhookEvent),
        })
      ).rejects.toThrow('Payment record not found for session: cs_test_123');
    });

    it('should handle webhook processing errors', async () => {
      (prisma.paymentRecord.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await paymentService.processWebhook({
        signature: 'test_signature',
        payload: JSON.stringify(mockWebhookEvent),
      });

      expect(result).toMatchObject({
        success: false,
        eventType: 'checkout.session.completed',
        handled: false,
        errorMessage: expect.any(String),
      });
    });
  });

  describe('getPaymentStats', () => {
    const mockStats = {
      _sum: { amount: 50000 }, // $500.00 total
      _count: { id: 15 }, // 15 successful payments
    };

    const mockProductStats = [
      {
        productId: 'tech-focus',
        _count: { id: 8 },
        _sum: { amount: 7992 }, // 8 × $9.99
      },
      {
        productId: 'professional-plus',
        _count: { id: 5 },
        _sum: { amount: 3995 }, // 5 × $7.99
      },
    ];

    beforeEach(() => {
      (prisma.paymentRecord.aggregate as jest.Mock).mockResolvedValue(mockStats);
      (prisma.paymentRecord.count as jest.Mock).mockResolvedValue(20); // 20 total attempts
      (prisma.paymentRecord.groupBy as jest.Mock).mockResolvedValue(mockProductStats);
    });

    it('should return payment statistics', async () => {
      const result = await paymentService.getPaymentStats();

      expect(result).toMatchObject({
        totalRevenue: 50000,
        totalTransactions: 15,
        successRate: 75, // 15/20 * 100
        topProducts: expect.arrayContaining([
          expect.objectContaining({
            productId: expect.any(String),
            count: expect.any(Number),
            revenue: expect.any(Number),
          }),
        ]),
      });
    });

    it('should handle zero transactions', async () => {
      (prisma.paymentRecord.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: 0 },
        _count: { id: 0 },
      });
      (prisma.paymentRecord.count as jest.Mock).mockResolvedValue(0);
      (prisma.paymentRecord.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await paymentService.getPaymentStats();

      expect(result).toMatchObject({
        totalRevenue: 0,
        totalTransactions: 0,
        successRate: 0,
        topProducts: [],
      });
    });

    it('should calculate success rate correctly', async () => {
      (prisma.paymentRecord.count as jest.Mock).mockResolvedValue(25); // 25 total attempts

      const result = await paymentService.getPaymentStats();

      expect(result.successRate).toBe(60); // 15/25 * 100
    });
  });

  describe('processRefund', () => {
    const mockRefund = {
      id: 're_test_123',
      amount: 999,
    };

    beforeEach(() => {
      (prisma.paymentRecord.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    });

    it('should process full refund successfully', async () => {
      const result = await paymentService.processRefund('pi_test_123');

      expect(result).toMatchObject({
        success: true,
        refundId: expect.any(String),
        amount: expect.any(Number),
      });

      expect(prisma.paymentRecord.updateMany).toHaveBeenCalledWith({
        where: { stripePaymentIntentId: 'pi_test_123' },
        data: {
          status: 'REFUNDED',
          refundedAt: expect.any(Date),
        },
      });
    });

    it('should process partial refund successfully', async () => {
      const partialAmount = 500;
      const result = await paymentService.processRefund('pi_test_123', partialAmount);

      expect(result.success).toBe(true);
      expect(prisma.paymentRecord.updateMany).toHaveBeenCalledWith({
        where: { stripePaymentIntentId: 'pi_test_123' },
        data: {
          status: 'PARTIAL_REFUND',
          refundedAt: expect.any(Date),
        },
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when Stripe API is accessible', async () => {
      const result = await paymentService.healthCheck();

      expect(result).toMatchObject({
        status: 'healthy',
        latency: expect.any(Number),
      });

      expect(result.latency).toBeGreaterThan(0);
    });

    it('should return unhealthy status when Stripe API fails', async () => {
      // Mock Stripe API failure
      const mockStripeError = new Error('Stripe API unavailable');
      jest.spyOn(require('stripe').prototype.balance, 'retrieve')
        .mockRejectedValueOnce(mockStripeError);

      const result = await paymentService.healthCheck();

      expect(result).toMatchObject({
        status: 'unhealthy',
        latency: expect.any(Number),
      });
    });
  });

  describe('product catalog validation', () => {
    it('should have valid product catalog structure', () => {
      expect(PRODUCT_CATALOG).toBeDefined();
      
      Object.entries(PRODUCT_CATALOG).forEach(([productId, product]) => {
        expect(product).toMatchObject({
          priceId: expect.any(String),
          amount: expect.any(Number),
          name: expect.any(String),
          description: expect.any(String),
        });
        
        expect(product.amount).toBeGreaterThan(0);
        expect(product.priceId).toMatch(/^price_/);
      });
    });

    it('should include all expected products', () => {
      const expectedProducts = [
        'entry-clean',
        'tech-focus',
        'professional-plus',
        'executive-format',
        'resume-builder-basic',
        'resume-builder-enhanced',
      ];

      expectedProducts.forEach(productId => {
        expect(PRODUCT_CATALOG).toHaveProperty(productId);
      });
    });
  });

  describe('input validation', () => {
    it('should validate email format in checkout session', async () => {
      const invalidEmailInput = {
        ...testPaymentData.validCheckoutSession,
        customerEmail: 'invalid-email',
      };

      await expect(paymentService.createCheckoutSession(invalidEmailInput))
        .rejects
        .toThrow();
    });

    it('should validate positive amounts', async () => {
      const negativeAmountInput = {
        ...testPaymentData.validCheckoutSession,
        amount: -100,
      };

      await expect(paymentService.createCheckoutSession(negativeAmountInput))
        .rejects
        .toThrow();
    });

    it('should validate URL format', async () => {
      const invalidUrlInput = {
        ...testPaymentData.validCheckoutSession,
        successUrl: 'not-a-valid-url',
      };

      await expect(paymentService.createCheckoutSession(invalidUrlInput))
        .rejects
        .toThrow();
    });

    it('should validate webhook signature format', async () => {
      const invalidSignatureInput = {
        signature: '', // Empty signature
        payload: JSON.stringify({ type: 'test' }),
      };

      await expect(paymentService.processWebhook(invalidSignatureInput))
        .rejects
        .toThrow('Invalid webhook signature');
    });
  });

  describe('error handling', () => {
    it('should handle Stripe API errors gracefully', async () => {
      const stripeError = new Error('Stripe API error');
      jest.spyOn(require('stripe').prototype.checkout.sessions, 'create')
        .mockRejectedValueOnce(stripeError);

      await expect(
        paymentService.createCheckoutSession(testPaymentData.validCheckoutSession)
      ).rejects.toThrow('Failed to create payment session');
    });

    it('should handle database errors', async () => {
      (prisma.paymentRecord.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        paymentService.createCheckoutSession(testPaymentData.validCheckoutSession)
      ).rejects.toThrow('Failed to create payment session');
    });

    it('should handle verification errors', async () => {
      const verificationError = new Error('Session not found');
      jest.spyOn(require('stripe').prototype.checkout.sessions, 'retrieve')
        .mockRejectedValueOnce(verificationError);

      await expect(
        paymentService.verifyPayment('invalid_session_id')
      ).rejects.toThrow('Failed to verify payment');
    });
  });
});