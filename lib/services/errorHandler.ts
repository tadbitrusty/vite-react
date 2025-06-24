/**
 * Production Error Handling for ResumeSniper
 * Comprehensive error handling, logging, and monitoring system
 */

export interface ErrorContext {
  requestId?: string;
  email?: string;
  template?: string;
  ip?: string;
  userAgent?: string;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error_code: string;
  message: string;
  request_id: string;
  timestamp: string;
  details?: any;
}

// Error codes for consistent error handling
export const ERROR_CODES = {
  // Validation Errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_TEMPLATE: 'INVALID_TEMPLATE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  
  // Authentication/Authorization Errors
  EMAIL_BLOCKED: 'EMAIL_BLOCKED',
  IP_BLOCKED: 'IP_BLOCKED',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  CHARGEBACK_BANNED: 'CHARGEBACK_BANNED',
  
  // Processing Errors
  AI_PROCESSING_FAILED: 'AI_PROCESSING_FAILED',
  TEMPLATE_PROCESSING_FAILED: 'TEMPLATE_PROCESSING_FAILED',
  EMAIL_DELIVERY_FAILED: 'EMAIL_DELIVERY_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // External Service Errors
  STRIPE_ERROR: 'STRIPE_ERROR',
  ANTHROPIC_ERROR: 'ANTHROPIC_ERROR',
  RESEND_ERROR: 'RESEND_ERROR',
  
  // System Errors
  RATE_LIMITED: 'RATE_LIMITED',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  TIMEOUT: 'TIMEOUT',
  INSUFFICIENT_RESOURCES: 'INSUFFICIENT_RESOURCES',
} as const;

// Error messages for user-facing responses
export const ERROR_MESSAGES = {
  [ERROR_CODES.VALIDATION_FAILED]: 'Invalid input data provided',
  [ERROR_CODES.INVALID_EMAIL]: 'Please provide a valid email address',
  [ERROR_CODES.INVALID_TEMPLATE]: 'Selected template is not available',
  [ERROR_CODES.FILE_TOO_LARGE]: 'Resume file is too large. Maximum size is 10MB',
  [ERROR_CODES.INVALID_FILE_TYPE]: 'Please upload a PDF, DOCX, DOC, TXT, or RTF file',
  
  [ERROR_CODES.EMAIL_BLOCKED]: 'This email address is not authorized for processing',
  [ERROR_CODES.IP_BLOCKED]: 'Too many requests from this location. Please try again later',
  [ERROR_CODES.PAYMENT_REQUIRED]: 'Payment required for this template',
  [ERROR_CODES.CHARGEBACK_BANNED]: 'Account access restricted',
  
  [ERROR_CODES.AI_PROCESSING_FAILED]: 'Failed to optimize resume. Please try again',
  [ERROR_CODES.TEMPLATE_PROCESSING_FAILED]: 'Failed to generate resume template',
  [ERROR_CODES.EMAIL_DELIVERY_FAILED]: 'Failed to send resume. Please check your email address',
  [ERROR_CODES.DATABASE_ERROR]: 'Database temporarily unavailable. Please try again',
  
  [ERROR_CODES.STRIPE_ERROR]: 'Payment processing failed. Please try again',
  [ERROR_CODES.ANTHROPIC_ERROR]: 'AI service temporarily unavailable',
  [ERROR_CODES.RESEND_ERROR]: 'Email service temporarily unavailable',
  
  [ERROR_CODES.RATE_LIMITED]: 'Too many requests. Please wait before trying again',
  [ERROR_CODES.SYSTEM_ERROR]: 'Internal system error. Please try again later',
  [ERROR_CODES.TIMEOUT]: 'Request timed out. Please try again',
  [ERROR_CODES.INSUFFICIENT_RESOURCES]: 'Service temporarily overloaded. Please try again',
} as const;

// Production logger
export class Logger {
  private static instance: Logger;
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  private log(level: 'info' | 'warn' | 'error', message: string, data?: any, context?: ErrorContext) {
    const logEntry = {
      level,
      message,
      data,
      context,
      timestamp: new Date().toISOString(),
      service: 'resumesniper-api',
      version: '1.0.0'
    };
    
    // In production, this would go to your logging service (e.g., CloudWatch, DataDog)
    if (level === 'error') {
      console.error(JSON.stringify(logEntry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }
  
  info(message: string, data?: any, context?: ErrorContext) {
    this.log('info', message, data, context);
  }
  
  warn(message: string, data?: any, context?: ErrorContext) {
    this.log('warn', message, data, context);
  }
  
  error(message: string, error?: Error, data?: any, context?: ErrorContext) {
    this.log('error', message, {
      ...data,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    }, context);
  }
}

// Application error class
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: ErrorContext;
  public readonly isOperational: boolean;
  
  constructor(
    code: keyof typeof ERROR_CODES,
    message?: string,
    statusCode: number = 400,
    context?: ErrorContext,
    isOperational: boolean = true
  ) {
    super(message || ERROR_MESSAGES[code]);
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.isOperational = isOperational;
    this.name = 'AppError';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler for API routes
export function handleError(
  error: any,
  requestId: string,
  context?: Partial<ErrorContext>
): ErrorResponse {
  const logger = Logger.getInstance();
  const timestamp = new Date().toISOString();
  
  const fullContext: ErrorContext = {
    ...context,
    requestId,
    timestamp
  };
  
  // Handle known AppError instances
  if (error instanceof AppError) {
    logger.warn(`AppError: ${error.code}`, { 
      message: error.message,
      statusCode: error.statusCode 
    }, fullContext);
    
    return {
      success: false,
      error_code: error.code,
      message: error.message,
      request_id: requestId,
      timestamp
    };
  }
  
  // Handle Stripe errors
  if (error.type && error.type.startsWith('Stripe')) {
    logger.error('Stripe API error', error, { type: error.type }, fullContext);
    
    return {
      success: false,
      error_code: ERROR_CODES.STRIPE_ERROR,
      message: ERROR_MESSAGES[ERROR_CODES.STRIPE_ERROR],
      request_id: requestId,
      timestamp
    };
  }
  
  // Handle Anthropic errors
  if (error.type === 'api_error' && error.error?.type) {
    logger.error('Anthropic API error', error, { 
      type: error.error.type,
      message: error.error.message 
    }, fullContext);
    
    return {
      success: false,
      error_code: ERROR_CODES.ANTHROPIC_ERROR,
      message: ERROR_MESSAGES[ERROR_CODES.ANTHROPIC_ERROR],
      request_id: requestId,
      timestamp
    };
  }
  
  // Handle database errors
  if (error.code && (error.code.startsWith('23') || error.code.startsWith('42'))) {
    logger.error('Database error', error, { 
      code: error.code,
      detail: error.detail 
    }, fullContext);
    
    return {
      success: false,
      error_code: ERROR_CODES.DATABASE_ERROR,
      message: ERROR_MESSAGES[ERROR_CODES.DATABASE_ERROR],
      request_id: requestId,
      timestamp
    };
  }
  
  // Handle timeout errors
  if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    logger.error('Timeout error', error, {}, fullContext);
    
    return {
      success: false,
      error_code: ERROR_CODES.TIMEOUT,
      message: ERROR_MESSAGES[ERROR_CODES.TIMEOUT],
      request_id: requestId,
      timestamp
    };
  }
  
  // Handle unexpected errors
  logger.error('Unexpected error', error, {
    type: error.constructor.name,
    message: error.message
  }, fullContext);
  
  return {
    success: false,
    error_code: ERROR_CODES.SYSTEM_ERROR,
    message: ERROR_MESSAGES[ERROR_CODES.SYSTEM_ERROR],
    request_id: requestId,
    timestamp
  };
}

// Validation utilities
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

export function validateTemplate(template: string): boolean {
  const validTemplates = [
    'ats-optimized',
    'entry-clean', 
    'tech-focus',
    'professional-plus',
    'executive-format'
  ];
  return validTemplates.includes(template);
}

export function validateFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
  return size <= maxSize;
}

export function validateFileType(fileName: string): boolean {
  const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.rtf'];
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return allowedExtensions.includes(extension);
}

// Rate limiting utilities
export class RateLimiter {
  private static requests = new Map<string, number[]>();
  private static readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private static readonly MAX_REQUESTS = 5;
  
  static isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove expired requests
    const validRequests = userRequests.filter(timestamp => now - timestamp < this.WINDOW_MS);
    
    if (validRequests.length >= this.MAX_REQUESTS) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
  
  static getRemainingTime(identifier: string): number {
    const userRequests = this.requests.get(identifier) || [];
    if (userRequests.length === 0) return 0;
    
    const oldestRequest = Math.min(...userRequests);
    const remainingTime = this.WINDOW_MS - (Date.now() - oldestRequest);
    
    return Math.max(0, remainingTime);
  }
}

// Security utilities
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getClientIP(req: any): string {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         '127.0.0.1';
}