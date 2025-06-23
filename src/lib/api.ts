/**
 * API Service Layer
 * Handles all external API communications with proper error handling and retry logic
 */

import { config, debugLog } from './config';

export interface ResumeProcessingRequest {
  email: string;
  resumeContent: string;
  jobDescription: string;
  fileName: string;
}

export interface ResumeProcessingResponse {
  success: boolean;
  message: string;
  resumeUrl?: string;
  processingTime?: number;
  aiProvider?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

class ApiService {
  private async fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        debugLog(`API Request attempt ${attempt}`, { url, method: options.method });
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.api.processingTimeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        debugLog(`API Request successful`, { status: response.status });
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        debugLog(`API Request failed (attempt ${attempt})`, { error: lastError.message });

        if (attempt === maxRetries) {
          throw lastError;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw lastError!;
  }

  async processResume(request: ResumeProcessingRequest): Promise<ResumeProcessingResponse> {
    try {
      const startTime = Date.now();

      const response = await this.fetchWithRetry(config.api.n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();
      const processingTime = Date.now() - startTime;

      debugLog('Resume processing completed', { processingTime, result });

      return {
        ...result,
        processingTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      debugLog('Resume processing failed', { error: errorMessage });

      // Provide user-friendly error messages
      if (errorMessage.includes('fetch')) {
        throw new Error('Unable to connect to processing service. Please check your internet connection and try again.');
      }

      if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
        throw new Error('Processing is taking longer than expected. Please try again with a smaller resume file.');
      }

      if (errorMessage.includes('413')) {
        throw new Error('Resume file is too large. Please upload a smaller file.');
      }

      if (errorMessage.includes('429')) {
        throw new Error('Too many requests. Please wait a moment and try again.');
      }

      throw new Error(`Processing failed: ${errorMessage}`);
    }
  }

  async checkUserStatus(): Promise<{
    hasFreeTrialUsed: boolean;
    creditsRemaining: number;
    currentTier: string;
  }> {
    // This would integrate with Supabase to check user status
    // For now, return default values
    return {
      hasFreeTrialUsed: false,
      creditsRemaining: 0,
      currentTier: 'free'
    };
  }

  async validateFile(file: File): Promise<{ isValid: boolean; error?: string }> {
    // File size validation
    if (file.size > config.api.maxFileSize) {
      return {
        isValid: false,
        error: `File too large. Maximum size is ${config.api.maxFileSize / 1024 / 1024}MB`
      };
    }

    // File type validation
    const isValidType = Object.keys(config.fileTypes).includes(file.type) ||
                       Object.values(config.fileTypes).some(ext => 
                         file.name.toLowerCase().endsWith(ext)
                       );

    if (!isValidType) {
      return {
        isValid: false,
        error: 'Please upload a PDF, DOCX, DOC, TXT, or RTF file'
      };
    }

    // Content validation (basic checks)
    try {
      const content = await this.readFileContent(file);
      
      if (content.length < 100) {
        return {
          isValid: false,
          error: 'Resume appears to be too short. Please upload a complete resume.'
        };
      }

      if (content.length > 50000) {
        return {
          isValid: false,
          error: 'Resume content is too long. Please upload a more concise resume.'
        };
      }

      return { isValid: true };
    } catch {
      return {
        isValid: false,
        error: 'Unable to read file content. Please try a different file.'
      };
    }
  }

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // Analytics and monitoring
  trackEvent(eventName: string, properties?: Record<string, unknown>) {
    if (config.features.debugMode) {
      debugLog(`Event: ${eventName}`, properties);
    }

    // In production, this would send to analytics service
    // For now, just log
  }
}

export const apiService = new ApiService();