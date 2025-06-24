/**
 * Resume Builder API Endpoint
 * Handles form-based resume creation with two pricing tiers
 */

import Anthropic from '@anthropic-ai/sdk';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { z } from 'zod';
const {
  getUserByEmail,
  upsertUser,
  checkBadEmail,
  trackBadEmail,
  checkIPTracking,
  trackIPUsage,
  checkChargebackBlacklist,
  logProcessingAnalytics,
  createResumeJob,
  updateResumeJob,
  processTemplate,
  AppError,
  ERROR_CODES,
  Logger,
  handleError,
  generateRequestId,
  getClientIP,
  RateLimiter,
  createSecurityMiddleware,
  sanitizeResumeContent,
  validateEnvironment,
  ResourceMonitor
} = require('./lib.js');

// Initialize logger and validate environment
const logger = Logger.getInstance();
validateEnvironment();

// Initialize services
let anthropic, stripe, resend;

try {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });

  resend = new Resend(process.env.RESEND_API_KEY);
  
  logger.info('Resume builder services initialized successfully');
} catch (error) {
  logger.error('Failed to initialize resume builder services', error);
  throw new Error('Service initialization failed');
}

// Initialize security middleware
const security = createSecurityMiddleware();

// Stripe product configuration for resume builder - LIVE PRICING
const RESUME_BUILDER_PRODUCTS = {
  'basic': {
    price_id: 'price_1RdahQK2tmo6HKYKhHAwxQce', // $45.00 - LIVE
    amount: 4500, // $45.00
    name: 'Basic Resume Builder'
  },
  'enhanced': {
    price_id: 'price_1RdaiAK2tmo6HKYKZUt5ZN0U', // $75.00 - LIVE
    amount: 7500, // $75.00
    name: 'AI-Enhanced Resume Builder'
  }
};

// Validation schema for resume builder data
const resumeBuilderSchema = z.object({
  personalInfo: z.object({
    fullName: z.string().min(1, 'Full name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(1, 'Phone number is required'),
    location: z.string().min(1, 'Location is required'),
    linkedin: z.string().optional()
  }),
  summary: z.string().min(10, 'Professional summary is required'),
  workExperience: z.array(z.object({
    id: z.string(),
    jobTitle: z.string().min(1, 'Job title is required'),
    company: z.string().min(1, 'Company is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional(),
    isCurrentJob: z.boolean(),
    responsibilities: z.string().min(10, 'Responsibilities are required')
  })).min(1, 'At least one work experience is required'),
  education: z.array(z.object({
    id: z.string(),
    degree: z.string().min(1, 'Degree is required'),
    school: z.string().min(1, 'School is required'),
    graduationDate: z.string().min(1, 'Graduation date is required'),
    gpa: z.string().optional()
  })).min(1, 'At least one education entry is required'),
  skills: z.string().min(5, 'Skills are required'),
  certifications: z.string().optional(),
  tier: z.enum(['basic', 'enhanced'])
});

// Convert form data to resume text format
function convertFormToResumeText(data) {
  const { personalInfo, summary, workExperience, education, skills, certifications } = data;
  
  let resumeText = `${personalInfo.fullName}\n`;
  resumeText += `${personalInfo.email} | ${personalInfo.phone} | ${personalInfo.location}\n`;
  if (personalInfo.linkedin) {
    resumeText += `${personalInfo.linkedin}\n`;
  }
  resumeText += '\n';
  
  resumeText += 'PROFESSIONAL SUMMARY\n';
  resumeText += `${summary}\n\n`;
  
  resumeText += 'PROFESSIONAL EXPERIENCE\n';
  workExperience.forEach(exp => {
    const endDate = exp.isCurrentJob ? 'Present' : new Date(exp.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    const startDate = new Date(exp.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    
    resumeText += `${exp.jobTitle} - ${exp.company}\n`;
    resumeText += `${startDate} - ${endDate}\n`;
    resumeText += `${exp.responsibilities}\n\n`;
  });
  
  resumeText += 'EDUCATION\n';
  education.forEach(edu => {
    const gradDate = new Date(edu.graduationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    resumeText += `${edu.degree} - ${edu.school}\n`;
    resumeText += `${gradDate}\n`;
    if (edu.gpa) {
      resumeText += `GPA: ${edu.gpa}\n`;
    }
    resumeText += '\n';
  });
  
  resumeText += 'SKILLS\n';
  resumeText += `${skills}\n\n`;
  
  if (certifications && certifications.trim()) {
    resumeText += 'CERTIFICATIONS\n';
    resumeText += `${certifications}\n`;
  }
  
  return resumeText;
}

// AI enhancement for enhanced tier
async function enhanceResumeContent(resumeText) {
  const prompt = `You are a professional resume writer. Please improve and enhance the following resume content while keeping all factual information accurate. Focus on:

1. Improving language and flow
2. Making achievements more impactful
3. Using stronger action verbs
4. Improving formatting and structure
5. Making it more ATS-friendly

IMPORTANT: Do not add false information or embellish facts. Only improve the presentation of existing information.

Original Resume:
${resumeText}

Please return the enhanced resume in the same basic structure but with improved language and impact:`;

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }]
  });

  return response.content[0].text;
}

// Create Stripe payment session for resume builder
async function createResumeBuilderPaymentSession(tier, email, resumeData) {
  const product = RESUME_BUILDER_PRODUCTS[tier];
  if (!product) {
    throw new Error(`Invalid tier: ${tier}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: product.amount,
        product_data: {
          name: product.name,
          description: tier === 'enhanced' ? 'AI-enhanced resume with professional optimization' : 'Professional resume from your form data'
        }
      },
      quantity: 1,
    }],
    customer_email: email,
    metadata: {
      service: 'resume_builder',
      tier: tier,
      resume_data: Buffer.from(JSON.stringify(resumeData)).toString('base64')
    },
    success_url: `${process.env.NEXT_PUBLIC_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/resume-builder?cancelled=true`
  });

  return session.url;
}

// Send resume via email
async function sendBuiltResumeEmail(email, processedTemplate, tier, personalInfo) {
  const tierName = tier === 'enhanced' ? 'AI-Enhanced' : 'Professional';
  
  const emailContent = `
    <h2>Your ${tierName} Resume is Ready!</h2>
    
    <p>Hi ${personalInfo.fullName},</p>
    
    <p>Your custom-built resume has been processed and is ready for use. This resume has been professionally formatted using our entry-clean template.</p>
    
    <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <h3>Resume Builder: ${tierName} Package</h3>
      <p><strong>Features Included:</strong></p>
      <ul>
        <li>Professional chronological resume format</li>
        <li>Entry-clean template styling</li>
        <li>ATS-friendly structure and formatting</li>
        ${tier === 'enhanced' ? '<li>AI-enhanced content optimization</li>' : ''}
        <li>Ready-to-use PDF format</li>
      </ul>
    </div>
    
    <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h4>Your Professional Resume (HTML Format):</h4>
      <p style="font-size: 12px; color: #666; margin-bottom: 15px;">
        Your resume is attached as a PDF. You can also use the HTML content below for easy customization.
      </p>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: 'Courier New', monospace; font-size: 11px; max-height: 400px; overflow-y: auto;">
${processedTemplate.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </div>
    </div>
    
    <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db; margin: 20px 0;">
      <h4 style="color: #3498db; margin-top: 0;">Want to Target Specific Jobs?</h4>
      <p>Now that you have your professional resume, optimize it for specific job postings with our ATS optimization tool for just $5.99-$9.99.</p>
      <p><a href="${process.env.NEXT_PUBLIC_URL}" style="color: #3498db; font-weight: bold;">Try Resume Vita ATS Optimizer →</a></p>
    </div>
    
    <p><strong>How to Use Your Resume:</strong></p>
    <ol>
      <li><strong>PDF Attachment:</strong> Your resume is attached as a ready-to-use PDF file</li>
      <li><strong>Review & Customize:</strong> Make any final personal adjustments</li>
      <li><strong>Apply Confidently:</strong> Submit to job applications knowing it's ATS-friendly</li>
      <li><strong>Target Specific Jobs:</strong> Use our optimization tool for job-specific versions</li>
    </ol>
    
    <p>Questions? Reply to this email and we'll help you out.</p>
    
    <p>Best of luck with your job search!</p>
    <p>The Resume Vita Team</p>
    
    <hr style="margin: 30px 0;">
    <p style="font-size: 12px; color: #666;">
      This resume was built using professional formatting and ${tier === 'enhanced' ? 'AI enhancement ' : ''}technology. 
      Always review and personalize your resume before submitting applications.
    </p>
  `;

  await resend.emails.send({
    from: process.env.FROM_EMAIL,
    to: email,
    subject: `Your ${tierName} Resume is Ready - Resume Vita`,
    html: emailContent
  });
}

// Main handler function
export default async function handler(req, res) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || '';
  
  const context = {
    requestId,
    ip,
    userAgent,
    timestamp: new Date().toISOString()
  };

  try {
    // Set security headers
    security.setHeaders(req, res);
    
    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Validate request method
    if (req.method !== 'POST') {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, 'Only POST requests allowed', 405);
    }

    logger.info('Resume builder request started', { method: req.method }, context);

    // Security validation
    security.validateRequest(req);

    // Rate limiting
    if (!RateLimiter.isAllowed(ip)) {
      const remainingTime = Math.ceil(RateLimiter.getRemainingTime(ip) / 1000);
      throw new AppError(
        ERROR_CODES.RATE_LIMITED, 
        `Too many requests. Try again in ${remainingTime} seconds`,
        429,
        context
      );
    }

    // Validate and sanitize input
    const validatedInput = resumeBuilderSchema.parse(req.body);
    const { personalInfo, tier } = validatedInput;
    
    // Update context with user info
    context.email = personalInfo.email;
    context.tier = tier;

    logger.info('Resume builder validation completed', { 
      tier,
      workExperienceCount: validatedInput.workExperience.length,
      educationCount: validatedInput.education.length 
    }, context);

    // Validate user access (basic fraud protection)
    const accessCheck = await validateUserAccess(personalInfo.email, ip, userAgent);
    
    if (!accessCheck.authorized) {
      if (accessCheck.reason === 'email_previously_used') {
        await trackBadEmail(personalInfo.email, ip);
      }

      const errorCode = accessCheck.reason === 'permanently_banned' ? ERROR_CODES.CHARGEBACK_BANNED :
                       accessCheck.reason === 'email_permanently_blocked' ? ERROR_CODES.EMAIL_BLOCKED :
                       accessCheck.reason === 'ip_suspicious_activity' ? ERROR_CODES.IP_BLOCKED :
                       ERROR_CODES.VALIDATION_FAILED;

      throw new AppError(errorCode, 'Access denied', 403, context);
    }

    // Create payment session
    const paymentUrl = await createResumeBuilderPaymentSession(tier, personalInfo.email, validatedInput);

    logger.info('Resume builder payment session created', { tier, paymentUrl }, context);

    return res.status(200).json({
      success: false,
      requires_payment: true,
      payment_url: paymentUrl,
      message: `Payment required for ${tier} resume builder`,
      amount: RESUME_BUILDER_PRODUCTS[tier].amount / 100,
      tier: tier,
      timestamp: new Date().toISOString(),
      request_id: requestId
    });

  } catch (error) {
    // Handle all errors through centralized error handler
    const errorResponse = handleError(error, requestId, context);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    
    ResourceMonitor.logRequestMetrics('/api/build-resume', Date.now() - startTime);
    
    return res.status(statusCode).json(errorResponse);
  }
}

// Simple user access validation for resume builder
async function validateUserAccess(email, ip, userAgent) {
  try {
    // Check chargeback blacklist
    const isBlacklisted = await checkChargebackBlacklist(email, ip);
    if (isBlacklisted) {
      return {
        authorized: false,
        reason: 'permanently_banned',
        action: 'block_request'
      };
    }

    // Check bad emails
    const badEmail = await checkBadEmail(email);
    if (badEmail && badEmail.attempt_count >= 5) {
      return {
        authorized: false,
        reason: 'email_permanently_blocked',
        action: 'block_request'
      };
    }

    // Check IP tracking
    const ipCheck = await checkIPTracking(ip);
    if (ipCheck && ipCheck.email_count > 10 && ipCheck.status === 'suspicious') {
      return {
        authorized: false,
        reason: 'ip_suspicious_activity',
        action: 'manual_review'
      };
    }

    // Track IP usage
    await trackIPUsage(ip, email);

    return { authorized: true };
    
  } catch (error) {
    console.error('Error validating user access:', error);
    return {
      authorized: false,
      reason: 'validation_error',
      action: 'try_again_later'
    };
  }
}