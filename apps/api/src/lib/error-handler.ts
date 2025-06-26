import { TRPCError } from '@trpc/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { config } from '@resume-vita/config';

// Custom error types
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, true, context);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: Record<string, any>) {
    super(message, 'AUTHENTICATION_ERROR', 401, true, context);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context?: Record<string, any>) {
    super(message, 'AUTHORIZATION_ERROR', 403, true, context);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, true, { resource, identifier });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CONFLICT', 409, true, context);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context?: Record<string, any>) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, true, context);
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: Error) {
    super(
      `External service '${service}' is unavailable`,
      'EXTERNAL_SERVICE_ERROR',
      503,
      true,
      { service, originalError: originalError?.message }
    );
    this.name = 'ExternalServiceError';
  }
}

export class FileProcessingError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'FILE_PROCESSING_ERROR', 422, true, context);
    this.name = 'FileProcessingError';
  }
}

export class PaymentError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'PAYMENT_ERROR', 402, true, context);
    this.name = 'PaymentError';
  }
}

export class FraudDetectionError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'FRAUD_DETECTION', 403, true, context);
    this.name = 'FraudDetectionError';
  }
}

// Error mapping for different error types
export function mapErrorToTRPCError(error: unknown): TRPCError {
  // Handle our custom AppErrors
  if (error instanceof AppError) {
    const code = mapStatusCodeToTRPCCode(error.statusCode);
    return new TRPCError({
      code,
      message: error.message,
      cause: error,
    });
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Validation failed',
      cause: error,
    });
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return mapPrismaError(error);
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Database error occurred',
      cause: error,
    });
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid database query',
      cause: error,
    });
  }

  // Handle standard JavaScript errors
  if (error instanceof Error) {
    // Check if it's a known error pattern
    if (error.message.includes('Network Error') || error.message.includes('ECONNREFUSED')) {
      return new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'External service unavailable',
        cause: error,
      });
    }

    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return new TRPCError({
        code: 'TIMEOUT',
        message: 'Request timeout',
        cause: error,
      });
    }

    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: config.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message,
      cause: error,
    });
  }

  // Fallback for unknown errors
  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    cause: error,
  });
}

// Map HTTP status codes to tRPC codes
function mapStatusCodeToTRPCCode(statusCode: number): TRPCError['code'] {
  switch (statusCode) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE_CONTENT';
    case 429:
      return 'TOO_MANY_REQUESTS';
    case 500:
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

// Map Prisma errors to tRPC errors
function mapPrismaError(error: Prisma.PrismaClientKnownRequestError): TRPCError {
  switch (error.code) {
    case 'P2000':
      return new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Input value too long',
        cause: error,
      });
    case 'P2001':
      return new TRPCError({
        code: 'NOT_FOUND',
        message: 'Record not found',
        cause: error,
      });
    case 'P2002':
      return new TRPCError({
        code: 'CONFLICT',
        message: 'Unique constraint violation',
        cause: error,
      });
    case 'P2003':
      return new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Foreign key constraint violation',
        cause: error,
      });
    case 'P2025':
      return new TRPCError({
        code: 'NOT_FOUND',
        message: 'Record to update not found',
        cause: error,
      });
    default:
      return new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database operation failed',
        cause: error,
      });
  }
}

// Error logging utility
export function logError(error: unknown, context?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const requestId = context?.requestId || 'unknown';
  
  if (error instanceof AppError) {
    console.error(`[${timestamp}] [${requestId}] AppError: ${error.code}`, {
      message: error.message,
      statusCode: error.statusCode,
      context: error.context,
      stack: error.stack,
    });
  } else if (error instanceof Error) {
    console.error(`[${timestamp}] [${requestId}] Error: ${error.name}`, {
      message: error.message,
      stack: error.stack,
      context,
    });
  } else {
    console.error(`[${timestamp}] [${requestId}] Unknown error:`, {
      error,
      context,
    });
  }
}

// Error recovery utilities
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.code === 'EXTERNAL_SERVICE_ERROR' || error.statusCode >= 500;
  }
  
  if (error instanceof Error) {
    const retryablePatterns = [
      /network error/i,
      /timeout/i,
      /econnrefused/i,
      /enotfound/i,
      /503/,
      /502/,
      /504/,
    ];
    
    return retryablePatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.name)
    );
  }
  
  return false;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      logError(error, { attempt, maxRetries, nextRetryIn: delay });
    }
  }
  
  throw lastError;
}

// Circuit breaker implementation
export class CircuitBreaker {
  private failures = 0;
  private nextAttempt = Date.now();
  
  constructor(
    private readonly failureThreshold: number = 5,
    private readonly resetTimeout: number = 60000 // 1 minute
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new ExternalServiceError('Circuit breaker is open');
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private isOpen(): boolean {
    return this.failures >= this.failureThreshold && Date.now() < this.nextAttempt;
  }
  
  private onSuccess(): void {
    this.failures = 0;
  }
  
  private onFailure(): void {
    this.failures++;
    if (this.failures >= this.failureThreshold) {
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }
  
  getStatus(): { failures: number; isOpen: boolean; nextAttempt: number } {
    return {
      failures: this.failures,
      isOpen: this.isOpen(),
      nextAttempt: this.nextAttempt,
    };
  }
}

// Global error handler for uncaught exceptions
export function setupGlobalErrorHandlers(): void {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    logError(error, { type: 'uncaughtException' });
    
    // Graceful shutdown
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    logError(reason, { type: 'unhandledRejection' });
  });
}

// Error sanitization for client responses
export function sanitizeErrorForClient(error: unknown): {
  message: string;
  code: string;
  statusCode?: number;
} {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }
  
  if (error instanceof ZodError) {
    return {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    };
  }
  
  // Don't expose internal errors in production
  if (config.env.NODE_ENV === 'production') {
    return {
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500,
    };
  }
  
  return {
    message: error instanceof Error ? error.message : 'Unknown error',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
  };
}

// Export circuit breakers for external services
export const aiServiceCircuitBreaker = new CircuitBreaker(5, 60000);
export const paymentServiceCircuitBreaker = new CircuitBreaker(3, 120000);
export const emailServiceCircuitBreaker = new CircuitBreaker(10, 30000);