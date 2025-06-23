/**
 * Application Configuration
 * Centralized configuration management for ResumeSniper
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
    n8nWebhookUrl: import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook-test/resume-upload',
    maxFileSize: (parseInt(import.meta.env.VITE_MAX_FILE_SIZE_MB) || 10) * 1024 * 1024,
    processingTimeout: parseInt(import.meta.env.VITE_PROCESSING_TIMEOUT_MS) || 120000,
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  stripe: {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  },
  features: {
    enablePaymentFlow: import.meta.env.VITE_ENABLE_PAYMENT_FLOW === 'true',
    enableAuth: import.meta.env.VITE_ENABLE_AUTH === 'true',
    debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
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

  if (!config.supabase.url) {
    errors.push('Missing VITE_SUPABASE_URL environment variable');
  }

  if (!config.supabase.anonKey) {
    errors.push('Missing VITE_SUPABASE_ANON_KEY environment variable');
  }

  if (config.features.enablePaymentFlow && !config.stripe.publishableKey) {
    errors.push('Missing VITE_STRIPE_PUBLISHABLE_KEY environment variable (required when payment flow is enabled)');
  }

  return errors;
}

// Debug logging utility
export function debugLog(message: string, data?: unknown) {
  if (config.features.debugMode) {
    console.log(`[ResumeSniper Debug] ${message}`, data || '');
  }
}

// Environment detection
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;