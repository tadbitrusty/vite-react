/**
 * Stripe webhook handler for ResumeSniper
 * Processes successful payments and triggers resume generation
 */

const Stripe = require('stripe');
const Anthropic = require('@anthropic-ai/sdk');
const { Resend } = require('resend');
const { z } = require('zod');
const {
  getUserByEmail,
  upsertUser,
  logProcessingAnalytics,
  createResumeJob,
  updateResumeJob,
  processTemplate,
  getTemplateTarget,
  getTemplatePromptEnhancements
} = require('./lib.js');

// Add missing function for chargeback handling
async function addToChargebackBlacklist(email, ip, paymentId, amount, reason) {
  // TODO: Implement actual chargeback blacklist functionality
  console.log(`[CHARGEBACK] Banned ${email} (${ip}) - ${reason} - Payment: ${paymentId} Amount: ${amount}`);
}

// Initialize services
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const resend = new Resend(process.env.RESEND_API_KEY);

// Environment validation
const envSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  FROM_EMAIL: z.string().email(),
});

// Template pricing mapping
const TEMPLATE_PRICING = {
  'entry-clean': { amount: 599, name: 'Modern Clean Template' },
  'tech-focus': { amount: 799, name: 'Technical Focus Template' },
  'professional-plus': { amount: 899, name: 'Professional Plus Template' },
  'executive-format': { amount: 999, name: 'Executive Format Template' }
};

// Process resume with Claude AI (same as main endpoint)
async function processResumeWithClaude(resumeContent, jobDescription, templateType) {
  const templateTargets = {
    'ats-optimized': 'general ATS compliance and broad industry appeal',
    'entry-clean': 'entry-level positions with clean, modern presentation',
    'tech-focus': 'technical roles with emphasis on skills and projects',
    'professional-plus': 'career advancement with enhanced formatting',
    'executive-format': 'senior leadership roles with executive presence'
  };

  const target = templateTargets[templateType] || templateTargets['ats-optimized'];

  const prompt = `You are a master resume writer specializing in ATS optimization.

TEMPLATE TYPE: ${templateType}
TARGET: ${target}

INSTRUCTIONS:
- Do NOT lie or over-embellish
- Create an ATS-optimized resume that matches the job requirements
- Use keywords from the job description naturally
- Maintain professional formatting appropriate for ${templateType}
- Keep the same contact information
- Focus on relevant experience for this specific job
- Format output for ${templateType} template structure
- Apply premium styling and enhanced formatting for this ${templateType} template

ORIGINAL RESUME:
${resumeContent}

JOB DESCRIPTION:
${jobDescription}

Return a structured resume optimized for ATS systems and formatted for the ${templateType} template with premium enhancements:`;

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }]
  });

  return response.content[0].text;
}

// Parse Claude response into template data structure (copied from process-resume.js)
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

// Send premium resume via email
async function sendPremiumResumeEmail(email, processedTemplate, template, fileName, amountPaid) {
  const templateNames = {
    'entry-clean': 'Modern Clean',
    'tech-focus': 'Technical Focus',
    'professional-plus': 'Professional Plus',
    'executive-format': 'Executive Format'
  };

  const templateName = templateNames[template] || template;
  const formattedAmount = (amountPaid / 100).toFixed(2);
  
  const emailContent = `
    <h2>Your Premium ${templateName} Resume is Ready!</h2>
    
    <p>Hi there,</p>
    
    <p>Thank you for your purchase! Your premium ${templateName} resume has been processed with our advanced optimization algorithms and is ready for download.</p>
    
    <div style="background: #f8f9ff; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4CAF50;">
      <h3>✅ Payment Confirmed: $${formattedAmount}</h3>
      <p><strong>Template: ${templateName}</strong></p>
      <p><strong>Premium Features Applied:</strong></p>
      <ul>
        <li>Advanced ATS optimization algorithms</li>
        <li>Premium template formatting and styling</li>
        <li>Enhanced keyword optimization</li>
        <li>Industry-specific customizations</li>
        <li>Professional layout optimizations</li>
        <li>Executive-level presentation (where applicable)</li>
      </ul>
    </div>
    
    <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h4>Your Premium Resume (HTML Format):</h4>
      <p style="font-size: 12px; color: #666; margin-bottom: 15px;">
        Copy the content below and save as an HTML file for perfect formatting, or paste into your document editor.
      </p>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: 'Courier New', monospace; font-size: 11px; max-height: 400px; overflow-y: auto;">
${processedTemplate.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </div>
    </div>
    
    <p><strong>How to Use Your Premium Resume:</strong></p>
    <ol>
      <li><strong>Method 1 (Recommended):</strong> Copy the HTML content above and save as "${fileName.replace(/\.[^/.]+$/, '')}_${template}_premium.html" - Open in any browser to see the styled resume</li>
      <li><strong>Method 2:</strong> Copy content and paste into Word/Google Docs, then apply formatting</li>
      <li><strong>Method 3:</strong> Use the HTML as a reference to manually recreate in your preferred format</li>
      <li>Review and make any final personal adjustments</li>
      <li>Export as PDF for applications</li>
      <li>Apply with confidence!</li>
    </ol>
    
    <div style="background: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 8px; border: 1px solid #ffeaa7;">
      <p><strong>💡 Pro Tip:</strong> This premium template is designed for ${getTemplateTarget(template)}. Use it strategically for your most important applications.</p>
    </div>
    
    <p>Questions about your resume or need additional revisions? Reply to this email and we'll help you out.</p>
    
    <p>Best of luck with your job search!</p>
    <p>The ResumeSniper Team</p>
    
    <hr style="margin: 30px 0;">
    <p style="font-size: 12px; color: #666;">
      This premium resume was generated using our advanced AI optimization technology. 
      Always review and personalize your resume before submitting applications.
      <br><br>
      Receipt: Payment of $${formattedAmount} processed successfully for ${templateName} template.
    </p>
  `;

  await resend.emails.send({
    from: process.env.FROM_EMAIL,
    to: email,
    subject: `Your Premium ${templateName} Resume is Ready - ResumeSniper`,
    html: emailContent
  });
}

// Process payment after successful checkout
async function processPaymentSuccess(session) {
  const startTime = Date.now();
  const email = session.customer_details.email;
  const metadata = session.metadata;
  
  // Decode resume data from metadata
  const resumeData = {
    resumeContent: Buffer.from(metadata.resume_content, 'base64').toString(),
    jobDescription: Buffer.from(metadata.job_description, 'base64').toString(),
    fileName: metadata.file_name,
    template: metadata.template
  };

  const templatePricing = TEMPLATE_PRICING[resumeData.template];
  if (!templatePricing) {
    throw new Error(`Invalid template in payment metadata: ${resumeData.template}`);
  }

  try {
    // Create resume job
    const job = await createResumeJob(
      email, 
      resumeData.template, 
      resumeData.resumeContent, 
      resumeData.jobDescription, 
      resumeData.fileName
    );
    
    // Update job status to processing
    await updateResumeJob(job.id, { status: 'processing' });

    // Process with AI
    const claudeResponse = await processResumeWithClaude(
      resumeData.resumeContent, 
      resumeData.jobDescription, 
      resumeData.template
    );
    
    // Parse Claude response into structured data
    const parsedResumeData = parseClaudeResponse(claudeResponse);
    
    // Process through template system
    const processedTemplate = await processTemplate(resumeData.template, parsedResumeData);

    // Send premium email with processed template
    await sendPremiumResumeEmail(
      email, 
      processedTemplate, 
      resumeData.template, 
      resumeData.fileName, 
      session.amount_total
    );

    // Update or create user record
    const existingUser = await getUserByEmail(email);
    const resumesUsed = (existingUser?.resumes_used || 0) + 1;
    
    await upsertUser(email, {
      resumes_used: resumesUsed,
      resumes_remaining: 0, // Paid users don't get additional free resumes
      privilege_level: 'foundation', // Upgrade to foundation level
      last_resume_date: new Date().toISOString(),
      template_preferences: {
        ...existingUser?.template_preferences,
        [resumeData.template]: new Date().toISOString()
      }
    });

    // Update job status to completed
    await updateResumeJob(job.id, { 
      status: 'completed',
      result_data: { 
        email_sent: true,
        template_used: resumeData.template,
        processing_time: Date.now() - startTime,
        payment_amount: session.amount_total,
        stripe_session_id: session.id
      }
    });

    // Log analytics
    await logProcessingAnalytics({
      email,
      template_selected: resumeData.template,
      pricing_tier: 'premium',
      revenue_amount: session.amount_total / 100, // Convert to dollars
      processing_time_seconds: Math.round((Date.now() - startTime) / 1000),
      ai_model_used: 'claude-3-5-sonnet',
      success: true,
      ip_address: session.customer_details?.address?.country || null,
      user_agent: 'stripe-webhook'
    });

    console.log(JSON.stringify({
      level: 'info',
      message: 'Premium resume processed successfully',
      data: { 
        email, 
        template: resumeData.template, 
        amount: session.amount_total,
        session_id: session.id,
        processing_time: Date.now() - startTime
      },
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    console.error('Error processing premium resume:', error);
    
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
      template_selected: resumeData.template,
      pricing_tier: 'premium',
      revenue_amount: session.amount_total / 100,
      processing_time_seconds: Math.round((Date.now() - startTime) / 1000),
      ai_model_used: 'claude-3-5-sonnet',
      success: false,
      error_code: 'PREMIUM_PROCESSING_FAILED',
      ip_address: session.customer_details?.address?.country || null,
      user_agent: 'stripe-webhook'
    });

    // Send error notification email
    try {
      await resend.emails.send({
        from: process.env.FROM_EMAIL,
        to: email,
        subject: 'Issue with Your Resume Processing - ResumeSniper',
        html: `
          <h2>Resume Processing Issue</h2>
          <p>Hi there,</p>
          <p>We encountered an issue processing your premium resume. Our team has been notified and we'll resolve this within 24 hours.</p>
          <p>Your payment of $${(session.amount_total / 100).toFixed(2)} was successful and you will receive your optimized resume once the issue is resolved.</p>
          <p>If you have any questions, please reply to this email.</p>
          <p>Thank you for your patience.</p>
          <p>The ResumeSniper Team</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send error notification email:', emailError);
    }

    throw error;
  }
}

// Handle chargeback notifications
async function processChargeback(paymentIntent) {
  const email = paymentIntent.charges.data[0]?.billing_details?.email;
  const ip = paymentIntent.charges.data[0]?.outcome?.network_status; // Limited IP info from Stripe
  
  if (email) {
    await addToChargebackBlacklist(
      email,
      ip || '0.0.0.0',
      paymentIntent.id,
      paymentIntent.amount,
      'Chargeback detected - automatic permanent ban'
    );
    
    console.log(JSON.stringify({
      level: 'warn',
      message: 'Chargeback detected - user banned',
      data: { email, payment_intent: paymentIntent.id, amount: paymentIntent.amount },
      timestamp: new Date().toISOString()
    }));
  }
}

// Raw body parser for Stripe webhooks
const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

// Main webhook handler
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate environment
    const env = envSchema.parse(process.env);

    const sig = req.headers['stripe-signature'];
    const rawBody = JSON.stringify(req.body);
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
    }

    console.log(JSON.stringify({
      level: 'info',
      message: 'Stripe webhook received',
      data: { type: event.type, id: event.id },
      timestamp: new Date().toISOString()
    }));

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await processPaymentSuccess(event.data.object);
        break;
        
      case 'payment_intent.payment_failed':
        console.log(JSON.stringify({
          level: 'warn',
          message: 'Payment failed',
          data: { 
            payment_intent: event.data.object.id,
            email: event.data.object.receipt_email,
            failure_code: event.data.object.last_payment_error?.code
          },
          timestamp: new Date().toISOString()
        }));
        break;
        
      case 'charge.dispute.created':
        await processChargeback(event.data.object.payment_intent);
        break;
        
      default:
        console.log(JSON.stringify({
          level: 'info',
          message: 'Unhandled webhook event type',
          data: { type: event.type },
          timestamp: new Date().toISOString()
        }));
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message 
    });
  }
}

module.exports = handler;
module.exports.config = config;