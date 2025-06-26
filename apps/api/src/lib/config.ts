import { z } from 'zod';

const configSchema = z.object({
  port: z.number().default(3001),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  
  database: z.object({
    url: z.string().min(1),
  }),
  
  jwt: z.object({
    secret: z.string().min(1),
    expiresIn: z.string().default('24h'),
  }),
  
  redis: z.object({
    url: z.string().optional(),
    keyPrefix: z.string().default('resume-vita:'),
  }),
  
  stripe: z.object({
    secretKey: z.string().min(1),
    webhookSecret: z.string().min(1),
  }),
  
  anthropic: z.object({
    apiKey: z.string().min(1),
  }),
  
  resend: z.object({
    apiKey: z.string().min(1),
    fromEmail: z.string().email(),
  }),
  
  cors: z.object({
    origin: z.string().or(z.array(z.string())).default('http://localhost:3000'),
  }),
  
  rateLimit: z.object({
    windowMs: z.number().default(15 * 60 * 1000), // 15 minutes
    maxRequests: z.number().default(100),
  }),
  
  uploads: z.object({
    maxFileSize: z.number().default(10 * 1024 * 1024), // 10MB
    allowedMimeTypes: z.array(z.string()).default([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]),
  }),
  
  features: z.object({
    maintenanceMode: z.boolean().default(false),
    pdfGeneration: z.boolean().default(true),
    emailNotifications: z.boolean().default(true),
    caching: z.boolean().default(true),
  }),
});

function getEnvString(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Environment variable ${key} is required`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function getEnvArray(key: string, defaultValue: string[] = []): string[] {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

const rawConfig = {
  port: getEnvNumber('PORT', 3001),
  nodeEnv: process.env.NODE_ENV as 'development' | 'production' | 'test' || 'development',
  
  database: {
    url: getEnvString('DATABASE_URL'),
  },
  
  jwt: {
    secret: getEnvString('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  
  redis: {
    url: process.env.REDIS_URL,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'resume-vita:',
  },
  
  stripe: {
    secretKey: getEnvString('STRIPE_SECRET_KEY'),
    webhookSecret: getEnvString('STRIPE_WEBHOOK_SECRET'),
  },
  
  anthropic: {
    apiKey: getEnvString('ANTHROPIC_API_KEY'),
  },
  
  resend: {
    apiKey: getEnvString('RESEND_API_KEY'),
    fromEmail: getEnvString('FROM_EMAIL'),
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN ? 
      process.env.CORS_ORIGIN.includes(',') ? 
        getEnvArray('CORS_ORIGIN') : 
        process.env.CORS_ORIGIN :
      'http://localhost:3000',
  },
  
  rateLimit: {
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  },
  
  uploads: {
    maxFileSize: getEnvNumber('MAX_FILE_SIZE', 10 * 1024 * 1024),
    allowedMimeTypes: getEnvArray('ALLOWED_MIME_TYPES', [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]),
  },
  
  features: {
    maintenanceMode: getEnvBoolean('ENABLE_MAINTENANCE_MODE', false),
    pdfGeneration: getEnvBoolean('ENABLE_PDF_GENERATION', true),
    emailNotifications: getEnvBoolean('ENABLE_EMAIL_NOTIFICATIONS', true),
    caching: getEnvBoolean('ENABLE_CACHING', true),
  },
};

export const config = configSchema.parse(rawConfig);

export type Config = z.infer<typeof configSchema>;