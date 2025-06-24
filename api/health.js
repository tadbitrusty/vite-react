/**
 * Health check endpoint for ResumeSniper API
 * Comprehensive health monitoring with performance metrics
 */

import { 
  Logger, 
  handleError, 
  generateRequestId, 
  getClientIP 
} from '../../lib/errorHandler';
import { 
  HealthChecker, 
  PerformanceMonitor, 
  MemoryMonitor,
  ResponseCache 
} from '../../lib/performance';

const logger = Logger.getInstance();

export default async function handler(req, res) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const ip = getClientIP(req);
  
  const context = {
    requestId,
    ip,
    timestamp: new Date().toISOString()
  };

  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ 
        error: 'Method not allowed',
        allowed_methods: ['GET']
      });
    }

    // Check for cached response
    const cacheKey = 'health-check';
    const cached = ResponseCache.get(cacheKey);
    
    if (cached && req.headers['if-none-match'] === cached.etag) {
      return res.status(304).end();
    }

    logger.info('Health check started', {}, context);

    // Run health checks
    const [databaseHealth, externalServices] = await Promise.all([
      HealthChecker.checkDatabaseHealth(),
      HealthChecker.checkExternalServices()
    ]);

    // Get system metrics
    const systemHealth = HealthChecker.getSystemHealth();
    
    // Determine overall status
    const isHealthy = databaseHealth.status === 'healthy' && 
                     systemHealth.memory.warningLevel !== 'critical';

    const response = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      request_id: requestId,
      version: '1.0.0',
      
      // Database status
      database: {
        status: databaseHealth.status,
        latency_ms: databaseHealth.latency
      },
      
      // External services
      services: externalServices,
      
      // System health
      system: {
        uptime_seconds: systemHealth.uptime,
        memory: systemHealth.memory,
        node_version: process.version,
        platform: process.platform,
        architecture: process.arch
      },
      
      // Performance metrics
      performance: systemHealth.performance,
      
      // Cache status
      cache: systemHealth.cache,
      
      // Environment check
      environment: {
        node_env: process.env.NODE_ENV || 'development',
        region: process.env.VERCEL_REGION || 'local',
        deployment_id: process.env.VERCEL_DEPLOYMENT_ID || 'local'
      }
    };

    // Cache the response
    const etag = ResponseCache.set(cacheKey, response);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=60'); // Cache for 1 minute

    // Record metrics
    const processingTime = Date.now() - startTime;
    PerformanceMonitor.recordRequest('/api/health', processingTime, true);

    logger.info('Health check completed', { 
      status: response.status,
      processingTime 
    }, context);

    const statusCode = isHealthy ? 200 : 503;
    res.status(statusCode).json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    PerformanceMonitor.recordRequest('/api/health', processingTime, false);
    
    logger.error('Health check failed', error, {}, context);
    
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      request_id: requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      system: {
        uptime_seconds: Math.round(process.uptime()),
        memory: MemoryMonitor.checkMemoryUsage()
      }
    };

    res.status(500).json(errorResponse);
  }
}