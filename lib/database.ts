/**
 * Database utility functions for ResumeSniper
 * Production-grade database operations with proper error handling
 */

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Environment validation
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

// Create Supabase client with service role for server-side operations
export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Type definitions
export interface User {
  id: string;
  email: string;
  resumes_used: number;
  resumes_remaining: number;
  privilege_level: 'free' | 'admin' | 'tester' | 'influencer' | 'foundation';
  last_ip?: string;
  user_agent?: string;
  template_preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_resume_date?: string;
}

export interface BadEmail {
  id: string;
  email: string;
  attempt_count: number;
  ip_addresses: string[];
  status: 'monitoring' | 'blocked';
  notes?: string;
}

export interface ProcessingAnalytics {
  email: string;
  template_selected: string;
  pricing_tier: string;
  revenue_amount: number;
  processing_time_seconds: number;
  ai_model_used: string;
  success: boolean;
  error_code?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface ResumeJob {
  id: string;
  email: string;
  template: string;
  resume_content: string;
  job_description: string;
  file_name?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_data?: Record<string, any>;
  error_message?: string;
}

/**
 * Check if user exists and get their current status
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

/**
 * Create or update user record
 */
export async function upsertUser(
  email: string,
  updates: Partial<Omit<User, 'id' | 'email' | 'created_at' | 'updated_at'>>
): Promise<User> {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          email: email.toLowerCase().trim(),
          ...updates,
        },
        {
          onConflict: 'email',
        }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error upserting user:', error);
    throw error;
  }
}

/**
 * Check if email is in bad emails list
 */
export async function checkBadEmail(email: string): Promise<BadEmail | null> {
  try {
    const { data, error } = await supabase
      .from('bad_emails')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error checking bad email:', error);
    throw error;
  }
}

/**
 * Track bad email attempt
 */
export async function trackBadEmail(email: string, ip: string): Promise<BadEmail> {
  try {
    const { data, error } = await supabase
      .from('bad_emails')
      .upsert(
        {
          email: email.toLowerCase().trim(),
          attempt_count: 1, // Will be incremented by database trigger
          ip_addresses: [ip],
          last_seen: new Date().toISOString(),
        },
        {
          onConflict: 'email',
        }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error tracking bad email:', error);
    throw error;
  }
}

/**
 * Check IP tracking for suspicious activity
 */
export async function checkIPTracking(ip: string): Promise<{
  email_count: number;
  status: string;
} | null> {
  try {
    const { data, error } = await supabase
      .from('ip_tracking')
      .select('email_count, status')
      .eq('ip_address', ip)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error checking IP tracking:', error);
    throw error;
  }
}

/**
 * Track IP usage
 */
export async function trackIPUsage(ip: string, email: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('ip_tracking')
      .upsert(
        {
          ip_address: ip,
          email_count: 1, // Will be handled by database logic
          last_email: email.toLowerCase().trim(),
          last_seen: new Date().toISOString(),
        },
        {
          onConflict: 'ip_address',
        }
      );

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  } catch (error) {
    console.error('Error tracking IP usage:', error);
    throw error;
  }
}

/**
 * Check if email/IP is in chargeback blacklist
 */
export async function checkChargebackBlacklist(
  email: string,
  ip?: string
): Promise<boolean> {
  try {
    let query = supabase
      .from('chargeback_blacklist')
      .select('id')
      .eq('permanent_ban', true);

    if (ip) {
      query = query.or(`email.eq.${email.toLowerCase().trim()},ip_address.eq.${ip}`);
    } else {
      query = query.eq('email', email.toLowerCase().trim());
    }

    const { data, error } = await query.limit(1);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking chargeback blacklist:', error);
    throw error;
  }
}

/**
 * Add to chargeback blacklist
 */
export async function addToChargebackBlacklist(
  email: string,
  ip: string,
  stripePaymentId: string,
  amountCents: number,
  notes?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('chargeback_blacklist')
      .insert({
        email: email.toLowerCase().trim(),
        ip_address: ip,
        stripe_payment_id: stripePaymentId,
        amount_cents: amountCents,
        permanent_ban: true,
        notes,
      });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  } catch (error) {
    console.error('Error adding to chargeback blacklist:', error);
    throw error;
  }
}

/**
 * Log processing analytics
 */
export async function logProcessingAnalytics(
  analytics: ProcessingAnalytics
): Promise<void> {
  try {
    const { error } = await supabase
      .from('processing_analytics')
      .insert({
        ...analytics,
        email: analytics.email.toLowerCase().trim(),
      });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  } catch (error) {
    console.error('Error logging analytics:', error);
    throw error;
  }
}

/**
 * Create resume processing job
 */
export async function createResumeJob(
  email: string,
  template: string,
  resumeContent: string,
  jobDescription: string,
  fileName?: string
): Promise<ResumeJob> {
  try {
    const { data, error } = await supabase
      .from('resume_jobs')
      .insert({
        email: email.toLowerCase().trim(),
        template,
        resume_content: resumeContent,
        job_description: jobDescription,
        file_name: fileName,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error creating resume job:', error);
    throw error;
  }
}

/**
 * Update resume job status
 */
export async function updateResumeJob(
  jobId: string,
  updates: Partial<Pick<ResumeJob, 'status' | 'result_data' | 'error_message'>>
): Promise<void> {
  try {
    const updateData: any = { ...updates };
    
    if (updates.status === 'processing') {
      updateData.started_at = new Date().toISOString();
    } else if (updates.status === 'completed' || updates.status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('resume_jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  } catch (error) {
    console.error('Error updating resume job:', error);
    throw error;
  }
}