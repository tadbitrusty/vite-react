/**
 * Performance Optimization and Monitoring for ResumeSniper
 * Caching, monitoring, and optimization utilities
 */

import { Logger } from './errorHandler';

const logger = Logger.getInstance();

// Template caching system
export class TemplateCache {
  private static cache = new Map<string, { content: string; timestamp: number }>();
  private static readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  
  static get(templateId: string): string | null {
    const cached = this.cache.get(templateId);
    
    if (!cached) {
      return null;
    }
    
    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(templateId);
      return null;
    }
    
    logger.info('Template cache hit', { templateId });
    return cached.content;
  }
  
  static set(templateId: string, content: string): void {
    this.cache.set(templateId, {
      content,
      timestamp: Date.now()
    });
    
    logger.info('Template cached', { templateId, size: content.length });
  }
  
  static clear(): void {
    this.cache.clear();
    logger.info('Template cache cleared');
  }
  
  static getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Response caching for static content
export class ResponseCache {
  private static cache = new Map<string, { 
    data: any; 
    timestamp: number; 
    etag: string;
  }>();
  
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  static generateETag(data: any): string {
    return `"${Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 16)}"`;
  }
  
  static get(key: string): { data: any; etag: string } | null {
    const cached = this.cache.get(key);
    
    if (!cached || Date.now() - cached.timestamp > this.CACHE_TTL) {
      if (cached) {
        this.cache.delete(key);
      }
      return null;
    }
    
    return { data: cached.data, etag: cached.etag };
  }
  
  static set(key: string, data: any): string {
    const etag = this.generateETag(data);
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      etag
    });
    
    return etag;
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static metrics = new Map<string, {
    totalRequests: number;
    totalTime: number;
    minTime: number;
    maxTime: number;
    errors: number;
    lastUpdated: number;
  }>();
  
  static recordRequest(endpoint: string, duration: number, success: boolean): void {
    const existing = this.metrics.get(endpoint) || {
      totalRequests: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      errors: 0,
      lastUpdated: Date.now()
    };
    
    existing.totalRequests++;
    existing.totalTime += duration;
    existing.minTime = Math.min(existing.minTime, duration);
    existing.maxTime = Math.max(existing.maxTime, duration);
    existing.lastUpdated = Date.now();
    
    if (!success) {
      existing.errors++;
    }
    
    this.metrics.set(endpoint, existing);
    
    // Log slow requests
    if (duration > 30000) { // 30 seconds
      logger.warn('Slow request detected', {
        endpoint,
        duration,
        success
      });
    }
  }
  
  static getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    this.metrics.forEach((metrics, endpoint) => {
      const avgTime = metrics.totalRequests > 0 ? 
        Math.round(metrics.totalTime / metrics.totalRequests) : 0;
      
      const errorRate = metrics.totalRequests > 0 ? 
        Math.round((metrics.errors / metrics.totalRequests) * 100) : 0;
      
      result[endpoint] = {
        totalRequests: metrics.totalRequests,
        averageTime: avgTime,
        minTime: metrics.minTime === Infinity ? 0 : metrics.minTime,
        maxTime: metrics.maxTime,
        errorRate: `${errorRate}%`,
        lastUpdated: new Date(metrics.lastUpdated).toISOString()
      };
    });
    
    return result;
  }
  
  static reset(): void {
    this.metrics.clear();
    logger.info('Performance metrics reset');
  }
}

// Memory usage monitoring
export class MemoryMonitor {
  private static readonly MAX_HEAP_USAGE = 1024 * 1024 * 1024; // 1GB
  private static readonly WARNING_THRESHOLD = 0.8; // 80%
  
  static checkMemoryUsage(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    warningLevel: 'normal' | 'warning' | 'critical';
  } {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const externalMB = Math.round(usage.external / 1024 / 1024);
    const rssMB = Math.round(usage.rss / 1024 / 1024);
    
    let warningLevel: 'normal' | 'warning' | 'critical' = 'normal';
    
    const heapUsageRatio = usage.heapUsed / this.MAX_HEAP_USAGE;
    
    if (heapUsageRatio > this.WARNING_THRESHOLD) {
      warningLevel = heapUsageRatio > 0.95 ? 'critical' : 'warning';
      
      logger.warn('High memory usage detected', {
        heapUsedMB,
        heapTotalMB,
        usageRatio: Math.round(heapUsageRatio * 100)
      });
    }
    
    return {
      heapUsed: heapUsedMB,
      heapTotal: heapTotalMB,
      external: externalMB,
      rss: rssMB,
      warningLevel
    };
  }
  
  static forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      logger.info('Forced garbage collection executed');
    } else {
      logger.warn('Garbage collection not available (start with --expose-gc)');
    }
  }
}

// Request optimization utilities
export class RequestOptimizer {
  // Compress response data
  static compressResponse(data: any): string {
    return JSON.stringify(data, null, 0); // Remove whitespace
  }
  
  // Batch similar operations
  static createBatcher<T, R>(
    batchFn: (items: T[]) => Promise<R[]>,
    maxBatchSize: number = 10,
    maxWaitTime: number = 100
  ) {
    let batch: T[] = [];
    let resolvers: Array<(value: R) => void> = [];
    let rejecters: Array<(error: any) => void> = [];
    let timer: NodeJS.Timeout | null = null;
    
    const flush = async () => {
      if (batch.length === 0) return;
      
      const currentBatch = batch;
      const currentResolvers = resolvers;
      const currentRejecters = rejecters;
      
      // Reset for next batch
      batch = [];
      resolvers = [];
      rejecters = [];
      
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      
      try {
        const results = await batchFn(currentBatch);
        results.forEach((result, index) => {
          currentResolvers[index](result);
        });
      } catch (error) {
        currentRejecters.forEach(reject => reject(error));
      }
    };
    
    return (item: T): Promise<R> => {
      return new Promise<R>((resolve, reject) => {
        batch.push(item);
        resolvers.push(resolve);
        rejecters.push(reject);
        
        if (batch.length >= maxBatchSize) {
          flush();
        } else if (!timer) {
          timer = setTimeout(flush, maxWaitTime);
        }
      });
    };
  }
  
  // Timeout wrapper for external API calls
  static withTimeout<T>(
    promise: Promise<T>, 
    timeoutMs: number,
    errorMessage: string = 'Operation timed out'
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
      })
    ]);
  }
  
  // Retry mechanism with exponential backoff
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          break;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        logger.warn(`Retry attempt ${attempt} failed, retrying in ${delay}ms`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          attempt,
          maxAttempts
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}

// Health check utilities
export class HealthChecker {
  static async checkDatabaseHealth(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number }> {
    const startTime = Date.now();
    
    try {
      // Import here to avoid circular dependencies
      const { supabase } = await import('./database');
      
      const { error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error) {
        logger.error('Database health check failed', error);
        return { status: 'unhealthy' };
      }
      
      const latency = Date.now() - startTime;
      return { status: 'healthy', latency };
      
    } catch (error) {
      logger.error('Database health check error', error);
      return { status: 'unhealthy' };
    }
  }
  
  static async checkExternalServices(): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    // Check Anthropic API
    try {
      results.anthropic = { 
        status: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing_key',
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      results.anthropic = { status: 'error', error: (error as Error).message };
    }
    
    // Check Stripe API
    try {
      results.stripe = { 
        status: process.env.STRIPE_SECRET_KEY ? 'configured' : 'missing_key',
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      results.stripe = { status: 'error', error: (error as Error).message };
    }
    
    // Check Resend API
    try {
      results.resend = { 
        status: process.env.RESEND_API_KEY ? 'configured' : 'missing_key',
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      results.resend = { status: 'error', error: (error as Error).message };
    }
    
    return results;
  }
  
  static getSystemHealth(): {
    uptime: number;
    memory: ReturnType<typeof MemoryMonitor.checkMemoryUsage>;
    performance: Record<string, any>;
    cache: { templates: any };
  } {
    return {
      uptime: Math.round(process.uptime()),
      memory: MemoryMonitor.checkMemoryUsage(),
      performance: PerformanceMonitor.getMetrics(),
      cache: {
        templates: TemplateCache.getStats()
      }
    };
  }
}