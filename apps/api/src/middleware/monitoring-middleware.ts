import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { metricsCollector, MetricNames } from '../lib/metrics';
import { cache } from '../lib/cache';
import { prisma } from '../lib/prisma';
import os from 'os';

export interface RequestMetrics {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

// HTTP request monitoring middleware
export function httpMetricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = performance.now();
    const startTimestamp = Date.now();

    // Override res.end to capture metrics
    const originalEnd = res.end;
    res.end = function (chunk?: any, encoding?: any) {
      const duration = performance.now() - startTime;
      
      const metrics: RequestMetrics = {
        method: req.method,
        path: req.route?.path || req.path,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        userId: (req as any).user?.id,
      };

      // Record metrics
      metricsCollector.incrementCounter(MetricNames.HTTP_REQUESTS, 1, {
        method: req.method,
        path: metrics.path,
        status: res.statusCode.toString(),
      });

      metricsCollector.recordHistogram(MetricNames.HTTP_DURATION, duration, {
        method: req.method,
        path: metrics.path,
      });

      // Log slow requests
      if (duration > 5000) { // 5 seconds
        console.warn(`Slow request detected: ${req.method} ${req.path} - ${duration}ms`);
      }

      // Log errors
      if (res.statusCode >= 400) {
        console.error(`HTTP Error: ${req.method} ${req.path} - ${res.statusCode}`);
        metricsCollector.incrementCounter('http_errors_total', 1, {
          method: req.method,
          path: metrics.path,
          status: res.statusCode.toString(),
        });
      }

      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

// Database monitoring
export class DatabaseMonitor {
  private static instance: DatabaseMonitor;
  
  static getInstance(): DatabaseMonitor {
    if (!DatabaseMonitor.instance) {
      DatabaseMonitor.instance = new DatabaseMonitor();
    }
    return DatabaseMonitor.instance;
  }

  async measureQuery<T>(
    operation: string,
    query: () => Promise<T>
  ): Promise<T> {
    return metricsCollector.measurePerformance(
      `database.${operation}`,
      async () => {
        metricsCollector.incrementCounter(MetricNames.DATABASE_QUERIES, 1, {
          operation,
        });
        
        const result = await query();
        return result;
      }
    );
  }

  async checkHealth(): Promise<boolean> {
    try {
      const startTime = performance.now();
      await prisma.$queryRaw`SELECT 1`;
      const duration = performance.now() - startTime;

      metricsCollector.recordHealthCheck('database', 'healthy', duration);
      return true;
    } catch (error) {
      metricsCollector.recordHealthCheck('database', 'unhealthy');
      console.error('Database health check failed:', error);
      return false;
    }
  }

  async getConnectionInfo(): Promise<{
    activeConnections: number;
    poolSize: number;
  }> {
    try {
      // This would require custom Prisma metrics in a real implementation
      // For now, return mock data
      const activeConnections = 5;
      const poolSize = 10;

      metricsCollector.setGauge(MetricNames.ACTIVE_CONNECTIONS, activeConnections);

      return { activeConnections, poolSize };
    } catch (error) {
      console.error('Failed to get database connection info:', error);
      return { activeConnections: 0, poolSize: 0 };
    }
  }
}

// Cache monitoring
export class CacheMonitor {
  private static instance: CacheMonitor;
  
  static getInstance(): CacheMonitor {
    if (!CacheMonitor.instance) {
      CacheMonitor.instance = new CacheMonitor();
    }
    return CacheMonitor.instance;
  }

  recordCacheHit(key: string, operation: string): void {
    metricsCollector.incrementCounter(MetricNames.CACHE_HITS, 1, {
      operation,
      key: this.sanitizeKey(key),
    });
  }

  recordCacheMiss(key: string, operation: string): void {
    metricsCollector.incrementCounter(MetricNames.CACHE_MISSES, 1, {
      operation,
      key: this.sanitizeKey(key),
    });
  }

  recordRedisOperation(operation: string, duration: number, success: boolean): void {
    metricsCollector.incrementCounter(MetricNames.REDIS_OPERATIONS, 1, {
      operation,
      success: success.toString(),
    });

    metricsCollector.recordHistogram('redis_operation_duration_ms', duration, {
      operation,
    });
  }

  async checkCacheHealth(): Promise<boolean> {
    try {
      const health = await cache.getHealth();
      
      if (health.connected && health.latency !== undefined) {
        metricsCollector.recordHealthCheck('redis', 'healthy', health.latency);
        return true;
      } else {
        metricsCollector.recordHealthCheck('redis', 'unhealthy');
        return false;
      }
    } catch (error) {
      metricsCollector.recordHealthCheck('redis', 'unhealthy');
      console.error('Cache health check failed:', error);
      return false;
    }
  }

  private sanitizeKey(key: string): string {
    // Remove user-specific IDs for privacy
    return key.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID');
  }
}

// System monitoring
export class SystemMonitor {
  private static instance: SystemMonitor;
  
  static getInstance(): SystemMonitor {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = new SystemMonitor();
      SystemMonitor.instance.startSystemMetrics();
    }
    return SystemMonitor.instance;
  }

  private startSystemMetrics(): void {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Initial collection
    this.collectSystemMetrics();
  }

  private collectSystemMetrics(): void {
    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      metricsCollector.setGauge(MetricNames.MEMORY_USAGE, memUsage.heapUsed);
      metricsCollector.setGauge('memory_rss_bytes', memUsage.rss);
      metricsCollector.setGauge('memory_external_bytes', memUsage.external);

      // CPU usage (approximation)
      const cpuUsage = process.cpuUsage();
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
      metricsCollector.setGauge(MetricNames.CPU_USAGE, cpuPercent);

      // System info
      metricsCollector.setGauge('system_load_average', os.loadavg()[0]);
      metricsCollector.setGauge('system_free_memory_bytes', os.freemem());
      metricsCollector.setGauge('system_total_memory_bytes', os.totalmem());

      // Node.js specific
      metricsCollector.setGauge('nodejs_event_loop_lag_ms', this.measureEventLoopLag());
      metricsCollector.setGauge('nodejs_uptime_seconds', process.uptime());

    } catch (error) {
      console.error('Failed to collect system metrics:', error);
    }
  }

  private measureEventLoopLag(): number {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
      return lag;
    });
    return 0; // Placeholder - real implementation would use async timing
  }

  getSystemHealth(): {
    memory: { used: number; free: number; percentage: number };
    cpu: { usage: number };
    uptime: number;
  } {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      memory: {
        used: usedMem,
        free: freeMem,
        percentage: (usedMem / totalMem) * 100,
      },
      cpu: {
        usage: os.loadavg()[0],
      },
      uptime: process.uptime(),
    };
  }
}

// Application-specific monitoring
export class ApplicationMonitor {
  private static instance: ApplicationMonitor;
  
  static getInstance(): ApplicationMonitor {
    if (!ApplicationMonitor.instance) {
      ApplicationMonitor.instance = new ApplicationMonitor();
    }
    return ApplicationMonitor.instance;
  }

  recordPdfGeneration(templateId: string, duration: number, success: boolean): void {
    metricsCollector.incrementCounter(MetricNames.PDF_GENERATIONS, 1, {
      template: templateId,
      success: success.toString(),
    });

    metricsCollector.recordHistogram('pdf_generation_duration_ms', duration, {
      template: templateId,
    });
  }

  recordEmailSent(type: string, success: boolean): void {
    metricsCollector.incrementCounter(MetricNames.EMAIL_SENT, 1, {
      type,
      success: success.toString(),
    });
  }

  recordFileUpload(fileType: string, size: number, success: boolean): void {
    metricsCollector.incrementCounter(MetricNames.FILE_UPLOADS, 1, {
      type: fileType,
      success: success.toString(),
    });

    metricsCollector.recordHistogram('file_upload_size_bytes', size, {
      type: fileType,
    });
  }

  recordFraudCheck(result: string, duration: number): void {
    metricsCollector.incrementCounter(MetricNames.FRAUD_CHECKS, 1, {
      result,
    });

    metricsCollector.recordHistogram('fraud_check_duration_ms', duration);
  }

  recordPaymentTransaction(type: string, amount: number, success: boolean): void {
    metricsCollector.incrementCounter(MetricNames.PAYMENT_TRANSACTIONS, 1, {
      type,
      success: success.toString(),
    });

    if (success) {
      metricsCollector.recordHistogram('payment_amount_cents', amount, {
        type,
      });
    }
  }
}

// Error monitoring
export class ErrorMonitor {
  private static instance: ErrorMonitor;
  
  static getInstance(): ErrorMonitor {
    if (!ErrorMonitor.instance) {
      ErrorMonitor.instance = new ErrorMonitor();
    }
    return ErrorMonitor.instance;
  }

  recordError(error: Error, context?: Record<string, any>): void {
    metricsCollector.incrementCounter('application_errors_total', 1, {
      type: error.constructor.name,
      message: error.message,
    });

    console.error('Application error:', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  recordHttpError(statusCode: number, path: string, method: string): void {
    metricsCollector.incrementCounter('http_errors_total', 1, {
      status: statusCode.toString(),
      path,
      method,
    });
  }

  recordDatabaseError(operation: string, error: Error): void {
    metricsCollector.incrementCounter('database_errors_total', 1, {
      operation,
      type: error.constructor.name,
    });
  }

  recordCacheError(operation: string, error: Error): void {
    metricsCollector.incrementCounter('cache_errors_total', 1, {
      operation,
      type: error.constructor.name,
    });
  }
}

// Export singleton instances
export const databaseMonitor = DatabaseMonitor.getInstance();
export const cacheMonitor = CacheMonitor.getInstance();
export const systemMonitor = SystemMonitor.getInstance();
export const applicationMonitor = ApplicationMonitor.getInstance();
export const errorMonitor = ErrorMonitor.getInstance();