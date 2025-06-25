/**
 * Application Configuration
 * Centralized configuration management for Resume Vita
 */

export interface AppConfig {
  api: {
    n8nWebhookUrl: string;
    maxFileSize: number;
    processingTimeout: number;
  };
  supabase: {
    url: string;
    anonKey: string;
  };
  stripe: {
    publishableKey: string;
  };
  features: {
    enablePaymentFlow: boolean;
    enableAuth: boolean;
    debugMode: boolean;
  };
  fileTypes: Record<string, string>;
}

export const config: AppConfig = {
  api: {
    n8nWebhookUrl: process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook-test/resume-upload',
    maxFileSize: (parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '10')) * 1024 * 1024,
    processingTimeout: parseInt(process.env.NEXT_PUBLIC_PROCESSING_TIMEOUT_MS || '120000'),
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  },
  features: {
    enablePaymentFlow: process.env.NEXT_PUBLIC_ENABLE_PAYMENT_FLOW === 'true',
    enableAuth: process.env.NEXT_PUBLIC_ENABLE_AUTH === 'true',
    debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
  },
  fileTypes: {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc',
    'text/plain': '.txt',
    'text/rtf': '.rtf',
    'application/rtf': '.rtf'
  }
};

// Configuration validation
export function validateConfig(): string[] {
  const errors: string[] = [];

  // These are optional for now
  if (config.features.enableAuth && !config.supabase.url) {
    errors.push('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (config.features.enableAuth && !config.supabase.anonKey) {
    errors.push('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
  }

  if (config.features.enablePaymentFlow && !config.stripe.publishableKey) {
    errors.push('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable');
  }

  return errors;
}

// Debug logging utility
export function debugLog(message: string, data?: unknown) {
  if (config.features.debugMode) {
    console.log(`[Resume Vita Debug] ${message}`, data || '');
  }
}

// Environment detection
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';