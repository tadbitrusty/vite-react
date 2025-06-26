import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config } from '../lib/config';
import { rateLimiter } from './cache-middleware';
import { TRPCError } from '@trpc/server';
import crypto from 'crypto';

// Security headers middleware
export function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Swagger UI
          "https://cdn.jsdelivr.net",
          "https://unpkg.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Swagger UI
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:",
        ],
        connectSrc: [
          "'self'",
          "https://api.stripe.com",
          "https://checkout.stripe.com",
        ],
        frameSrc: [
          "https://checkout.stripe.com",
          "https://js.stripe.com",
        ],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for API usage
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });
}

// Rate limiting middleware
export function createRateLimiter(options: {
  windowMs?: number;
  max?: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) {
  return rateLimit({
    windowMs: options.windowMs || config.rateLimit.windowMs,
    max: options.max || config.rateLimit.maxRequests,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: options.message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil((options.windowMs || config.rateLimit.windowMs) / 1000),
      },
    },
    standardHeaders: options.standardHeaders ?? true,
    legacyHeaders: options.legacyHeaders ?? false,
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    skipFailedRequests: options.skipFailedRequests ?? true,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later.',
          retryAfter: Math.ceil((options.windowMs || config.rateLimit.windowMs) / 1000),
        },
      });
    },
  });
}

// Custom rate limiter with Redis
export function customRateLimiter(options: {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip if condition is met
      if (options.skip && options.skip(req)) {
        return next();
      }

      // Generate key for rate limiting
      const key = options.keyGenerator 
        ? options.keyGenerator(req)
        : req.ip || 'unknown';

      // Check rate limit
      const result = await rateLimiter.checkRateLimit(
        key,
        req.path,
      );

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': config.rateLimit.maxRequests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      });

      if (!result.allowed) {
        res.set('Retry-After', result.retryAfter?.toString() || '60');
        return res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later.',
            retryAfter: result.retryAfter,
          },
        });
      }

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Continue on error to avoid blocking legitimate requests
      next();
    }
  };
}

// Input validation and sanitization
export class InputSanitizer {
  static sanitizeString(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Input must be a string',
      });
    }

    // Remove potentially dangerous characters
    let sanitized = input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove JavaScript URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();

    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  static sanitizeEmail(email: string): string {
    const sanitized = this.sanitizeString(email, 255).toLowerCase();
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid email format',
      });
    }

    return sanitized;
  }

  static sanitizeFileName(fileName: string): string {
    // Remove path traversal attempts and dangerous characters
    return fileName
      .replace(/\.\./g, '')
      .replace(/[\/\\:*?"<>|]/g, '')
      .replace(/^\.+/, '')
      .trim();
  }

  static validateFileType(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimeType.toLowerCase());
  }

  static validateFileSize(size: number, maxSize: number): boolean {
    return size > 0 && size <= maxSize;
  }
}

// Request validation middleware
export function validateRequest(options: {
  maxBodySize?: number;
  allowedMethods?: string[];
  requireContentType?: string[];
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate HTTP method
      if (options.allowedMethods && !options.allowedMethods.includes(req.method)) {
        return res.status(405).json({
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${req.method} not allowed`,
          },
        });
      }

      // Validate Content-Type for POST/PUT requests
      if (options.requireContentType && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.get('Content-Type') || '';
        const isValidContentType = options.requireContentType.some(type => 
          contentType.includes(type)
        );

        if (!isValidContentType) {
          return res.status(400).json({
            error: {
              code: 'INVALID_CONTENT_TYPE',
              message: 'Invalid or missing Content-Type header',
              expected: options.requireContentType,
            },
          });
        }
      }

      // Validate request body size
      if (options.maxBodySize && req.get('Content-Length')) {
        const contentLength = parseInt(req.get('Content-Length') || '0', 10);
        if (contentLength > options.maxBodySize) {
          return res.status(413).json({
            error: {
              code: 'PAYLOAD_TOO_LARGE',
              message: 'Request body too large',
              maxSize: options.maxBodySize,
            },
          });
        }
      }

      next();
    } catch (error) {
      console.error('Request validation error:', error);
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid request',
        },
      });
    }
  };
}

// Security event logging
export class SecurityLogger {
  static logSecurityEvent(event: {
    type: 'auth_failure' | 'rate_limit' | 'invalid_input' | 'suspicious_activity';
    ip: string;
    userAgent?: string;
    userId?: string;
    details?: any;
  }): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'SECURITY',
      event: event.type,
      ip: event.ip,
      userAgent: event.userAgent,
      userId: event.userId,
      details: event.details,
      requestId: crypto.randomUUID(),
    };

    console.warn('Security Event:', JSON.stringify(logEntry));
    
    // In production, send to security monitoring service
    // await sendToSecurityMonitoring(logEntry);
  }

  static logFailedAuth(req: Request, reason: string): void {
    this.logSecurityEvent({
      type: 'auth_failure',
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent'),
      details: { reason, path: req.path, method: req.method },
    });
  }

  static logSuspiciousActivity(req: Request, activity: string, details?: any): void {
    this.logSecurityEvent({
      type: 'suspicious_activity',
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
      details: { activity, ...details },
    });
  }
}

// IP whitelist/blacklist middleware
export class IPFilter {
  private static whitelist: Set<string> = new Set();
  private static blacklist: Set<string> = new Set();

  static addToWhitelist(ip: string): void {
    this.whitelist.add(ip);
  }

  static addToBlacklist(ip: string): void {
    this.blacklist.add(ip);
  }

  static removeFromWhitelist(ip: string): void {
    this.whitelist.delete(ip);
  }

  static removeFromBlacklist(ip: string): void {
    this.blacklist.delete(ip);
  }

  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

      // Check blacklist first
      if (this.blacklist.has(clientIP)) {
        SecurityLogger.logSecurityEvent({
          type: 'suspicious_activity',
          ip: clientIP,
          userAgent: req.get('User-Agent'),
          details: { reason: 'IP in blacklist', path: req.path },
        });

        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied',
          },
        });
      }

      // If whitelist is configured, check it
      if (this.whitelist.size > 0 && !this.whitelist.has(clientIP)) {
        SecurityLogger.logSecurityEvent({
          type: 'suspicious_activity',
          ip: clientIP,
          userAgent: req.get('User-Agent'),
          details: { reason: 'IP not in whitelist', path: req.path },
        });

        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied',
          },
        });
      }

      next();
    };
  }
}

// Request signature validation (for webhooks)
export function validateSignature(secret: string, headerName: string = 'x-signature') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.get(headerName);
      
      if (!signature) {
        return res.status(401).json({
          error: {
            code: 'MISSING_SIGNATURE',
            message: 'Request signature required',
          },
        });
      }

      const body = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      const providedSignature = signature.replace('sha256=', '');

      if (!crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      )) {
        SecurityLogger.logSecurityEvent({
          type: 'auth_failure',
          ip: req.ip || 'unknown',
          details: { reason: 'Invalid signature', path: req.path },
        });

        return res.status(401).json({
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid request signature',
          },
        });
      }

      next();
    } catch (error) {
      console.error('Signature validation error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Signature validation failed',
        },
      });
    }
  };
}

// Environment-based security configuration
export function getSecurityConfig() {
  const isDevelopment = config.nodeEnv === 'development';
  const isProduction = config.nodeEnv === 'production';

  return {
    rateLimiting: {
      enabled: !isDevelopment,
      windowMs: isDevelopment ? 60000 : config.rateLimit.windowMs, // 1 minute in dev
      maxRequests: isDevelopment ? 1000 : config.rateLimit.maxRequests,
    },
    cors: {
      enabled: true,
      origin: config.cors.origin,
      credentials: true,
      optionsSuccessStatus: 200,
    },
    helmet: {
      enabled: true,
      contentSecurityPolicy: !isDevelopment, // Disable CSP in development
    },
    https: {
      required: isProduction,
      redirectToHttps: isProduction,
    },
    logging: {
      level: isDevelopment ? 'debug' : 'info',
      securityEvents: true,
    },
  };
}

// HTTPS redirect middleware
export function requireHttps() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (config.nodeEnv === 'production' && !req.secure && req.get('X-Forwarded-Proto') !== 'https') {
      const httpsUrl = `https://${req.get('Host')}${req.url}`;
      return res.redirect(301, httpsUrl);
    }
    next();
  };
}