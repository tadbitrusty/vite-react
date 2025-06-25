import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../lib/trpc';
import { config, features } from '@resume-vita/config';

export const healthRouter = createTRPCRouter({
  status: publicProcedure.query(async ({ ctx }) => {
    // Check database connectivity
    let dbStatus = 'healthy';
    let dbLatency = 0;
    
    try {
      const start = Date.now();
      await ctx.prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
    } catch (error) {
      dbStatus = 'unhealthy';
      console.error('Database health check failed:', error);
    }

    // Check feature flags
    const maintenanceMode = features.maintenanceMode;

    return {
      status: dbStatus === 'healthy' && !maintenanceMode ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: config.app.version,
      environment: config.env.NODE_ENV,
      services: {
        database: {
          status: dbStatus,
          latency: dbLatency,
        },
        maintenance: {
          enabled: maintenanceMode,
        },
      },
      features: {
        newUserFreeTemplate: features.newUserFreeTemplate,
        advancedFraudDetection: features.advancedFraudDetection,
        emailNotifications: features.emailNotifications,
        analyticsTracking: features.analyticsTracking,
        redisCache: features.redisCache,
        backgroundJobs: features.backgroundJobs,
      },
    };
  }),

  ping: publicProcedure.query(() => {
    return {
      message: 'pong',
      timestamp: new Date().toISOString(),
    };
  }),

  ready: publicProcedure.query(async ({ ctx }) => {
    // More comprehensive readiness check
    const checks = [];

    // Database check
    try {
      await ctx.prisma.$queryRaw`SELECT 1`;
      checks.push({ name: 'database', status: 'pass' });
    } catch (error) {
      checks.push({ name: 'database', status: 'fail', error: String(error) });
    }

    // Environment variables check
    const requiredEnvVars = [
      'DATABASE_URL',
      'ANTHROPIC_API_KEY',
      'STRIPE_SECRET_KEY',
      'RESEND_API_KEY',
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar]
    );

    checks.push({
      name: 'environment',
      status: missingEnvVars.length === 0 ? 'pass' : 'fail',
      ...(missingEnvVars.length > 0 && {
        error: `Missing environment variables: ${missingEnvVars.join(', ')}`,
      }),
    });

    const allPassed = checks.every((check) => check.status === 'pass');

    return {
      status: allPassed ? 'ready' : 'not-ready',
      checks,
      timestamp: new Date().toISOString(),
    };
  }),
});