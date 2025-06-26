// Environment configuration
export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  REDIS_URL: process.env.REDIS_URL ?? '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? '',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
} as const;

// Application configuration
export const config = {
  app: {
    name: 'Resume Vita',
    version: '2.0.0',
    description: 'ATS-optimized resume generation platform',
    url: env.NODE_ENV === 'production' ? 'https://resumevita.com' : 'http://localhost:3000',
  },
  api: {
    timeout: 30000,
    retries: 3,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
  },
  uploads: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
    ],
  },
  ai: {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4000,
    temperature: 0.3,
    timeout: 60000,
  },
  email: {
    from: 'noreply@resumevita.com',
    replyTo: 'support@resumevita.com',
    timeout: 10000,
  },
  payment: {
    currency: 'usd',
    successUrl: config.app.url + '/payment-success',
    cancelUrl: config.app.url + '/',
  },
  security: {
    bcryptRounds: 12,
    jwtExpiresIn: '7d',
    sessionMaxAge: 30 * 24 * 60 * 60, // 30 days
    corsOrigins: env.NODE_ENV === 'production' 
      ? ['https://resumevita.com'] 
      : ['http://localhost:3000', 'http://localhost:3001'],
  },
} as const;

// Feature flags
export const features = {
  maintenanceMode: false,
  newUserFreeTemplate: true,
  advancedFraudDetection: true,
  emailNotifications: true,
  analyticsTracking: true,
  redisCache: true,
  backgroundJobs: true,
} as const;

export type Config = typeof config;
export type Features = typeof features;
export type Environment = typeof env;