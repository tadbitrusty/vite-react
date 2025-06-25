/**
 * Main processing endpoint for Resume Vita
 * Handles the complete business logic flow including fraud detection,
 * first-time user processing, and payment routing
 */

const Anthropic = require('@anthropic-ai/sdk');
const Stripe = require('stripe');
const { Resend } = require('resend');
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
  getTemplateTarget,
  getTemplatePromptEnhancements,
  generateResumePDF,
  AppError,
  ERROR_CODES,
  Logger,
  handleError,
  generateRequestId,
  getClientIP,
  RateLimiter,
  createSecurityMiddleware,
  processResumeSchema,
  sanitizeResumeContent,
  validateFileContent,
  validateEnvironment,
  ResourceMonitor
} = require('./lib.js');

// Initialize logger and validate environment
const logger = Logger.getInstance();
const envValid = validateEnvironment();

// Initialize services with error handling
let anthropic, stripe, resend;

try {
  if (envValid) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    resend = new Resend(process.env.RESEND_API_KEY);
    
    logger.info('Services initialized successfully');
  } else {
    logger.warn('Services not initialized due to missing environment variables');
  }
} catch (error) {
  logger.error('Failed to initialize services', error);
  // Don't throw error here - let API handle gracefully
}

// Initialize security middleware
const security = createSecurityMiddleware();

// Stripe product configuration - Live pricing from production
const STRIPE_PRODUCTS = {
  'entry-clean': {
    price_id: 'price_1RdLj0K2tmo6HKYKTPY41pOa',
    amount: 599,
    name: 'Premium Classic'
  },
  'tech-focus': {
    price_id: 'price_1RdLkqK2tmo6HKYKkCPPcVtQ',
    amount: 999,
    name: 'Tech Focus'
  },
  'professional-plus': {
    price_id: 'price_1RdLjbK2tmo6HKYKwByFU7dy',
    amount: 799,
    name: 'Premium Plus'
  },
  'executive-format': {
    price_id: 'price_1RdLkEK2tmo6HKYKaSNqvrh1',
    amount: 899,
    name: 'Executive Format'
  }
};

// Production-ready utilities handled by errorHandler and security modules

// Validate user access based on business rules
async function validateUserAccess(email, ip, isFirstTime, userAgent) {
  try {
    // Check chargeback blacklist first
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

    // Check existing user for first-time flow
    const existingUser = await getUserByEmail(email);
    
    if (isFirstTime && existingUser) {
      // User exists but claiming first time - redirect to payment
      return {
        authorized: false,
        reason: 'email_previously_used',
        action: 'redirect_to_payment'
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

// Process resume with Claude AI
async function processResumeWithClaude(resumeContent, jobDescription, templateType) {
  const target = getTemplateTarget(templateType);
  const templateEnhancements = getTemplatePromptEnhancements(templateType);

  const prompt = `You are a master resume writer specializing in ATS optimization.

TEMPLATE TYPE: ${templateType}
TARGET AUDIENCE: ${target}
TEMPLATE GUIDANCE: ${templateEnhancements}

INSTRUCTIONS:
- Do NOT lie or over-embellish
- Create an ATS-optimized resume that matches the job requirements
- Use keywords from the job description naturally
- Maintain professional formatting appropriate for ${templateType}
- Keep the same contact information from the original resume
- Focus on relevant experience for this specific job
- Return structured content in the following format:

PERSONAL INFO:
Name: [Extract from original]
Email: [Extract from original]  
Phone: [Extract from original]
Location: [Extract from original]
LinkedIn: [Extract if available]

SUMMARY:
[2-3 sentence professional summary tailored to the job]

EXPERIENCE:
[Format each job as:]
Job Title - Company Name
Date Range
• Achievement-focused bullet point
• Quantified accomplishment
• Relevant skill demonstration

EDUCATION:
[Format as:]
Degree - Institution Name
Date Range
[Any relevant details]

SKILLS:
[Categorized skills relevant to the job, separated by categories if applicable]

CERTIFICATIONS:
[If any exist in original resume]

ORIGINAL RESUME:
${resumeContent}

JOB DESCRIPTION:
${jobDescription}

Return the structured resume content following the exact format above:`;

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }]
  });

  return response.content[0].text;
}

// Parse Claude response into template data structure
function parseClaudeResponse(claudeResponse) {
  const sections = {};
  const lines = claudeResponse.split('\n');
  let currentSection = '';
  let currentContent = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.match(/^(PERSONAL INFO|SUMMARY|EXPERIENCE|EDUCATION|SKILLS|CERTIFICATIONS):/)) {
      // Save previous section
      if (currentSection && currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      
      // Start new section
      currentSection = trimmedLine.replace(':', '').toLowerCase().replace(' ', '_');
      currentContent = [];
    } else if (trimmedLine && currentSection) {
      currentContent.push(line);
    }
  }
  
  // Save last section
  if (currentSection && currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  // Parse personal info
  const personalInfo = {};
  if (sections.personal_info) {
    const infoLines = sections.personal_info.split('\n');
    infoLines.forEach(line => {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const key = match[1].toLowerCase();
        personalInfo[key] = match[2].trim();
      }
    });
  }

  return {
    personalInfo: {
      name: personalInfo.name || '',
      email: personalInfo.email || '',
      phone: personalInfo.phone || '',
      location: personalInfo.location || '',
      linkedin: personalInfo.linkedin || '',
      github: personalInfo.github || '',
    },
    processedContent: {
      summary: sections.summary || '',
      experience: sections.experience || '',
      education: sections.education || '',
      skills: sections.skills || '',
      certifications: sections.certifications || '',
      projects: sections.projects || '',
    },
    executiveInfo: {
      title: personalInfo.title || '',
      highlights: sections.leadership_highlights || '',
      boardPositions: sections.board_positions || '',
    }
  };
}

// Create Stripe payment session
async function createPaymentSession(template, email, resumeData) {
  const product = STRIPE_PRODUCTS[template];
  if (!product) {
    throw new Error(`Invalid template: ${template}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price: product.price_id,
      quantity: 1,
    }],
    customer_email: email,
    metadata: {
      template: template,
      resume_content: Buffer.from(resumeData.resumeContent).toString('base64'),
      job_description: Buffer.from(resumeData.jobDescription).toString('base64'),
      file_name: resumeData.fileName
    },
    success_url: `${process.env.NEXT_PUBLIC_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}?cancelled=true`
  });

  return session.url;
}

// Send resume via email with PDF attachment
async function sendResumeEmail(email, processedTemplate, template, fileName, resumeData, claudeResponse = '') {
  const templateNames = {
    'ats-optimized': 'ATS Optimized',
    'entry-clean': 'Modern Clean',
    'tech-focus': 'Technical Focus',
    'professional-plus': 'Professional Plus',
    'executive-format': 'Executive Format'
  };

  const templateName = templateNames[template] || 'ATS Optimized';
  const isFreeTier = template === 'ats-optimized';
  
  // Generate PDF from the processed template and resume data
  const pdfBuffer = await generateResumePDF(resumeData, template, claudeResponse);
  const pdfFileName = `${fileName.replace(/\.[^/.]+$/, '')}_${template}.pdf`;

  const emailContent = `
    <h2>Your ${templateName} Resume is Ready!</h2>
    
    <p>Hi there,</p>
    
    <p>Your ${isFreeTier ? 'FREE' : 'premium'} resume has been processed and is ready for use. This resume has been specifically tailored to improve your chances with Applicant Tracking Systems (ATS).</p>
    
    <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <h3>Template: ${templateName} ${isFreeTier ? '(FREE)' : ''}</h3>
      <p><strong>Optimizations Applied:</strong></p>
      <ul>
        <li>ATS-friendly formatting and structure</li>
        <li>Keyword optimization based on job description</li>
        <li>Professional ${templateName.toLowerCase()} styling</li>
        ${!isFreeTier ? '<li>Premium template enhancements</li>' : ''}
        <li>Industry-specific customizations</li>
      </ul>
    </div>
    
    <div style="background: #e8f4fd; padding: 20px; border: 1px solid #3498db; border-radius: 8px;">
      <h4>📎 Your Resume is Attached as PDF</h4>
      <p style="font-size: 14px; color: #333; margin-bottom: 15px;">
        Your optimized resume is attached to this email as a ready-to-use PDF file: <strong>${pdfFileName}</strong>
      </p>
      <p style="font-size: 12px; color: #666;">
        This PDF is formatted for professional applications and is fully ATS-compatible.
      </p>
    </div>
    
    <p><strong>How to Use Your Resume:</strong></p>
    <ol>
      <li><strong>Download the attached PDF</strong> - Ready for immediate use in job applications</li>
      <li><strong>Review and customize</strong> - Make any final personal adjustments if needed</li>
      <li><strong>Apply with confidence</strong> - Your resume is now ATS-optimized for better visibility</li>
      <li><strong>Save copies</strong> - Keep the PDF for future applications to similar roles</li>
    </ol>
    
    ${!isFreeTier ? `
    <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #27ae60;">
      <h4 style="color: #27ae60; margin-top: 0;">Premium Template Features:</h4>
      <p>You've received a premium ${templateName} template with enhanced styling, advanced formatting, and professional design elements that make your resume stand out while maintaining ATS compatibility.</p>
    </div>
    ` : `
    <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db;">
      <h4 style="color: #3498db; margin-top: 0;">Want More Options?</h4>
      <p>This was your FREE ATS Optimized resume. Return to Resume Vita as a "Returning User" to access premium templates with enhanced styling and specialized formatting for $5.99-$9.99.</p>
    </div>
    `}
    
    <p>Questions? Reply to this email and we'll help you out.</p>
    
    <p>Best of luck with your job search!</p>
    <p>The Resume Vita Team</p>
    
    <hr style="margin: 30px 0;">
    <p style="font-size: 12px; color: #666;">
      This resume was generated using AI optimization technology specifically designed to improve ATS compatibility. 
      Always review and personalize your resume before submitting applications.
    </p>
  `;

  await resend.emails.send({
    from: process.env.FROM_EMAIL,
    to: email,
    subject: `Your ${templateName} Resume is Ready - Resume Vita`,
    html: emailContent,
    attachments: [
      {
        filename: pdfFileName,
        content: pdfBuffer,
        type: 'application/pdf'
      }
    ]
  });
}

// Main handler function with comprehensive error catching
module.exports = async function handler(req, res) {
  const startTime = Date.now();
  let requestId, ip, userAgent, context;
  
  try {
    requestId = generateRequestId();
    ip = getClientIP(req);
    userAgent = req.headers['user-agent'] || '';
    
    context = {
      requestId,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    };

    // Ensure JSON response headers are set first
    res.setHeader('Content-Type', 'application/json');
  } catch (initError) {
    // Fallback if even basic initialization fails
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      success: false,
      error: 'Failed to initialize request handler',
      error_code: 'INITIALIZATION_ERROR',
      request_id: 'unknown',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // TEMPORARY MAINTENANCE MODE - REMOVE WHEN FIXED
    return res.status(503).json({
      success: false,
      error: 'Service temporarily unavailable for maintenance',
      message: 'We are currently fixing an issue with PDF generation. Please check back in a few hours.',
      error_code: 'MAINTENANCE_MODE',
      timestamp: new Date().toISOString(),
      request_id: requestId
    });
    
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

    // Check if environment is properly configured
    if (!envValid) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, 'Service temporarily unavailable - configuration error', 503);
    }

    logger.info('Processing resume request started', { method: req.method }, context);

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
    const validatedInput = security.validateInput(req.body, processResumeSchema);
    const { email, fileName, template, isFirstTimeFlow } = validatedInput;
    
    // Sanitize content
    const resumeContent = sanitizeResumeContent(validatedInput.resumeContent);
    const jobDescription = sanitizeResumeContent(validatedInput.jobDescription);
    
    // Validate file content
    validateFileContent(resumeContent, fileName);
    
    // Update context with user info
    context.email = email;
    context.template = template;

    logger.info('Input validation completed', { 
      template, 
      isFirstTimeFlow,
      resumeLength: resumeContent.length,
      jobDescLength: jobDescription.length 
    }, context);

    // Validate user access
    const accessCheck = await validateUserAccess(email, ip, isFirstTimeFlow, userAgent);
    
    if (!accessCheck.authorized) {
      if (accessCheck.action === 'redirect_to_payment') {
        // Create payment session for premium template
        const paymentUrl = await createPaymentSession(template, email, {
          resumeContent,
          jobDescription,
          fileName
        });

        logger.info('Redirecting to payment', { template, reason: accessCheck.reason }, context);

        return res.status(200).json({
          success: false,
          requires_payment: true,
          payment_url: paymentUrl,
          message: 'Email previously used. Payment required for premium templates.',
          error_code: ERROR_CODES.PAYMENT_REQUIRED,
          timestamp: new Date().toISOString(),
          request_id: requestId
        });
      } else {
        // Block or track bad attempt
        if (accessCheck.reason === 'email_previously_used') {
          await trackBadEmail(email, ip);
        }

        const errorCode = accessCheck.reason === 'permanently_banned' ? ERROR_CODES.CHARGEBACK_BANNED :
                         accessCheck.reason === 'email_permanently_blocked' ? ERROR_CODES.EMAIL_BLOCKED :
                         accessCheck.reason === 'ip_suspicious_activity' ? ERROR_CODES.IP_BLOCKED :
                         ERROR_CODES.VALIDATION_FAILED;

        throw new AppError(errorCode, 'Access denied', 403, context);
      }
    }

    // Handle first-time free processing
    if (isFirstTimeFlow && template === 'ats-optimized') {
      try {
        // Create resume job
        const job = await createResumeJob(email, template, resumeContent, jobDescription, fileName);
        
        // Update job status to processing
        await updateResumeJob(job.id, { status: 'processing' });

        // Process with AI
        const claudeResponse = await processResumeWithClaude(resumeContent, jobDescription, template);
        
        // Parse Claude response into structured data
        const resumeData = parseClaudeResponse(claudeResponse);
        
        // Process through template system
        const processedTemplate = await processTemplate(template, resumeData);

        // Send email with processed template and PDF attachment
        await sendResumeEmail(email, processedTemplate, template, fileName, resumeData, claudeResponse);

        // Update user record
        await upsertUser(email, {
          resumes_used: 1,
          resumes_remaining: 0,
          last_ip: ip,
          user_agent: userAgent,
          last_resume_date: new Date().toISOString()
        });

        // Update job status to completed
        await updateResumeJob(job.id, { 
          status: 'completed',
          result_data: { 
            email_sent: true,
            template_used: template,
            processing_time: Date.now() - startTime
          }
        });

        // Log analytics
        await logProcessingAnalytics({
          email,
          template_selected: template,
          pricing_tier: 'free',
          revenue_amount: 0,
          processing_time_seconds: Math.round((Date.now() - startTime) / 1000),
          ai_model_used: 'claude-3-5-sonnet',
          success: true,
          ip_address: ip,
          user_agent: userAgent
        });

        const processingTime = Date.now() - startTime;
        logger.info('Free resume processed successfully', { 
          processingTime,
          template 
        }, context);
        
        ResourceMonitor.logRequestMetrics('/api/process-resume', processingTime);

        return res.status(200).json({
          success: true,
          message: 'Resume processed and sent via email',
          processing_time: processingTime,
          timestamp: new Date().toISOString(),
          request_id: requestId
        });

      } catch (error) {
        logger.error('Error processing free resume', error, { template }, context);
        
        // Update job status to failed if job was created
        if (job?.id) {
          await updateResumeJob(job.id, { 
            status: 'failed',
            error_message: error.message 
          });
        }

        // Log failed analytics
        await logProcessingAnalytics({
          email,
          template_selected: template,
          pricing_tier: 'free',
          revenue_amount: 0,
          processing_time_seconds: Math.round((Date.now() - startTime) / 1000),
          ai_model_used: 'claude-3-5-sonnet',
          success: false,
          error_code: ERROR_CODES.AI_PROCESSING_FAILED,
          ip_address: ip,
          user_agent: userAgent
        });

        throw new AppError(ERROR_CODES.AI_PROCESSING_FAILED, 'Failed to process resume', 500, context);
      }
    }

    // Handle premium template requests (non-first-time or paid templates)
    if (!isFirstTimeFlow || template !== 'ats-optimized') {
      const paymentUrl = await createPaymentSession(template, email, {
        resumeContent,
        jobDescription,
        fileName
      });

      return res.status(200).json({
        success: false,
        requires_payment: true,
        payment_url: paymentUrl,
        message: 'Payment required for premium templates',
        error_code: 'PAYMENT_REQUIRED',
        timestamp: new Date().toISOString(),
        request_id: requestId
      });
    }

  } catch (error) {
    try {
      // Handle all errors through centralized error handler
      const errorResponse = handleError(error, requestId || 'unknown', context || {});
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      
      ResourceMonitor.logRequestMetrics('/api/process-resume', Date.now() - startTime);
      
      // Ensure Content-Type is JSON
      res.setHeader('Content-Type', 'application/json');
      return res.status(statusCode).json(errorResponse);
    } catch (handlingError) {
      // Ultimate fallback - if even error handling fails
      console.error('Critical error in error handler:', handlingError);
      console.error('Original error:', error);
      
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({
        success: false,
        error: 'Critical system error',
        error_code: 'CRITICAL_ERROR',
        request_id: requestId || 'unknown',
        timestamp: new Date().toISOString()
      });
    }
  }
}