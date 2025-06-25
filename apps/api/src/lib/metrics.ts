import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';

export interface MetricData {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface HealthMetric {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency?: number;
  errorRate?: number;
  timestamp: number;
}

class MetricsCollector extends EventEmitter {
  private metrics: Map<string, MetricData[]> = new Map();
  private performanceMetrics: PerformanceMetric[] = [];
  private healthMetrics: Map<string, HealthMetric> = new Map();
  private maxMetricsHistory = 1000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startCleanupProcess();
  }

  // Counter metrics (values that only increase)
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    const existing = this.getLatestMetric(name);
    const newValue = existing ? existing.value + value : value;
    
    this.addMetric({
      name,
      value: newValue,
      timestamp: Date.now(),
      labels,
      type: 'counter',
    });
  }

  // Gauge metrics (values that can go up or down)
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.addMetric({
      name,
      value,
      timestamp: Date.now(),
      labels,
      type: 'gauge',
    });
  }

  // Histogram metrics (for timing data)
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.addMetric({
      name,
      value,
      timestamp: Date.now(),
      labels,
      type: 'histogram',
    });
  }

  // Performance timing decorator
  async measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    const startTimestamp = Date.now();
    let success = true;
    let result: T;

    try {
      result = await fn();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = performance.now() - startTime;
      
      const perfMetric: PerformanceMetric = {
        operation,
        duration,
        timestamp: startTimestamp,
        success,
        metadata,
      };

      this.performanceMetrics.push(perfMetric);
      this.trimArray(this.performanceMetrics, this.maxMetricsHistory);

      // Also record as histogram
      this.recordHistogram(`operation_duration_ms`, duration, {
        operation,
        success: success.toString(),
      });

      // Emit event for real-time monitoring
      this.emit('performance', perfMetric);
    }
  }

  // Health check recording
  recordHealthCheck(service: string, status: HealthMetric['status'], latency?: number, errorRate?: number): void {
    const healthMetric: HealthMetric = {
      service,
      status,
      latency,
      errorRate,
      timestamp: Date.now(),
    };

    this.healthMetrics.set(service, healthMetric);
    this.emit('health', healthMetric);
  }

  // Get current metrics
  getMetrics(name?: string): MetricData[] {
    if (name) {
      return this.metrics.get(name) || [];
    }
    
    const allMetrics: MetricData[] = [];
    for (const metricArray of this.metrics.values()) {
      allMetrics.push(...metricArray);
    }
    
    return allMetrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Get performance metrics
  getPerformanceMetrics(operation?: string): PerformanceMetric[] {
    if (operation) {
      return this.performanceMetrics.filter(m => m.operation === operation);
    }
    return [...this.performanceMetrics].sort((a, b) => b.timestamp - a.timestamp);
  }

  // Get health status
  getHealthStatus(): Map<string, HealthMetric> {
    return new Map(this.healthMetrics);
  }

  // Get aggregated statistics
  getStatistics(metricName: string, timeWindow: number = 300000): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const cutoff = Date.now() - timeWindow;
    const metrics = this.getMetrics(metricName)
      .filter(m => m.timestamp > cutoff)
      .map(m => m.value)
      .sort((a, b) => a - b);

    if (metrics.length === 0) {
      return {
        count: 0,
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const sum = metrics.reduce((acc, val) => acc + val, 0);
    const avg = sum / metrics.length;
    const min = metrics[0];
    const max = metrics[metrics.length - 1];

    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * metrics.length) - 1;
      return metrics[Math.max(0, index)];
    };

    return {
      count: metrics.length,
      avg,
      min,
      max,
      p50: getPercentile(50),
      p95: getPercentile(95),
      p99: getPercentile(99),
    };
  }

  // Get performance statistics
  getPerformanceStatistics(operation?: string, timeWindow: number = 300000): {
    count: number;
    successRate: number;
    avgDuration: number;
    p95Duration: number;
    errorCount: number;
  } {
    const cutoff = Date.now() - timeWindow;
    let metrics = this.performanceMetrics.filter(m => m.timestamp > cutoff);
    
    if (operation) {
      metrics = metrics.filter(m => m.operation === operation);
    }

    if (metrics.length === 0) {
      return {
        count: 0,
        successRate: 0,
        avgDuration: 0,
        p95Duration: 0,
        errorCount: 0,
      };
    }

    const successCount = metrics.filter(m => m.success).length;
    const errorCount = metrics.length - successCount;
    const successRate = successCount / metrics.length;
    
    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const avgDuration = durations.reduce((acc, val) => acc + val, 0) / durations.length;
    const p95Index = Math.ceil(0.95 * durations.length) - 1;
    const p95Duration = durations[Math.max(0, p95Index)];

    return {
      count: metrics.length,
      successRate,
      avgDuration,
      p95Duration,
      errorCount,
    };
  }

  // Export metrics in Prometheus format
  exportPrometheusMetrics(): string {
    const lines: string[] = [];
    
    // Add performance metrics
    const perfStats = this.getPerformanceStatistics();
    lines.push(`# HELP api_requests_total Total number of API requests`);
    lines.push(`# TYPE api_requests_total counter`);
    lines.push(`api_requests_total ${perfStats.count}`);
    
    lines.push(`# HELP api_request_duration_seconds API request duration in seconds`);
    lines.push(`# TYPE api_request_duration_seconds histogram`);
    lines.push(`api_request_duration_seconds_sum ${perfStats.avgDuration * perfStats.count / 1000}`);
    lines.push(`api_request_duration_seconds_count ${perfStats.count}`);
    
    lines.push(`# HELP api_success_rate API success rate`);
    lines.push(`# TYPE api_success_rate gauge`);
    lines.push(`api_success_rate ${perfStats.successRate}`);

    // Add custom metrics
    const currentTime = Date.now();
    const recentMetrics = this.getMetrics().filter(m => currentTime - m.timestamp < 60000); // Last minute
    
    for (const metric of recentMetrics) {
      const labels = metric.labels ? 
        Object.entries(metric.labels).map(([k, v]) => `${k}="${v}"`).join(',') : '';
      const labelString = labels ? `{${labels}}` : '';
      
      lines.push(`# HELP ${metric.name} Custom metric`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);
      lines.push(`${metric.name}${labelString} ${metric.value}`);
    }

    return lines.join('\n');
  }

  // Clear old metrics
  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      
      // Clean metrics
      for (const [name, metricArray] of this.metrics.entries()) {
        const filtered = metricArray.filter(m => m.timestamp > cutoff);
        if (filtered.length === 0) {
          this.metrics.delete(name);
        } else {
          this.metrics.set(name, filtered);
        }
      }

      // Clean performance metrics
      this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp > cutoff);

      // Clean health metrics (keep latest)
      for (const [service, metric] of this.healthMetrics.entries()) {
        if (metric.timestamp < cutoff) {
          this.healthMetrics.delete(service);
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private addMetric(metric: MetricData): void {
    const existing = this.metrics.get(metric.name) || [];
    existing.push(metric);
    this.trimArray(existing, this.maxMetricsHistory);
    this.metrics.set(metric.name, existing);
    
    this.emit('metric', metric);
  }

  private getLatestMetric(name: string): MetricData | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) return null;
    return metrics[metrics.length - 1];
  }

  private trimArray<T>(array: T[], maxLength: number): void {
    if (array.length > maxLength) {
      array.splice(0, array.length - maxLength);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.removeAllListeners();
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();

// Built-in metric names
export const MetricNames = {
  HTTP_REQUESTS: 'http_requests_total',
  HTTP_DURATION: 'http_request_duration_ms',
  DATABASE_QUERIES: 'database_queries_total',
  DATABASE_DURATION: 'database_query_duration_ms',
  CACHE_HITS: 'cache_hits_total',
  CACHE_MISSES: 'cache_misses_total',
  REDIS_OPERATIONS: 'redis_operations_total',
  PDF_GENERATIONS: 'pdf_generations_total',
  EMAIL_SENT: 'emails_sent_total',
  FILE_UPLOADS: 'file_uploads_total',
  FRAUD_CHECKS: 'fraud_checks_total',
  PAYMENT_TRANSACTIONS: 'payment_transactions_total',
  ACTIVE_CONNECTIONS: 'active_connections',
  MEMORY_USAGE: 'memory_usage_bytes',
  CPU_USAGE: 'cpu_usage_percent',
} as const;

// Helper decorators and utilities
export function measureDuration(metricName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return metricsCollector.measurePerformance(
        `${target.constructor.name}.${propertyKey}`,
        () => originalMethod.apply(this, args),
        { metricName, class: target.constructor.name, method: propertyKey }
      );
    };

    return descriptor;
  };
}

export function countCalls(metricName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      metricsCollector.incrementCounter(metricName, 1, {
        class: target.constructor.name,
        method: propertyKey,
      });
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}