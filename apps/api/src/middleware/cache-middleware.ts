import { TRPCError } from '@trpc/server';
import { cache, CacheKeys, CacheTTL } from '../lib/cache';
import { config } from '../lib/config';

export interface CacheMiddlewareOptions {
  ttl?: number;
  keyGenerator?: (...args: any[]) => string;
  skipCache?: boolean;
  namespace?: string;
}

export function withCache<T extends any[], R>(
  options: CacheMiddlewareOptions = {}
) {
  return function cacheDecorator(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: T): Promise<R> {
      // Skip cache if disabled globally or for this specific call
      if (!config.features.caching || options.skipCache) {
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const cacheKey = options.keyGenerator 
        ? options.keyGenerator(...args)
        : `${propertyKey}:${JSON.stringify(args)}`;

      try {
        // Try to get from cache first
        const cached = await cache.get<R>(cacheKey, { 
          namespace: options.namespace 
        });

        if (cached !== null) {
          console.log(`Cache hit for key: ${cacheKey}`);
          return cached;
        }

        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Store in cache
        await cache.set(cacheKey, result, {
          ttl: options.ttl || CacheTTL.MEDIUM,
          namespace: options.namespace
        });

        console.log(`Cache miss, stored result for key: ${cacheKey}`);
        return result;

      } catch (error) {
        console.error('Cache middleware error:', error);
        // Fallback to original method on cache failure
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

export class CachedService {
  protected cache = cache;

  protected async cacheGet<T>(key: string, namespace?: string): Promise<T | null> {
    if (!config.features.caching) return null;
    return this.cache.get<T>(key, { namespace });
  }

  protected async cacheSet(
    key: string, 
    value: any, 
    ttl: number = CacheTTL.MEDIUM, 
    namespace?: string
  ): Promise<boolean> {
    if (!config.features.caching) return false;
    return this.cache.set(key, value, { ttl, namespace });
  }

  protected async cacheDel(key: string, namespace?: string): Promise<boolean> {
    if (!config.features.caching) return false;
    return this.cache.del(key, { namespace });
  }

  protected async cacheExists(key: string, namespace?: string): Promise<boolean> {
    if (!config.features.caching) return false;
    return this.cache.exists(key, { namespace });
  }

  protected async invalidatePattern(pattern: string): Promise<boolean> {
    if (!config.features.caching) return false;
    return this.cache.flush(pattern);
  }
}

// Rate limiting with cache
export class RateLimiter {
  constructor(
    private windowMs: number = config.rateLimit.windowMs,
    private maxRequests: number = config.rateLimit.maxRequests
  ) {}

  async checkRateLimit(
    identifier: string,
    endpoint?: string
  ): Promise<{ 
    allowed: boolean; 
    remaining: number; 
    resetTime: number; 
    retryAfter?: number;
  }> {
    if (!config.features.caching) {
      // If caching is disabled, allow all requests
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetTime: Date.now() + this.windowMs,
      };
    }

    const key = endpoint 
      ? CacheKeys.rateLimit(identifier, endpoint)
      : `rate_limit:${identifier}`;

    try {
      const current = await cache.increment(key, 1, {
        ttl: Math.ceil(this.windowMs / 1000),
        namespace: 'rate_limit'
      });

      if (current === null) {
        // Cache error, allow the request
        return {
          allowed: true,
          remaining: this.maxRequests,
          resetTime: Date.now() + this.windowMs,
        };
      }

      const remaining = Math.max(0, this.maxRequests - current);
      const resetTime = Date.now() + this.windowMs;

      if (current > this.maxRequests) {
        const ttl = await cache.ttl(key, { namespace: 'rate_limit' });
        const retryAfter = ttl > 0 ? ttl : Math.ceil(this.windowMs / 1000);

        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter,
        };
      }

      return {
        allowed: true,
        remaining,
        resetTime,
      };

    } catch (error) {
      console.error('Rate limiting error:', error);
      // On error, allow the request
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetTime: Date.now() + this.windowMs,
      };
    }
  }

  async resetRateLimit(identifier: string, endpoint?: string): Promise<boolean> {
    const key = endpoint 
      ? CacheKeys.rateLimit(identifier, endpoint)
      : `rate_limit:${identifier}`;

    return cache.del(key, { namespace: 'rate_limit' });
  }
}

// Session management with cache
export class SessionManager {
  async createSession(
    sessionId: string,
    data: any,
    ttl: number = CacheTTL.USER_SESSION
  ): Promise<boolean> {
    return cache.set(
      CacheKeys.SESSION,
      data,
      { ttl, namespace: `session:${sessionId}` }
    );
  }

  async getSession<T = any>(sessionId: string): Promise<T | null> {
    return cache.get<T>(
      CacheKeys.SESSION,
      { namespace: `session:${sessionId}` }
    );
  }

  async updateSession(
    sessionId: string,
    data: any,
    ttl?: number
  ): Promise<boolean> {
    if (ttl) {
      return cache.set(
        CacheKeys.SESSION,
        data,
        { ttl, namespace: `session:${sessionId}` }
      );
    }

    // Update without changing TTL
    const exists = await cache.exists(
      CacheKeys.SESSION,
      { namespace: `session:${sessionId}` }
    );

    if (!exists) return false;

    return cache.set(
      CacheKeys.SESSION,
      data,
      { namespace: `session:${sessionId}` }
    );
  }

  async destroySession(sessionId: string): Promise<boolean> {
    return cache.del(
      CacheKeys.SESSION,
      { namespace: `session:${sessionId}` }
    );
  }

  async refreshSession(sessionId: string, ttl: number = CacheTTL.USER_SESSION): Promise<boolean> {
    return cache.expire(
      CacheKeys.SESSION,
      ttl,
      { namespace: `session:${sessionId}` }
    );
  }
}

// Export instances
export const rateLimiter = new RateLimiter();
export const sessionManager = new SessionManager();

// Cache warming utilities
export class CacheWarmer {
  static async warmUserCache(userId: string, userData: any): Promise<void> {
    await cache.set(
      CacheKeys.user(userId),
      userData,
      { ttl: CacheTTL.LONG }
    );
  }

  static async warmTemplateCache(templates: any[]): Promise<void> {
    // Cache template list
    await cache.set(
      CacheKeys.templates(),
      templates,
      { ttl: CacheTTL.VERY_LONG }
    );

    // Cache individual templates
    const templatePromises = templates.map(template =>
      cache.set(
        CacheKeys.template(template.id),
        template,
        { ttl: CacheTTL.VERY_LONG }
      )
    );

    await Promise.all(templatePromises);
  }

  static async warmJobCache(jobId: string, jobData: any): Promise<void> {
    await cache.set(
      CacheKeys.resumeJob(jobId),
      jobData,
      { ttl: CacheTTL.MEDIUM }
    );
  }
}

// Cache invalidation utilities
export class CacheInvalidator {
  static async invalidateUser(userId: string): Promise<void> {
    await Promise.all([
      cache.del(CacheKeys.user(userId)),
      cache.flush(`${CacheKeys.USER}:${userId}:*`),
    ]);
  }

  static async invalidateUserByEmail(email: string): Promise<void> {
    await cache.del(CacheKeys.userByEmail(email));
  }

  static async invalidateResume(resumeId: string): Promise<void> {
    await Promise.all([
      cache.del(CacheKeys.resume(resumeId)),
      cache.flush(`${CacheKeys.RESUME}:${resumeId}:*`),
    ]);
  }

  static async invalidateTemplates(): Promise<void> {
    await Promise.all([
      cache.del(CacheKeys.templates()),
      cache.flush(`${CacheKeys.TEMPLATE}:*`),
    ]);
  }

  static async invalidateJob(jobId: string): Promise<void> {
    await cache.del(CacheKeys.resumeJob(jobId));
  }
}