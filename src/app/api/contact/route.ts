import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend (conditionally for build safety)
let resend: any | null = null;

function initializeResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
}

// Rate limiting storage (in production, use Redis or database)
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5; // 5 requests per 15 minutes

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const requests = rateLimitMap.get(ip)!;
  
  // Remove requests outside the time window
  const validRequests = requests.filter(time => now - time < windowMs);
  rateLimitMap.set(ip, validRequests);

  return validRequests.length >= maxRequests;
}

function addRequest(ip: string) {
  const now = Date.now();
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }
  rateLimitMap.get(ip)!.push(now);
}

export async function POST(request: NextRequest) {
  try {
    // Initialize Resend
    initializeResend();

    if (!resend) {
      return NextResponse.json(
        { success: false, message: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Check rate limiting
    if (isRateLimited(clientIP)) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, email, subject, message, type = 'general' } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Validate message length
    if (message.length < 10 || message.length > 2000) {
      return NextResponse.json(
        { success: false, message: 'Message must be between 10 and 2000 characters' },
        { status: 400 }
      );
    }

    // Determine email template based on type
    const getEmailTemplate = (contactType: string) => {
      const templates = {
        general: {
          adminSubject: `[Resume Vita] General Inquiry from ${name}`,
          userSubject: 'Thank you for contacting Resume Vita',
          priority: 'normal'
        },
        support: {
          adminSubject: `[Resume Vita] Support Request from ${name}`,
          userSubject: 'Resume Vita Support - We received your request',
          priority: 'high'
        },
        feedback: {
          adminSubject: `[Resume Vita] Feedback from ${name}`,
          userSubject: 'Thank you for your feedback - Resume Vita',
          priority: 'normal'
        },
        partnership: {
          adminSubject: `[Resume Vita] Partnership Inquiry from ${name}`,
          userSubject: 'Resume Vita Partnership Inquiry - Thank you',
          priority: 'high'
        }
      };
      return templates[contactType as keyof typeof templates] || templates.general;
    };

    const template = getEmailTemplate(type);

    // HTML email content for admin notification
    const adminEmailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4a90a4, #5ba0b5); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #4a90a4; }
            .value { margin-top: 5px; padding: 10px; background: white; border-radius: 4px; border-left: 4px solid #4a90a4; }
            .metadata { background: #e9ecef; padding: 15px; border-radius: 4px; margin-top: 20px; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>New Contact Form Submission</h2>
              <p>Resume Vita Contact System</p>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Contact Type:</div>
                <div class="value">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
              </div>
              
              <div class="field">
                <div class="label">Name:</div>
                <div class="value">${name}</div>
              </div>
              
              <div class="field">
                <div class="label">Email:</div>
                <div class="value">${email}</div>
              </div>
              
              <div class="field">
                <div class="label">Subject:</div>
                <div class="value">${subject}</div>
              </div>
              
              <div class="field">
                <div class="label">Message:</div>
                <div class="value">${message.replace(/\n/g, '<br>')}</div>
              </div>
              
              <div class="metadata">
                <strong>Submission Details:</strong><br>
                Time: ${new Date().toISOString()}<br>
                IP: ${clientIP}<br>
                User Agent: ${request.headers.get('user-agent') || 'Unknown'}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // HTML email content for user confirmation
    const userEmailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4a90a4, #5ba0b5); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #4a90a4, #5ba0b5); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Resume Vita</div>
              <p>Thank you for contacting us!</p>
            </div>
            <div class="content">
              <p>Hi <strong>${name}</strong>,</p>
              
              <p>We've received your message regarding "<strong>${subject}</strong>" and appreciate you taking the time to reach out.</p>
              
              <p>Our team typically responds within 24-48 hours during business days. For urgent support issues, we prioritize responses and aim to get back to you within a few hours.</p>
              
              <p>While you wait, feel free to:</p>
              <ul>
                <li><a href="${process.env.NEXT_PUBLIC_APP_URL}">Try our free resume optimization</a></li>
                <li><a href="${process.env.NEXT_PUBLIC_APP_URL}/story">Learn more about our story</a></li>
                <li><a href="${process.env.NEXT_PUBLIC_APP_URL}/roadmap">Check out our product roadmap</a></li>
              </ul>
              
              <a href="${process.env.NEXT_PUBLIC_APP_URL}" class="cta-button">Visit Resume Vita</a>
              
              <p>Thank you for being part of the Resume Vita community!</p>
              
              <p>Best regards,<br>
              <strong>The Resume Vita Team</strong></p>
              
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
              <p style="font-size: 0.9em; color: #666;">
                This is an automated confirmation. Please do not reply to this email. 
                If you need to send additional information, please submit a new contact form.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email to admin
    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: process.env.ADMIN_EMAIL || process.env.FROM_EMAIL!,
      subject: template.adminSubject,
      html: adminEmailContent,
      headers: {
        'X-Priority': template.priority === 'high' ? '1' : '3',
        'X-Contact-Type': type,
        'X-Contact-IP': clientIP
      }
    });

    // Send confirmation email to user
    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: email,
      subject: template.userSubject,
      html: userEmailContent
    });

    // Add to rate limiting after successful send
    addRequest(clientIP);

    return NextResponse.json({
      success: true,
      message: 'Thank you for your message! We\'ll get back to you within 24-48 hours.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Contact form error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to send message. Please try again or contact us directly.' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint for status check
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Contact API is operational',
    rateLimit: '5 requests per 15 minutes',
    supportedTypes: ['general', 'support', 'feedback', 'partnership']
  });
}