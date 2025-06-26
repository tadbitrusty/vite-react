import { z } from 'zod';
import { publicProcedure, router } from '../lib/trpc';
import { metricsCollector } from '../lib/metrics';
import { 
  databaseMonitor, 
  cacheMonitor, 
  systemMonitor, 
  applicationMonitor 
} from '../middleware/monitoring-middleware';
import { TRPCError } from '@trpc/server';

export const metricsRouter = router({
  // Health check endpoint
  health: publicProcedure
    .query(async () => {
      try {
        const [dbHealth, cacheHealth] = await Promise.all([
          databaseMonitor.checkHealth(),
          cacheMonitor.checkCacheHealth(),
        ]);

        const systemHealth = systemMonitor.getSystemHealth();
        const healthMetrics = metricsCollector.getHealthStatus();

        return {
          status: 'ok',
          timestamp: new Date().toISOString(),
          services: {
            database: {
              healthy: dbHealth,
              status: dbHealth ? 'healthy' : 'unhealthy',
            },
            cache: {
              healthy: cacheHealth,
              status: cacheHealth ? 'healthy' : 'unhealthy',
            },
            system: {
              healthy: systemHealth.memory.percentage < 90, // Alert if memory > 90%
              memoryUsage: systemHealth.memory.percentage,
              cpuLoad: systemHealth.cpu.usage,
              uptime: systemHealth.uptime,
            },
          },
          healthChecks: Object.fromEntries(healthMetrics),
          overall: dbHealth && cacheHealth ? 'healthy' : 'degraded',
        };
      } catch (error) {
        console.error('Health check error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Health check failed',
        });
      }
    }),

  // Get performance metrics
  performance: publicProcedure
    .input(z.object({
      operation: z.string().optional(),
      timeWindow: z.number().default(300000), // 5 minutes
    }))
    .query(async ({ input }) => {
      try {
        const stats = metricsCollector.getPerformanceStatistics(
          input.operation,
          input.timeWindow
        );

        const recentMetrics = metricsCollector.getPerformanceMetrics(input.operation)
          .filter(m => Date.now() - m.timestamp < input.timeWindow)
          .slice(0, 100); // Limit to 100 recent metrics

        return {
          statistics: stats,
          recentMetrics,
          timeWindow: input.timeWindow,
        };
      } catch (error) {
        console.error('Performance metrics error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get performance metrics',
        });
      }
    }),

  // Get system metrics
  system: publicProcedure
    .query(async () => {
      try {
        const systemHealth = systemMonitor.getSystemHealth();
        const dbInfo = await databaseMonitor.getConnectionInfo();

        return {
          memory: systemHealth.memory,
          cpu: systemHealth.cpu,
          uptime: systemHealth.uptime,
          database: dbInfo,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('System metrics error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get system metrics',
        });
      }
    }),

  // Get application metrics
  application: publicProcedure
    .input(z.object({
      timeWindow: z.number().default(300000), // 5 minutes
    }))
    .query(async ({ input }) => {
      try {
        const httpStats = metricsCollector.getStatistics('http_requests_total', input.timeWindow);
        const dbStats = metricsCollector.getStatistics('database_queries_total', input.timeWindow);
        const cacheHits = metricsCollector.getStatistics('cache_hits_total', input.timeWindow);
        const cacheMisses = metricsCollector.getStatistics('cache_misses_total', input.timeWindow);
        
        const cacheHitRate = cacheHits.count + cacheMisses.count > 0 
          ? cacheHits.count / (cacheHits.count + cacheMisses.count) 
          : 0;

        return {
          http: {
            totalRequests: httpStats.count,
            averageResponseTime: httpStats.avg,
            p95ResponseTime: httpStats.p95,
          },
          database: {
            totalQueries: dbStats.count,
            averageQueryTime: dbStats.avg,
            p95QueryTime: dbStats.p95,
          },
          cache: {
            hitRate: cacheHitRate,
            totalHits: cacheHits.count,
            totalMisses: cacheMisses.count,
          },
          timeWindow: input.timeWindow,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Application metrics error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get application metrics',
        });
      }
    }),

  // Get error metrics
  errors: publicProcedure
    .input(z.object({
      timeWindow: z.number().default(300000), // 5 minutes
    }))
    .query(async ({ input }) => {
      try {
        const httpErrors = metricsCollector.getStatistics('http_errors_total', input.timeWindow);
        const appErrors = metricsCollector.getStatistics('application_errors_total', input.timeWindow);
        const dbErrors = metricsCollector.getStatistics('database_errors_total', input.timeWindow);
        const cacheErrors = metricsCollector.getStatistics('cache_errors_total', input.timeWindow);

        return {
          http: {
            count: httpErrors.count,
            rate: httpErrors.avg,
          },
          application: {
            count: appErrors.count,
            rate: appErrors.avg,
          },
          database: {
            count: dbErrors.count,
            rate: dbErrors.avg,
          },
          cache: {
            count: cacheErrors.count,
            rate: cacheErrors.avg,
          },
          timeWindow: input.timeWindow,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Error metrics error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get error metrics',
        });
      }
    }),

  // Export Prometheus metrics
  prometheus: publicProcedure
    .query(async () => {
      try {
        const prometheusMetrics = metricsCollector.exportPrometheusMetrics();
        return {
          metrics: prometheusMetrics,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Prometheus export error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to export Prometheus metrics',
        });
      }
    }),

  // Get specific metric statistics
  metric: publicProcedure
    .input(z.object({
      name: z.string(),
      timeWindow: z.number().default(300000), // 5 minutes
    }))
    .query(async ({ input }) => {
      try {
        const stats = metricsCollector.getStatistics(input.name, input.timeWindow);
        const recentValues = metricsCollector.getMetrics(input.name)
          .filter(m => Date.now() - m.timestamp < input.timeWindow)
          .slice(0, 100)
          .map(m => ({
            value: m.value,
            timestamp: m.timestamp,
            labels: m.labels,
          }));

        return {
          name: input.name,
          statistics: stats,
          recentValues,
          timeWindow: input.timeWindow,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Metric statistics error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get metric statistics',
        });
      }
    }),

  // List all available metrics
  list: publicProcedure
    .query(async () => {
      try {
        const allMetrics = metricsCollector.getMetrics();
        const metricNames = [...new Set(allMetrics.map(m => m.name))].sort();
        const performanceOperations = [...new Set(
          metricsCollector.getPerformanceMetrics().map(m => m.operation)
        )].sort();

        return {
          metricNames,
          performanceOperations,
          totalMetrics: allMetrics.length,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('List metrics error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list metrics',
        });
      }
    }),

  // Get real-time dashboard data
  dashboard: publicProcedure
    .query(async () => {
      try {
        const timeWindow = 300000; // 5 minutes
        
        const [
          httpStats,
          perfStats,
          systemHealth,
          dbInfo,
          errorStats
        ] = await Promise.all([
          metricsCollector.getStatistics('http_requests_total', timeWindow),
          metricsCollector.getPerformanceStatistics(undefined, timeWindow),
          systemMonitor.getSystemHealth(),
          databaseMonitor.getConnectionInfo(),
          metricsCollector.getStatistics('application_errors_total', timeWindow),
        ]);

        return {
          summary: {
            requestsPerMinute: httpStats.count / 5, // 5-minute window
            averageResponseTime: perfStats.avgDuration,
            successRate: perfStats.successRate,
            errorCount: errorStats.count,
          },
          system: {
            memoryUsage: systemHealth.memory.percentage,
            cpuLoad: systemHealth.cpu.usage,
            uptime: systemHealth.uptime,
          },
          database: {
            activeConnections: dbInfo.activeConnections,
            poolSize: dbInfo.poolSize,
          },
          cache: {
            connected: await cacheMonitor.checkCacheHealth(),
          },
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Dashboard metrics error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get dashboard metrics',
        });
      }
    }),
});