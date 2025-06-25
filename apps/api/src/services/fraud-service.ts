import { prisma } from '../lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';

// Fraud detection schemas
const FraudCheckInputSchema = z.object({
  email: z.string().email(),
  ipAddress: z.string().ip(),
  userAgent: z.string().optional(),
  requestType: z.enum(['resume-upload', 'payment', 'account-creation']),
  paymentAmount: z.number().optional(),
  templateId: z.string().optional(),
  sessionId: z.string().optional(),
});

type FraudCheckInput = z.infer<typeof FraudCheckInputSchema>;

// Fraud check result
interface FraudCheckResult {
  allowed: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'blocked';
  reasons: string[];
  actions: string[];
  score: number; // 0-100, higher = more suspicious
  blockType?: 'temporary' | 'permanent';
  blockDuration?: number; // minutes
}

// Rate limiting configuration
const RATE_LIMITS = {
  email: {
    maxRequests: 5,
    windowMinutes: 60,
    blockDurationMinutes: 120,
  },
  ip: {
    maxRequests: 10,
    windowMinutes: 15,
    blockDurationMinutes: 60,
  },
  payment: {
    maxFailedAttempts: 3,
    windowMinutes: 60,
    blockDurationMinutes: 240,
  },
} as const;

// Suspicious patterns
const SUSPICIOUS_PATTERNS = {
  emails: [
    /^[a-z0-9._%+-]+@(temp|disposable|guerrillamail|10minutemail|mailinator)\.*/i,
    /^test[0-9]*@/i,
    /^[a-z]{1,3}[0-9]{5,}@/i, // Short name + many numbers
    /\+.*\+.*@/, // Multiple + signs
  ],
  userAgents: [
    /bot|crawler|spider|scraper/i,
    /curl|wget|python|php/i,
    /postman|insomnia/i,
  ],
  domains: [
    'tempmail.org',
    'guerrillamail.com', 
    '10minutemail.com',
    'mailinator.com',
    'dispostable.com',
  ],
} as const;

class FraudService {
  /**
   * Perform comprehensive fraud check
   */
  async checkFraud(input: FraudCheckInput): Promise<FraudCheckResult> {
    // Validate input
    const validatedInput = FraudCheckInputSchema.parse(input);
    
    let score = 0;
    const reasons: string[] = [];
    const actions: string[] = [];

    // Check for permanent bans first
    const permanentBan = await this.checkPermanentBans(validatedInput);
    if (permanentBan.blocked) {
      return {
        allowed: false,
        riskLevel: 'blocked',
        reasons: permanentBan.reasons,
        actions: ['Request permanently blocked'],
        score: 100,
        blockType: 'permanent',
      };
    }

    // Check email-based fraud indicators
    const emailCheck = await this.checkEmailFraud(validatedInput.email);
    score += emailCheck.score;
    reasons.push(...emailCheck.reasons);
    actions.push(...emailCheck.actions);

    // Check IP-based fraud indicators
    const ipCheck = await this.checkIpFraud(validatedInput.ipAddress);
    score += ipCheck.score;
    reasons.push(...ipCheck.reasons);
    actions.push(...ipCheck.actions);

    // Check rate limiting
    const rateLimitCheck = await this.checkRateLimits(validatedInput);
    score += rateLimitCheck.score;
    reasons.push(...rateLimitCheck.reasons);
    actions.push(...rateLimitCheck.actions);

    // Check behavioral patterns
    const behaviorCheck = this.checkBehavioralPatterns(validatedInput);
    score += behaviorCheck.score;
    reasons.push(...behaviorCheck.reasons);
    actions.push(...behaviorCheck.actions);

    // Determine risk level and action
    const riskLevel = this.calculateRiskLevel(score);
    const allowed = this.shouldAllowRequest(riskLevel, validatedInput.requestType);

    // Log the fraud check
    await this.logFraudCheck(validatedInput, {
      allowed,
      riskLevel,
      score,
      reasons,
    });

    // Update tracking records
    if (allowed) {
      await this.updateTrackingRecords(validatedInput);
    } else {
      await this.handleBlockedRequest(validatedInput, riskLevel);
    }

    return {
      allowed,
      riskLevel,
      reasons: reasons.filter(Boolean),
      actions: actions.filter(Boolean),
      score,
      blockType: allowed ? undefined : (riskLevel === 'blocked' ? 'permanent' : 'temporary'),
      blockDuration: allowed ? undefined : this.calculateBlockDuration(riskLevel, validatedInput.requestType),
    };
  }

  /**
   * Check for permanent bans (chargebacks, etc.)
   */
  private async checkPermanentBans(input: FraudCheckInput): Promise<{
    blocked: boolean;
    reasons: string[];
  }> {
    const bans = await prisma.chargebackBlacklist.findFirst({
      where: {
        OR: [
          { email: input.email },
          { ipAddress: input.ipAddress },
        ],
      },
    });

    if (bans) {
      return {
        blocked: true,
        reasons: [`Permanently banned: ${bans.reason}`],
      };
    }

    return { blocked: false, reasons: [] };
  }

  /**
   * Check email-based fraud indicators
   */
  private async checkEmailFraud(email: string): Promise<{
    score: number;
    reasons: string[];
    actions: string[];
  }> {
    let score = 0;
    const reasons: string[] = [];
    const actions: string[] = [];

    // Check bad email list
    const badEmail = await prisma.badEmail.findUnique({
      where: { email },
    });

    if (badEmail) {
      score += 30;
      reasons.push('Email on abuse list');
      
      if (badEmail.attempts >= 5) {
        score += 50;
        reasons.push('Multiple abuse attempts from this email');
        actions.push('Consider email blocking');
      }
    }

    // Check email pattern suspicious indicators
    const domain = email.split('@')[1];
    
    // Disposable email check
    if (SUSPICIOUS_PATTERNS.domains.includes(domain!) || 
        SUSPICIOUS_PATTERNS.emails.some(pattern => pattern.test(email))) {
      score += 40;
      reasons.push('Suspicious email pattern or disposable email');
      actions.push('Require additional verification');
    }

    // Check for recent high-volume usage
    const recentUsage = await prisma.user.count({
      where: {
        email,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (recentUsage > 3) {
      score += 25;
      reasons.push('High frequency usage from this email');
    }

    return { score, reasons, actions };
  }

  /**
   * Check IP-based fraud indicators
   */
  private async checkIpFraud(ipAddress: string): Promise<{
    score: number;
    reasons: string[];
    actions: string[];
  }> {
    let score = 0;
    const reasons: string[] = [];
    const actions: string[] = [];

    // Check IP tracking
    const ipTrack = await prisma.ipTracking.findUnique({
      where: { ipAddress },
    });

    if (ipTrack) {
      if (ipTrack.isBlocked) {
        score += 80;
        reasons.push('IP address is blocked');
        actions.push('Block request');
      }

      if (ipTrack.emailCount > RATE_LIMITS.ip.maxRequests) {
        score += 30;
        reasons.push('High volume of requests from this IP');
      }

      // Check if too many emails in short time
      const recentActivity = new Date(ipTrack.lastEmail);
      const timeSinceLastActivity = Date.now() - recentActivity.getTime();
      
      if (timeSinceLastActivity < 5 * 60 * 1000 && ipTrack.emailCount > 3) {
        score += 40;
        reasons.push('Rapid successive requests from IP');
        actions.push('Implement rate limiting');
      }
    }

    // Check for VPN/Proxy indicators (simplified)
    if (this.isKnownVpnIp(ipAddress)) {
      score += 15;
      reasons.push('Request from VPN/Proxy');
    }

    return { score, reasons, actions };
  }

  /**
   * Check rate limiting violations
   */
  private async checkRateLimits(input: FraudCheckInput): Promise<{
    score: number;
    reasons: string[];
    actions: string[];
  }> {
    let score = 0;
    const reasons: string[] = [];
    const actions: string[] = [];

    const now = new Date();
    const timeWindow = new Date(now.getTime() - RATE_LIMITS.email.windowMinutes * 60 * 1000);

    // Check email rate limit
    const emailRequests = await prisma.processingAnalytics.count({
      where: {
        AND: [
          { 
            OR: [
              { userId: input.email }, // Use email as identifier for now
            ]
          },
          { createdAt: { gte: timeWindow } },
        ],
      },
    });

    if (emailRequests > RATE_LIMITS.email.maxRequests) {
      score += 50;
      reasons.push('Email rate limit exceeded');
      actions.push('Temporary block required');
    }

    // Check IP rate limit
    const ipRequests = await prisma.processingAnalytics.count({
      where: {
        ipAddress: input.ipAddress,
        createdAt: { gte: timeWindow },
      },
    });

    if (ipRequests > RATE_LIMITS.ip.maxRequests) {
      score += 40;
      reasons.push('IP rate limit exceeded');
      actions.push('IP throttling required');
    }

    return { score, reasons, actions };
  }

  /**
   * Check behavioral patterns
   */
  private checkBehavioralPatterns(input: FraudCheckInput): {
    score: number;
    reasons: string[];
    actions: string[];
  } {
    let score = 0;
    const reasons: string[] = [];
    const actions: string[] = [];

    // Check User-Agent patterns
    if (input.userAgent) {
      const isSuspiciousUA = SUSPICIOUS_PATTERNS.userAgents.some(pattern => 
        pattern.test(input.userAgent!)
      );
      
      if (isSuspiciousUA) {
        score += 35;
        reasons.push('Suspicious user agent detected');
        actions.push('Additional verification required');
      }

      // Check for missing or minimal user agent
      if (input.userAgent.length < 20) {
        score += 20;
        reasons.push('Minimal or missing user agent');
      }
    }

    // Check for automated behavior patterns
    if (input.requestType === 'payment' && input.paymentAmount) {
      // Check for round number amounts (potential testing)
      if (input.paymentAmount % 1000 === 0) {
        score += 10;
        reasons.push('Round payment amount');
      }

      // Check for very small amounts (potential testing)
      if (input.paymentAmount < 100) {
        score += 15;
        reasons.push('Unusually small payment amount');
      }
    }

    return { score, reasons, actions };
  }

  /**
   * Calculate risk level based on score
   */
  private calculateRiskLevel(score: number): 'low' | 'medium' | 'high' | 'blocked' {
    if (score >= 80) return 'blocked';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  /**
   * Determine if request should be allowed
   */
  private shouldAllowRequest(riskLevel: string, requestType: string): boolean {
    switch (riskLevel) {
      case 'blocked':
        return false;
      case 'high':
        return requestType === 'account-creation'; // Only allow account creation
      case 'medium':
        return requestType !== 'payment'; // Block payments, allow others
      case 'low':
      default:
        return true;
    }
  }

  /**
   * Calculate block duration based on risk level
   */
  private calculateBlockDuration(riskLevel: string, requestType: string): number {
    switch (riskLevel) {
      case 'blocked':
        return 0; // Permanent
      case 'high':
        return requestType === 'payment' ? 480 : 120; // 8 hours for payment, 2 hours others
      case 'medium':
        return 60; // 1 hour
      default:
        return 15; // 15 minutes
    }
  }

  /**
   * Log fraud check for analytics
   */
  private async logFraudCheck(
    input: FraudCheckInput,
    result: {
      allowed: boolean;
      riskLevel: string;
      score: number;
      reasons: string[];
    }
  ): Promise<void> {
    await prisma.processingAnalytics.create({
      data: {
        requestId: crypto.randomUUID(),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        templateType: input.templateId || 'unknown',
        processingTimeMs: 0, // Fraud check processing time
        success: result.allowed,
        errorType: result.allowed ? null : 'fraud_detection',
        errorMessage: result.allowed ? null : result.reasons.join(', '),
        isFirstTimeUser: true, // Default for now
        paidRequest: input.requestType === 'payment',
        revenue: input.paymentAmount || 0,
      },
    });
  }

  /**
   * Update tracking records for allowed requests
   */
  private async updateTrackingRecords(input: FraudCheckInput): Promise<void> {
    // Update IP tracking
    await prisma.ipTracking.upsert({
      where: { ipAddress: input.ipAddress },
      update: {
        emailCount: { increment: 1 },
        lastEmail: new Date(),
      },
      create: {
        ipAddress: input.ipAddress,
        emailCount: 1,
        lastEmail: new Date(),
      },
    });

    // Update user tracking if needed
    if (input.requestType === 'account-creation') {
      await prisma.user.upsert({
        where: { email: input.email },
        update: {
          lastLoginAt: new Date(),
        },
        create: {
          email: input.email,
          isFirstTime: true,
        },
      });
    }
  }

  /**
   * Handle blocked requests
   */
  private async handleBlockedRequest(
    input: FraudCheckInput,
    riskLevel: string
  ): Promise<void> {
    if (riskLevel === 'high' || riskLevel === 'blocked') {
      // Add to bad email list
      await prisma.badEmail.upsert({
        where: { email: input.email },
        update: {
          attempts: { increment: 1 },
          lastAttempt: new Date(),
          reason: `Fraud detection: ${riskLevel} risk`,
        },
        create: {
          email: input.email,
          attempts: 1,
          reason: `Fraud detection: ${riskLevel} risk`,
        },
      });

      // Update IP tracking
      if (riskLevel === 'blocked') {
        await prisma.ipTracking.upsert({
          where: { ipAddress: input.ipAddress },
          update: {
            isBlocked: true,
            blockReason: 'Fraud detection',
          },
          create: {
            ipAddress: input.ipAddress,
            emailCount: 1,
            isBlocked: true,
            blockReason: 'Fraud detection',
          },
        });
      }
    }
  }

  /**
   * Check if IP is from known VPN/Proxy (simplified implementation)
   */
  private isKnownVpnIp(ipAddress: string): boolean {
    // This would integrate with a VPN detection service in production
    // For now, just check some common patterns
    const vpnPatterns = [
      /^10\./, // Private network
      /^192\.168\./, // Private network
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private network
    ];

    return vpnPatterns.some(pattern => pattern.test(ipAddress));
  }

  /**
   * Report fraudulent activity (for manual review)
   */
  async reportFraud(data: {
    email: string;
    ipAddress: string;
    reason: string;
    evidence: any;
    reportedBy: string;
  }): Promise<void> {
    // Add to bad email list
    await prisma.badEmail.upsert({
      where: { email: data.email },
      update: {
        attempts: { increment: 1 },
        reason: `Manual report: ${data.reason}`,
        lastAttempt: new Date(),
      },
      create: {
        email: data.email,
        attempts: 1,
        reason: `Manual report: ${data.reason}`,
      },
    });

    // Block IP if severe
    if (data.reason.includes('chargeback') || data.reason.includes('fraud')) {
      await prisma.ipTracking.upsert({
        where: { ipAddress: data.ipAddress },
        update: {
          isBlocked: true,
          blockReason: data.reason,
        },
        create: {
          ipAddress: data.ipAddress,
          emailCount: 1,
          isBlocked: true,
          blockReason: data.reason,
        },
      });
    }
  }

  /**
   * Get fraud statistics
   */
  async getFraudStats(): Promise<{
    blockedRequests: number;
    suspiciousEmails: number;
    blockedIps: number;
    fraudRate: number;
  }> {
    const totalRequests = await prisma.processingAnalytics.count();
    const blockedRequests = await prisma.processingAnalytics.count({
      where: { errorType: 'fraud_detection' },
    });
    
    const suspiciousEmails = await prisma.badEmail.count();
    const blockedIps = await prisma.ipTracking.count({
      where: { isBlocked: true },
    });

    const fraudRate = totalRequests > 0 ? (blockedRequests / totalRequests) * 100 : 0;

    return {
      blockedRequests,
      suspiciousEmails,
      blockedIps,
      fraudRate,
    };
  }

  /**
   * Clean up old fraud records
   */
  async cleanupOldRecords(daysOld: number = 90): Promise<{
    emailRecordsRemoved: number;
    analyticsRecordsRemoved: number;
  }> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const emailCleanup = await prisma.badEmail.deleteMany({
      where: {
        lastAttempt: { lt: cutoffDate },
        attempts: { lt: 3 }, // Keep repeat offenders
      },
    });

    const analyticsCleanup = await prisma.processingAnalytics.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        success: true, // Keep failed requests for analysis
      },
    });

    return {
      emailRecordsRemoved: emailCleanup.count,
      analyticsRecordsRemoved: analyticsCleanup.count,
    };
  }
}

// Export singleton instance
export const fraudService = new FraudService();
export type { FraudCheckResult, FraudCheckInput };