/**
 * Essential API utilities - JavaScript version for production compatibility
 * Contains only the functions actually needed by the API endpoints
 */

// Simple logger
class Logger {
  static getInstance() {
    return {
      info: (message, data = {}, context = {}) => console.log(`[INFO] ${message}`, { data, context }),
      error: (message, error = {}, data = {}, context = {}) => console.error(`[ERROR] ${message}`, { error, data, context }),
      warn: (message, data = {}, context = {}) => console.warn(`[WARN] ${message}`, { data, context })
    };
  }
}

// Error handling
class AppError extends Error {
  constructor(code, message, statusCode = 500, context = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }
}

const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  AI_PROCESSING_FAILED: 'AI_PROCESSING_FAILED',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  CHARGEBACK_BANNED: 'CHARGEBACK_BANNED',
  EMAIL_BLOCKED: 'EMAIL_BLOCKED',
  IP_BLOCKED: 'IP_BLOCKED'
};

function handleError(error, requestId, context = {}) {
  const logger = Logger.getInstance();
  logger.error('Request failed', error, { requestId }, context);
  
  return {
    success: false,
    error: error.message || 'Internal server error',
    error_code: error.code || 'INTERNAL_ERROR',
    request_id: requestId,
    timestamp: new Date().toISOString()
  };
}

// Request utilities
function generateRequestId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         '127.0.0.1';
}

// Basic validation
const processResumeSchema = {
  email: (value) => {
    if (!value || typeof value !== 'string') throw new Error('Email is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Invalid email format');
    return value.toLowerCase().trim();
  },
  resumeContent: (value) => {
    if (!value || typeof value !== 'string') throw new Error('Resume content is required');
    if (value.length < 50) throw new Error('Resume content too short');
    return value.trim();
  },
  jobDescription: (value) => {
    if (!value || typeof value !== 'string') throw new Error('Job description is required');
    if (value.length < 50) throw new Error('Job description too short');
    return value.trim();
  },
  fileName: (value) => {
    if (!value || typeof value !== 'string') throw new Error('File name is required');
    return value.trim();
  },
  template: (value) => {
    const validTemplates = ['ats-optimized', 'entry-clean', 'tech-focus', 'professional-plus', 'executive-format'];
    if (!validTemplates.includes(value)) throw new Error('Invalid template');
    return value;
  },
  isFirstTimeFlow: (value) => Boolean(value)
};

// Security middleware
function createSecurityMiddleware() {
  return {
    setHeaders: (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_URL || '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    },
    validateRequest: (req) => {
      // Basic security validation
      const userAgent = req.headers['user-agent'] || '';
      if (userAgent.toLowerCase().includes('bot') && !userAgent.toLowerCase().includes('googlebot')) {
        throw new AppError(ERROR_CODES.VALIDATION_FAILED, 'Invalid request', 403);
      }
    },
    validateInput: (body, schema) => {
      const result = {};
      for (const [key, validator] of Object.entries(schema)) {
        try {
          result[key] = validator(body[key]);
        } catch (error) {
          throw new AppError(ERROR_CODES.VALIDATION_FAILED, `Invalid ${key}: ${error.message}`, 400);
        }
      }
      return result;
    }
  };
}

// Rate limiting
class RateLimiter {
  static requests = new Map();
  
  static isAllowed(ip, limit = 10, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!this.requests.has(ip)) {
      this.requests.set(ip, []);
    }
    
    const requests = this.requests.get(ip);
    const validRequests = requests.filter(time => time > windowStart);
    
    if (validRequests.length >= limit) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(ip, validRequests);
    return true;
  }
  
  static getRemainingTime(ip, windowMs = 60000) {
    const requests = this.requests.get(ip) || [];
    if (requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...requests);
    const remaining = windowMs - (Date.now() - oldestRequest);
    return Math.max(0, remaining);
  }
}

// Content sanitization
function sanitizeResumeContent(content) {
  if (!content) return '';
  return content
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

function validateFileContent(content, fileName) {
  if (!content || content.length < 50) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, 'File content too short or empty', 400);
  }
  
  if (content.length > 500000) { // 500KB text limit
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, 'File content too large', 400);
  }
}

function validateEnvironment() {
  const required = ['ANTHROPIC_API_KEY', 'STRIPE_SECRET_KEY', 'RESEND_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(', ')}`);
    // Don't throw error for now, just warn - let API handle gracefully
    return false;
  }
  return true;
}

// Template processing stubs
function getTemplateTarget(templateType) {
  const targets = {
    'ats-optimized': 'General applicant tracking systems',
    'entry-clean': 'Entry-level and early career professionals',
    'tech-focus': 'Technical and engineering roles',
    'professional-plus': 'Mid-level professional positions',
    'executive-format': 'Senior leadership and executive roles'
  };
  return targets[templateType] || targets['ats-optimized'];
}

function getTemplatePromptEnhancements(templateType) {
  const enhancements = {
    'ats-optimized': 'Focus on keyword optimization and standard formatting',
    'entry-clean': 'Emphasize potential, education, and transferable skills',
    'tech-focus': 'Highlight technical skills, projects, and quantifiable achievements',
    'professional-plus': 'Showcase leadership experience and career progression',
    'executive-format': 'Emphasize strategic impact, board experience, and P&L responsibility'
  };
  return enhancements[templateType] || enhancements['ats-optimized'];
}

async function processTemplate(templateType, resumeData) {
  // Simple template processing - just return the structured data
  return resumeData;
}

async function generateResumePDF(resumeData, template, claudeResponse = '') {
  // Create a proper formatted resume text that looks professional
  const { personalInfo, processedContent } = resumeData;
  
  console.log('DEBUG - resumeData:', JSON.stringify(resumeData, null, 2));
  
  let resumeText = '';
  
  // If we have proper parsed data, use it
  if (personalInfo && (personalInfo.name || personalInfo.email)) {
    resumeText = `${personalInfo.name || 'Your Name'}\n`;
    resumeText += `${personalInfo.email || ''} | ${personalInfo.phone || ''} | ${personalInfo.location || ''}\n`;
    if (personalInfo.linkedin) {
      resumeText += `${personalInfo.linkedin}\n`;
    }
    resumeText += '\n';
    
    if (processedContent.summary) {
      resumeText += 'PROFESSIONAL SUMMARY\n';
      resumeText += `${processedContent.summary}\n\n`;
    }
    
    if (processedContent.experience) {
      resumeText += 'PROFESSIONAL EXPERIENCE\n';
      resumeText += `${processedContent.experience}\n\n`;
    }
    
    if (processedContent.education) {
      resumeText += 'EDUCATION\n';
      resumeText += `${processedContent.education}\n\n`;
    }
    
    if (processedContent.skills) {
      resumeText += 'SKILLS\n';
      resumeText += `${processedContent.skills}\n\n`;
    }
    
    if (processedContent.certifications) {
      resumeText += 'CERTIFICATIONS\n';
      resumeText += `${processedContent.certifications}\n\n`;
    }
  } else {
    // Fallback: use the raw Claude response if parsing failed
    console.log('DEBUG - Using raw Claude response as fallback');
    resumeText = claudeResponse || 'Resume content could not be parsed.';
  }
  
  resumeText += '\n---\n';
  resumeText += `Resume optimized by Resume Vita - ${new Date().toLocaleDateString()}\n`;
  resumeText += 'Copy this text into Word/Google Docs and format as needed.\n';
  
  return Buffer.from(resumeText, 'utf-8');
}

// Database stubs - implement these based on your actual database
async function getUserByEmail(email) {
  // TODO: Implement actual database query
  return null;
}

async function upsertUser(email, data) {
  // TODO: Implement actual database upsert
  return { email, ...data };
}

async function checkBadEmail(email) {
  // TODO: Implement actual bad email check
  return null;
}

async function trackBadEmail(email, ip) {
  // TODO: Implement actual bad email tracking
  return;
}

async function checkIPTracking(ip) {
  // TODO: Implement actual IP tracking check
  return null;
}

async function trackIPUsage(ip, email) {
  // TODO: Implement actual IP usage tracking
  return;
}

async function checkChargebackBlacklist(email, ip) {
  // TODO: Implement actual chargeback blacklist check
  return false;
}

async function logProcessingAnalytics(data) {
  // TODO: Implement actual analytics logging
  console.log('Analytics:', data);
}

async function createResumeJob(email, template, resumeContent, jobDescription, fileName) {
  // TODO: Implement actual job creation
  return { id: generateRequestId() };
}

async function updateResumeJob(jobId, data) {
  // TODO: Implement actual job update
  return;
}

// Performance monitoring stub
class ResourceMonitor {
  static logRequestMetrics(endpoint, duration) {
    console.log(`[METRICS] ${endpoint}: ${duration}ms`);
  }
}

// Export everything
module.exports = {
  // Classes
  Logger,
  AppError,
  RateLimiter,
  ResourceMonitor,
  
  // Constants
  ERROR_CODES,
  
  // Functions
  handleError,
  generateRequestId,
  getClientIP,
  createSecurityMiddleware,
  sanitizeResumeContent,
  validateFileContent,
  validateEnvironment,
  processResumeSchema,
  getTemplateTarget,
  getTemplatePromptEnhancements,
  processTemplate,
  generateResumePDF,
  
  // Database functions (stubs)
  getUserByEmail,
  upsertUser,
  checkBadEmail,
  trackBadEmail,
  checkIPTracking,
  trackIPUsage,
  checkChargebackBlacklist,
  logProcessingAnalytics,
  createResumeJob,
  updateResumeJob
};