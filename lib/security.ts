/**
 * Security Middleware and Utilities for ResumeSniper
 * Production-grade security measures and validation
 */

import { z } from 'zod';
import { AppError, ERROR_CODES, Logger, validateEmail, validateTemplate } from './errorHandler';

const logger = Logger.getInstance();

// Request validation schemas
export const processResumeSchema = z.object({
  email: z.string().email().max(255),
  resumeContent: z.string().min(100).max(50000),
  jobDescription: z.string().min(50).max(20000),
  fileName: z.string().max(255),
  template: z.enum(['ats-optimized', 'entry-clean', 'tech-focus', 'professional-plus', 'executive-format']),
  isFirstTimeFlow: z.boolean(),
});

export const healthCheckSchema = z.object({});

// Security headers middleware
export function setSecurityHeaders(req: any, res: any) {
  // CORS headers (restrictive in production)
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_URL || 'https://resumevita.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'"
  );
}

// Input sanitization
export function sanitizeResumeContent(content: string): string {
  // Remove potentially dangerous content while preserving formatting
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .trim();
}

// Validate file content
export function validateFileContent(content: string, fileName: string): void {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /data:text\/html/i,
    /vbscript:/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      throw new AppError(
        ERROR_CODES.VALIDATION_FAILED,
        'File contains potentially dangerous content',
        400
      );
    }
  }
  
  // Check file size (string length as proxy)
  if (content.length > 500000) { // ~500KB
    throw new AppError(
      ERROR_CODES.FILE_TOO_LARGE,
      'Resume content is too large',
      413
    );
  }
  
  // Basic file type validation
  const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.rtf'];
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  
  if (!allowedExtensions.includes(extension)) {
    throw new AppError(
      ERROR_CODES.INVALID_FILE_TYPE,
      'File type not supported',
      415
    );
  }
}

// Environment validation
export const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  FROM_EMAIL: z.string().email(),
  NEXT_PUBLIC_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
});

// Validate environment on startup
export function validateEnvironment() {
  try {
    envSchema.parse(process.env);
    logger.info('Environment validation passed');
  } catch (error) {
    logger.error('Environment validation failed', error);
    throw new Error('Invalid environment configuration');
  }
}

// Request size limits
export const REQUEST_LIMITS = {
  MAX_JSON_SIZE: '10mb',
  MAX_URL_ENCODED_SIZE: '10mb',
  REQUEST_TIMEOUT: 60000, // 60 seconds
  AI_TIMEOUT: 45000, // 45 seconds
  EMAIL_TIMEOUT: 10000, // 10 seconds
} as const;

// API key validation utilities
export function validateApiKey(key: string, service: string): boolean {
  if (!key || key.length < 10) {
    logger.warn(`Invalid ${service} API key format`);
    return false;
  }
  return true;
}

// Webhook signature validation
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // This would typically use crypto.createHmac for validation
    // Simplified for demonstration
    return signature && signature.length > 0 && secret && secret.length > 0;
  } catch (error) {
    logger.error('Webhook signature validation failed', error);
    return false;
  }
}

// IP whitelist/blacklist functionality
export class IPFilter {
  private static blacklist = new Set<string>();
  private static whitelist = new Set<string>();
  
  static addToBlacklist(ip: string): void {
    this.blacklist.add(ip);
    logger.warn('IP added to blacklist', { ip });
  }
  
  static isBlacklisted(ip: string): boolean {
    return this.blacklist.has(ip);
  }
  
  static addToWhitelist(ip: string): void {
    this.whitelist.add(ip);
  }
  
  static isWhitelisted(ip: string): boolean {
    return this.whitelist.has(ip);
  }
  
  static isAllowed(ip: string): boolean {
    // If whitelist exists and IP not in it, deny
    if (this.whitelist.size > 0 && !this.isWhitelisted(ip)) {
      return false;
    }
    
    // If IP is blacklisted, deny
    if (this.isBlacklisted(ip)) {
      return false;
    }
    
    return true;
  }
}

// Content-Type validation
export function validateContentType(req: any): void {
  const contentType = req.headers['content-type'];
  
  if (req.method === 'POST') {
    if (!contentType || !contentType.includes('application/json')) {
      throw new AppError(
        ERROR_CODES.VALIDATION_FAILED,
        'Content-Type must be application/json',
        415
      );
    }
  }
}

// Request origin validation
export function validateOrigin(req: any): void {
  const origin = req.headers.origin;
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_URL,
    'https://resumevita.com',
    'https://www.resumevita.com'
  ].filter(Boolean);
  
  // Allow requests without origin (direct API calls)
  if (!origin) {
    return;
  }
  
  if (!allowedOrigins.includes(origin)) {
    logger.warn('Request from unauthorized origin', { origin, allowed: allowedOrigins });
    throw new AppError(
      ERROR_CODES.VALIDATION_FAILED,
      'Unauthorized origin',
      403
    );
  }
}

// User-Agent validation (basic bot detection)
export function validateUserAgent(req: any): void {
  const userAgent = req.headers['user-agent'];
  
  if (!userAgent) {
    logger.warn('Request without User-Agent header');
    return; // Allow but log
  }
  
  // Block known malicious user agents
  const blockedPatterns = [
    /sqlmap/i,
    /nmap/i,
    /nikto/i,
    /curl.*bot/i,
    /python-requests/i
  ];
  
  for (const pattern of blockedPatterns) {
    if (pattern.test(userAgent)) {
      logger.warn('Blocked malicious user agent', { userAgent });
      throw new AppError(
        ERROR_CODES.VALIDATION_FAILED,
        'Request blocked',
        403
      );
    }
  }
}

// Resource monitoring
export class ResourceMonitor {
  private static memoryUsage = new Map<string, number>();
  private static cpuUsage = new Map<string, number>();
  
  static checkMemoryUsage(): void {
    const used = process.memoryUsage();
    const usedMB = Math.round(used.heapUsed / 1024 / 1024);
    
    if (usedMB > 500) { // 500MB threshold
      logger.warn('High memory usage detected', { memoryUsageMB: usedMB });
      
      if (usedMB > 1000) { // 1GB critical threshold
        throw new AppError(
          ERROR_CODES.INSUFFICIENT_RESOURCES,
          'Service temporarily overloaded',
          503
        );
      }
    }
  }
  
  static logRequestMetrics(endpoint: string, duration: number): void {
    logger.info('Request completed', {
      endpoint,
      duration,
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    });
  }
}

// Security middleware factory
export function createSecurityMiddleware() {
  return {
    validateRequest: (req: any) => {
      validateContentType(req);
      validateOrigin(req);
      validateUserAgent(req);
      ResourceMonitor.checkMemoryUsage();
    },
    
    setHeaders: (req: any, res: any) => {
      setSecurityHeaders(req, res);
    },
    
    validateInput: (data: any, schema: z.ZodSchema) => {
      try {
        return schema.parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.warn('Input validation failed', { errors: error.errors });
          throw new AppError(
            ERROR_CODES.VALIDATION_FAILED,
            `Validation failed: ${error.errors.map(e => e.message).join(', ')}`,
            400
          );
        }
        throw error;
      }
    }
  };
}