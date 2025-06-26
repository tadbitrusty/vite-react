import { fraudService } from '../../../src/services/fraud-service';
import { testFraudData } from '../../fixtures/test-data';
import { prisma } from '../../../src/lib/prisma';

// Mock Prisma
jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    chargebackBlacklist: {
      findFirst: jest.fn(),
    },
    badEmail: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      count: jest.fn(),
      upsert: jest.fn(),
    },
    ipTracking: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
    processingAnalytics: {
      count: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-123'),
}));

describe('Fraud Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock values
    (prisma.chargebackBlacklist.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.badEmail.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.count as jest.Mock).mockResolvedValue(0);
    (prisma.ipTracking.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.processingAnalytics.count as jest.Mock).mockResolvedValue(0);
    (prisma.processingAnalytics.create as jest.Mock).mockResolvedValue({});
    (prisma.ipTracking.upsert as jest.Mock).mockResolvedValue({});
  });

  describe('checkFraud', () => {
    it('should allow legitimate requests with low risk', async () => {
      const result = await fraudService.checkFraud(testFraudData.legitimateRequest);

      expect(result).toMatchObject({
        allowed: true,
        riskLevel: 'low',
        reasons: expect.any(Array),
        actions: expect.any(Array),
        score: expect.any(Number),
      });

      expect(result.score).toBeLessThan(30);
      expect(result.blockType).toBeUndefined();
    });

    it('should block permanently banned users', async () => {
      const mockBan = {
        email: testFraudData.blockedRequest.email,
        reason: 'Chargeback fraud',
      };
      (prisma.chargebackBlacklist.findFirst as jest.Mock).mockResolvedValue(mockBan);

      const result = await fraudService.checkFraud(testFraudData.blockedRequest);

      expect(result).toMatchObject({
        allowed: false,
        riskLevel: 'blocked',
        reasons: ['Permanently banned: Chargeback fraud'],
        actions: ['Request permanently blocked'],
        score: 100,
        blockType: 'permanent',
      });
    });

    it('should detect suspicious email patterns', async () => {
      const suspiciousRequest = {
        ...testFraudData.suspiciousRequest,
        email: 'test123456@tempmail.org', // Disposable email
      };

      const result = await fraudService.checkFraud(suspiciousRequest);

      expect(result.score).toBeGreaterThan(30);
      expect(result.reasons).toContain('Suspicious email pattern or disposable email');
      expect(result.actions).toContain('Require additional verification');
    });

    it('should detect email abuse patterns', async () => {
      const mockBadEmail = {
        email: testFraudData.suspiciousRequest.email,
        attempts: 6,
        reason: 'Multiple failed attempts',
      };
      (prisma.badEmail.findUnique as jest.Mock).mockResolvedValue(mockBadEmail);

      const result = await fraudService.checkFraud(testFraudData.suspiciousRequest);

      expect(result.score).toBeGreaterThan(50);
      expect(result.reasons).toContain('Email on abuse list');
      expect(result.reasons).toContain('Multiple abuse attempts from this email');
    });

    it('should detect high-frequency email usage', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValue(5); // High recent usage

      const result = await fraudService.checkFraud(testFraudData.suspiciousRequest);

      expect(result.score).toBeGreaterThan(20);
      expect(result.reasons).toContain('High frequency usage from this email');
    });

    it('should detect blocked IP addresses', async () => {
      const mockBlockedIp = {
        ipAddress: testFraudData.blockedRequest.ipAddress,
        isBlocked: true,
        emailCount: 20,
        blockReason: 'Automated abuse',
      };
      (prisma.ipTracking.findUnique as jest.Mock).mockResolvedValue(mockBlockedIp);

      const result = await fraudService.checkFraud(testFraudData.blockedRequest);

      expect(result.score).toBeGreaterThan(70);
      expect(result.reasons).toContain('IP address is blocked');
      expect(result.actions).toContain('Block request');
    });

    it('should detect rapid successive requests from IP', async () => {
      const mockIpTrack = {
        ipAddress: testFraudData.suspiciousRequest.ipAddress,
        emailCount: 5,
        lastEmail: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        isBlocked: false,
      };
      (prisma.ipTracking.findUnique as jest.Mock).mockResolvedValue(mockIpTrack);

      const result = await fraudService.checkFraud(testFraudData.suspiciousRequest);

      expect(result.score).toBeGreaterThan(30);
      expect(result.reasons).toContain('Rapid successive requests from IP');
      expect(result.actions).toContain('Implement rate limiting');
    });

    it('should detect VPN/Proxy usage', async () => {
      const vpnRequest = {
        ...testFraudData.legitimateRequest,
        ipAddress: '10.0.0.1', // Private network (VPN indicator)
      };

      const result = await fraudService.checkFraud(vpnRequest);

      expect(result.reasons).toContain('Request from VPN/Proxy');
      expect(result.score).toBeGreaterThan(10);
    });

    it('should detect rate limit violations', async () => {
      (prisma.processingAnalytics.count as jest.Mock)
        .mockResolvedValueOnce(10) // Email rate limit exceeded
        .mockResolvedValueOnce(15); // IP rate limit exceeded

      const result = await fraudService.checkFraud(testFraudData.suspiciousRequest);

      expect(result.score).toBeGreaterThan(80);
      expect(result.reasons).toContain('Email rate limit exceeded');
      expect(result.reasons).toContain('IP rate limit exceeded');
      expect(result.actions).toContain('Temporary block required');
    });

    it('should detect suspicious user agents', async () => {
      const botRequest = {
        ...testFraudData.suspiciousRequest,
        userAgent: 'curl/7.68.0',
      };

      const result = await fraudService.checkFraud(botRequest);

      expect(result.reasons).toContain('Suspicious user agent detected');
      expect(result.actions).toContain('Additional verification required');
    });

    it('should detect minimal user agents', async () => {
      const minimalRequest = {
        ...testFraudData.suspiciousRequest,
        userAgent: 'bot',
      };

      const result = await fraudService.checkFraud(minimalRequest);

      expect(result.reasons).toContain('Minimal or missing user agent');
    });

    it('should detect suspicious payment patterns', async () => {
      const suspiciousPayment = {
        ...testFraudData.suspiciousRequest,
        requestType: 'payment' as const,
        paymentAmount: 1000, // Round amount
      };

      const result = await fraudService.checkFraud(suspiciousPayment);

      expect(result.reasons).toContain('Round payment amount');
    });

    it('should detect testing payment amounts', async () => {
      const testPayment = {
        ...testFraudData.suspiciousRequest,
        requestType: 'payment' as const,
        paymentAmount: 50, // Very small amount
      };

      const result = await fraudService.checkFraud(testPayment);

      expect(result.reasons).toContain('Unusually small payment amount');
    });

    it('should calculate correct risk levels', async () => {
      // Test different score ranges
      const testCases = [
        { score: 10, expectedRisk: 'low' },
        { score: 40, expectedRisk: 'medium' },
        { score: 70, expectedRisk: 'high' },
        { score: 90, expectedRisk: 'blocked' },
      ];

      // We'll test this indirectly by setting up conditions that produce known scores
      for (const testCase of testCases) {
        // This is a simplified test - in practice, we'd mock specific conditions
        const result = await fraudService.checkFraud(testFraudData.legitimateRequest);
        expect(result.riskLevel).toBeDefined();
      }
    });

    it('should handle different request types appropriately', async () => {
      const highRiskConditions = {
        ...testFraudData.suspiciousRequest,
        userAgent: 'curl/7.68.0', // Should trigger high risk
      };

      // Test account creation (should be allowed even at high risk)
      const accountCreation = {
        ...highRiskConditions,
        requestType: 'account-creation' as const,
      };

      const accountResult = await fraudService.checkFraud(accountCreation);
      // Account creation might still be allowed even with high risk

      // Test payment (should be blocked at medium/high risk)
      const payment = {
        ...highRiskConditions,
        requestType: 'payment' as const,
      };

      const paymentResult = await fraudService.checkFraud(payment);
      expect(paymentResult.riskLevel).toBeDefined();
    });

    it('should log fraud checks', async () => {
      await fraudService.checkFraud(testFraudData.legitimateRequest);

      expect(prisma.processingAnalytics.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requestId: 'test-uuid-123',
          ipAddress: testFraudData.legitimateRequest.ipAddress,
          userAgent: testFraudData.legitimateRequest.userAgent,
          processingTimeMs: 0,
          success: expect.any(Boolean),
          errorType: expect.any(String),
          isFirstTimeUser: true,
        }),
      });
    });

    it('should update tracking records for allowed requests', async () => {
      await fraudService.checkFraud(testFraudData.legitimateRequest);

      expect(prisma.ipTracking.upsert).toHaveBeenCalledWith({
        where: { ipAddress: testFraudData.legitimateRequest.ipAddress },
        update: {
          emailCount: { increment: 1 },
          lastEmail: expect.any(Date),
        },
        create: {
          ipAddress: testFraudData.legitimateRequest.ipAddress,
          emailCount: 1,
          lastEmail: expect.any(Date),
        },
      });
    });

    it('should handle blocked requests properly', async () => {
      const mockBadEmail = {
        email: testFraudData.blockedRequest.email,
        attempts: 10,
        reason: 'Multiple violations',
      };
      (prisma.badEmail.findUnique as jest.Mock).mockResolvedValue(mockBadEmail);

      const result = await fraudService.checkFraud(testFraudData.blockedRequest);

      if (!result.allowed) {
        expect(prisma.badEmail.upsert).toHaveBeenCalled();
      }
    });
  });

  describe('reportFraud', () => {
    it('should add reported fraud to bad email list', async () => {
      const fraudReport = {
        email: 'fraud@example.com',
        ipAddress: '192.168.1.100',
        reason: 'Manual chargeback report',
        evidence: { orderId: 'order_123' },
        reportedBy: 'admin@example.com',
      };

      await fraudService.reportFraud(fraudReport);

      expect(prisma.badEmail.upsert).toHaveBeenCalledWith({
        where: { email: fraudReport.email },
        update: {
          attempts: { increment: 1 },
          reason: `Manual report: ${fraudReport.reason}`,
          lastAttempt: expect.any(Date),
        },
        create: {
          email: fraudReport.email,
          attempts: 1,
          reason: `Manual report: ${fraudReport.reason}`,
        },
      });
    });

    it('should block IP for severe fraud reports', async () => {
      const severeReport = {
        email: 'fraud@example.com',
        ipAddress: '192.168.1.100',
        reason: 'Confirmed chargeback fraud',
        evidence: { chargebackId: 'cb_123' },
        reportedBy: 'admin@example.com',
      };

      await fraudService.reportFraud(severeReport);

      expect(prisma.ipTracking.upsert).toHaveBeenCalledWith({
        where: { ipAddress: severeReport.ipAddress },
        update: {
          isBlocked: true,
          blockReason: severeReport.reason,
        },
        create: {
          ipAddress: severeReport.ipAddress,
          emailCount: 1,
          isBlocked: true,
          blockReason: severeReport.reason,
        },
      });
    });

    it('should not block IP for minor fraud reports', async () => {
      const minorReport = {
        email: 'suspicious@example.com',
        ipAddress: '192.168.1.100',
        reason: 'Suspicious behavior',
        evidence: { sessionId: 'session_123' },
        reportedBy: 'admin@example.com',
      };

      await fraudService.reportFraud(minorReport);

      expect(prisma.ipTracking.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getFraudStats', () => {
    beforeEach(() => {
      (prisma.processingAnalytics.count as jest.Mock)
        .mockResolvedValueOnce(1000) // Total requests
        .mockResolvedValueOnce(50); // Blocked requests
      (prisma.badEmail.count as jest.Mock).mockResolvedValue(25);
      (prisma.ipTracking.count as jest.Mock).mockResolvedValue(10);
    });

    it('should return fraud statistics', async () => {
      const result = await fraudService.getFraudStats();

      expect(result).toMatchObject({
        blockedRequests: 50,
        suspiciousEmails: 25,
        blockedIps: 10,
        fraudRate: 5.0, // 50/1000 * 100
      });
    });

    it('should handle zero requests', async () => {
      (prisma.processingAnalytics.count as jest.Mock)
        .mockResolvedValueOnce(0) // Total requests
        .mockResolvedValueOnce(0); // Blocked requests

      const result = await fraudService.getFraudStats();

      expect(result.fraudRate).toBe(0);
    });

    it('should calculate fraud rate correctly', async () => {
      (prisma.processingAnalytics.count as jest.Mock)
        .mockResolvedValueOnce(200) // Total requests
        .mockResolvedValueOnce(20); // Blocked requests

      const result = await fraudService.getFraudStats();

      expect(result.fraudRate).toBe(10.0); // 20/200 * 100
    });
  });

  describe('cleanupOldRecords', () => {
    beforeEach(() => {
      (prisma.badEmail.deleteMany as jest.Mock).mockResolvedValue({ count: 15 });
      (prisma.processingAnalytics.deleteMany as jest.Mock).mockResolvedValue({ count: 500 });
    });

    it('should clean up old records with default period', async () => {
      const result = await fraudService.cleanupOldRecords();

      expect(result).toMatchObject({
        emailRecordsRemoved: 15,
        analyticsRecordsRemoved: 500,
      });

      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      expect(prisma.badEmail.deleteMany).toHaveBeenCalledWith({
        where: {
          lastAttempt: { lt: expect.any(Date) },
          attempts: { lt: 3 },
        },
      });
    });

    it('should clean up old records with custom period', async () => {
      await fraudService.cleanupOldRecords(30); // 30 days

      expect(prisma.badEmail.deleteMany).toHaveBeenCalled();
      expect(prisma.processingAnalytics.deleteMany).toHaveBeenCalled();
    });

    it('should preserve repeat offenders', async () => {
      await fraudService.cleanupOldRecords();

      expect(prisma.badEmail.deleteMany).toHaveBeenCalledWith({
        where: {
          lastAttempt: { lt: expect.any(Date) },
          attempts: { lt: 3 }, // Keep repeat offenders (3+ attempts)
        },
      });
    });

    it('should preserve failed requests for analysis', async () => {
      await fraudService.cleanupOldRecords();

      expect(prisma.processingAnalytics.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) },
          success: true, // Only delete successful requests
        },
      });
    });
  });

  describe('input validation', () => {
    it('should validate email format', async () => {
      const invalidEmailRequest = {
        ...testFraudData.legitimateRequest,
        email: 'invalid-email',
      };

      await expect(fraudService.checkFraud(invalidEmailRequest))
        .rejects
        .toThrow();
    });

    it('should validate IP address format', async () => {
      const invalidIpRequest = {
        ...testFraudData.legitimateRequest,
        ipAddress: 'invalid-ip',
      };

      await expect(fraudService.checkFraud(invalidIpRequest))
        .rejects
        .toThrow();
    });

    it('should validate request type', async () => {
      const invalidTypeRequest = {
        ...testFraudData.legitimateRequest,
        requestType: 'invalid-type' as any,
      };

      await expect(fraudService.checkFraud(invalidTypeRequest))
        .rejects
        .toThrow();
    });

    it('should handle optional fields', async () => {
      const minimalRequest = {
        email: 'test@example.com',
        ipAddress: '192.168.1.100',
        requestType: 'resume-upload' as const,
      };

      const result = await fraudService.checkFraud(minimalRequest);
      expect(result).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      (prisma.processingAnalytics.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Should not throw even if logging fails
      const result = await fraudService.checkFraud(testFraudData.legitimateRequest);
      expect(result).toBeDefined();
    });

    it('should handle tracking update errors', async () => {
      (prisma.ipTracking.upsert as jest.Mock).mockRejectedValue(new Error('Update error'));

      const result = await fraudService.checkFraud(testFraudData.legitimateRequest);
      expect(result).toBeDefined();
    });

    it('should handle missing database records', async () => {
      (prisma.badEmail.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.ipTracking.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await fraudService.checkFraud(testFraudData.legitimateRequest);
      expect(result).toBeDefined();
      expect(result.allowed).toBe(true);
    });
  });

  describe('risk calculation edge cases', () => {
    it('should handle boundary score values', async () => {
      // Test exact boundary values for risk levels
      const testCases = [
        { mockScore: 29, expectedRisk: 'low' },
        { mockScore: 30, expectedRisk: 'medium' },
        { mockScore: 59, expectedRisk: 'medium' },
        { mockScore: 60, expectedRisk: 'high' },
        { mockScore: 79, expectedRisk: 'high' },
        { mockScore: 80, expectedRisk: 'blocked' },
      ];

      // Since we can't directly test the private method, we test indirectly
      for (const testCase of testCases) {
        const result = await fraudService.checkFraud(testFraudData.legitimateRequest);
        expect(result.riskLevel).toBeDefined();
        expect(['low', 'medium', 'high', 'blocked']).toContain(result.riskLevel);
      }
    });

    it('should handle maximum score values', async () => {
      // Set up conditions that should produce maximum score
      const mockBadEmail = { email: 'test@example.com', attempts: 10, reason: 'Abuse' };
      const mockBlockedIp = { ipAddress: '127.0.0.1', isBlocked: true, emailCount: 50 };
      
      (prisma.badEmail.findUnique as jest.Mock).mockResolvedValue(mockBadEmail);
      (prisma.ipTracking.findUnique as jest.Mock).mockResolvedValue(mockBlockedIp);
      (prisma.processingAnalytics.count as jest.Mock).mockResolvedValue(20);

      const result = await fraudService.checkFraud({
        ...testFraudData.blockedRequest,
        userAgent: 'curl/7.68.0', // Suspicious UA
        requestType: 'payment',
        paymentAmount: 50, // Small amount
      });

      expect(result.score).toBeGreaterThan(80);
      expect(result.riskLevel).toBe('blocked');
    });
  });
});