import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import jsPDF from 'jspdf';

// Initialize services (conditionally for build safety)
let anthropic: Anthropic | null = null;
let resend: any | null = null;

function initializeServices() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
}

// Get template-specific guidance
function getTemplatePromptEnhancements(templateId: string) {
  const enhancements = {
    'ats-optimized': {
      type: 'ATS Optimized',
      target: 'Applicant Tracking Systems and HR professionals',
      guidance: 'Focus on keyword optimization and standard formatting. Use industry-standard section headers and bullet points.'
    },
    'entry-clean': {
      type: 'Premium Classic',
      target: 'Entry to mid-level professionals',
      guidance: 'Clean modern design with emphasis on education and early career achievements.'
    },
    'tech-focus': {
      type: 'Tech Focus',
      target: 'IT professionals and engineers',
      guidance: 'Highlight technical skills, projects, and quantifiable achievements. Include programming languages and technical certifications prominently.'
    },
    'professional-plus': {
      type: 'Premium Plus',
      target: 'Career growth and advancement',
      guidance: 'Showcase leadership experience and career progression. Emphasize management skills and strategic contributions.'
    },
    'executive-format': {
      type: 'Executive Format',
      target: 'Senior leadership and C-level positions',
      guidance: 'Emphasize strategic impact, board experience, and P&L responsibility. Focus on high-level achievements and industry influence.'
    }
  };
  
  return enhancements[templateId as keyof typeof enhancements] || enhancements['ats-optimized'];
}

// Truncate content to stay within token limits
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  
  // Try to truncate at word boundaries
  const truncated = content.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) { // If we find a space in the last 20%
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

// Process resume with Claude using direct file input
async function processResumeWithClaude(resumeFileBase64: string, jobDescription: string, template: string) {
  const templateInfo = getTemplatePromptEnhancements(template);
  
  console.log(`[CLAUDE] Processing file directly with Claude`);
  console.log(`[CLAUDE] Template: ${template}, Job description length: ${jobDescription.length}`);
  
  const prompt = `You are a master resume writer specializing in ATS optimization.

TEMPLATE TYPE: ${templateInfo.type}
TARGET AUDIENCE: ${templateInfo.target}
TEMPLATE GUIDANCE: ${templateInfo.guidance}

CRITICAL INSTRUCTIONS:
- NEVER CHANGE THE PERSON'S IDENTITY - Keep exact name, email, phone, and personal details
- Do NOT lie, fabricate, or over-embellish any information  
- ONLY enhance and optimize the existing content from the original resume
- Use keywords from the job description naturally within EXISTING experience
- Keep ALL contact information EXACTLY as provided in the original resume
- Maintain professional formatting appropriate for ${templateInfo.type}
- Focus on relevant experience for this specific job using ONLY the person's actual background
- IMPORTANT: Return ONLY the final resume content, no explanatory text or instructions
- Do NOT include any sections that are empty or have no content
- If a section like CERTIFICATIONS has no content, omit it entirely
- PRESERVE THE PERSON'S ACTUAL IDENTITY AND CONTACT INFORMATION

Return the structured resume content in the following format:

PERSONAL INFO:
Name: [MUST be EXACTLY as shown in original resume]
Email: [MUST be EXACTLY as shown in original resume]  
Phone: [MUST be EXACTLY as shown in original resume]
Location: [MUST be EXACTLY as shown in original resume]
LinkedIn: [MUST be EXACTLY as shown in original resume if available]

SUMMARY:
[2-3 sentence professional summary tailored to the job using ONLY the person's actual background]

EXPERIENCE:
[Format each job EXACTLY as shown in original resume, only enhance bullet points with keywords:]
Job Title - Company Name [MUST match original]
Date Range [MUST match original]
• [Enhanced bullet point using existing responsibilities + job keywords]
• [Enhanced bullet point using existing accomplishments + job keywords]
• [Enhanced bullet point using existing skills + job keywords]

EDUCATION:
[MUST match original resume exactly:]
Degree - Institution Name [EXACTLY as shown in original]
Date Range [EXACTLY as shown in original]
[Any details EXACTLY as shown in original]

SKILLS:
[Use ONLY skills from original resume, enhanced with job-relevant keywords]

CERTIFICATIONS:
[Only include this section if certifications exist in the original resume]

JOB DESCRIPTION:
${jobDescription}

Please read the attached resume file and optimize it for the above job description while following all the identity preservation rules.

Return ONLY the clean, final resume content with no instructional text:`;

  if (!anthropic) throw new Error('Anthropic client not initialized');
  
  // Parse the base64 data URL to get the actual base64 content
  const base64Data = resumeFileBase64.split(',')[1];
  const mimeType = resumeFileBase64.split(';')[0].split(':')[1];
  
  console.log(`[CLAUDE] Sending file to Claude - MIME type: ${mimeType}, Base64 size: ${base64Data.length}`);
  
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022", 
    max_tokens: 4000,
    messages: [{ 
      role: "user", 
      content: [
        {
          type: "text",
          text: prompt
        },
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType as any,
            data: base64Data
          }
        }
      ]
    }]
  });

  const rawContent = response.content[0]?.text || '';
  return cleanResumeOutput(rawContent);
}

// Clean up Claude output to ensure professional final PDF
function cleanResumeOutput(content: string): string {
  let cleaned = content;
  
  // Remove any instructional text that might leak through
  const instructionalPatterns = [
    /^.*based on the provided resume.*$/gim,
    /^.*following the format.*$/gim,
    /^.*here is the.*$/gim,
    /^.*structured resume.*$/gim,
    /^\[.*\]$/gm, // Remove any bracketed instructions
  ];
  
  instructionalPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Remove empty sections
  const emptySectionPatterns = [
    /CERTIFICATIONS:\s*\[.*none.*\]/gim,
    /CERTIFICATIONS:\s*$/gim,
    /CERTIFICATIONS:\s*\n\s*$/gim,
    /^[A-Z\s]+:\s*\[.*not specified.*\]/gim,
    /^[A-Z\s]+:\s*\[.*none.*\]/gim,
    /^[A-Z\s]+:\s*N\/A\s*$/gim,
  ];
  
  emptySectionPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Clean up multiple blank lines
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

// Generate actual PDF using jsPDF
function generateActualPDF(resumeContent: string, template: string): Buffer {
  const doc = new jsPDF();
  
  // Set up document
  doc.setFontSize(12);
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  const lineHeight = 6;
  let yPosition = margin;
  
  // Split content into lines and add to PDF
  const lines = resumeContent.split('\n');
  
  for (const line of lines) {
    // Check if we need a new page
    if (yPosition > doc.internal.pageSize.height - margin) {
      doc.addPage();
      yPosition = margin;
    }
    
    const trimmedLine = line.trim();
    
    // Handle section headers (make them bold and larger)
    if (trimmedLine.match(/^(PERSONAL INFORMATION|PROFESSIONAL SUMMARY|WORK EXPERIENCE|EDUCATION|SKILLS|CERTIFICATIONS):/)) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(trimmedLine, margin, yPosition);
      yPosition += lineHeight + 2;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
    } 
    // Handle regular content
    else if (trimmedLine) {
      // Wrap long lines
      const splitText = doc.splitTextToSize(trimmedLine, pageWidth - 2 * margin);
      doc.text(splitText, margin, yPosition);
      yPosition += lineHeight * splitText.length;
    } 
    // Handle empty lines
    else {
      yPosition += lineHeight / 2;
    }
  }
  
  // Add footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Resume optimized by Resume Vita - ${new Date().toLocaleDateString()} | Page ${i} of ${totalPages}`,
      margin,
      doc.internal.pageSize.height - 10
    );
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}

// Send resume email with actual PDF
async function sendResumeEmail(
  email: string, 
  resumeContent: string, 
  template: string, 
  fileName: string
) {
  const templateNames = {
    'ats-optimized': 'ATS Optimized',
    'entry-clean': 'Premium Classic',
    'tech-focus': 'Tech Focus',
    'professional-plus': 'Premium Plus',
    'executive-format': 'Executive Format'
  };

  const templateName = templateNames[template as keyof typeof templateNames] || 'ATS Optimized';
  const isFreeTier = template === 'ats-optimized';
  
  // Generate actual PDF
  const pdfBuffer = generateActualPDF(resumeContent, template);
  const pdfFileName = `${fileName.replace(/\.[^/.]+$/, '')}_${template}.pdf`;

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a90a4;">Your ${templateName} Resume is Ready!</h2>
      
      <p>Hi there,</p>
      
      <p>Your ${isFreeTier ? 'FREE' : 'premium'} resume has been processed and optimized for ATS systems. This resume has been specifically tailored to improve your chances with Applicant Tracking Systems.</p>
      
      <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4a90a4;">
        <h3 style="margin-top: 0; color: #4a90a4;">Template: ${templateName} ${isFreeTier ? '(FREE)' : ''}</h3>
        <p><strong>✅ Optimizations Applied:</strong></p>
        <ul>
          <li>ATS-friendly formatting and keywords</li>
          <li>Improved readability and structure</li>
          <li>Job-specific content optimization</li>
          <li>Professional layout and styling</li>
        </ul>
      </div>
      
      <div style="background: #e8f4fd; padding: 20px; border: 2px solid #4a90a4; border-radius: 8px; text-align: center;">
        <h4 style="color: #4a90a4; margin-top: 0;">📎 Your Resume PDF is Attached</h4>
        <p style="font-size: 16px; color: #333; margin-bottom: 15px;">
          <strong>${pdfFileName}</strong>
        </p>
        <p style="font-size: 14px; color: #666;">
          This PDF is professionally formatted and ready for job applications.
        </p>
      </div>
      
      <div style="margin: 20px 0;">
        <p><strong>How to Use Your Resume:</strong></p>
        <ol>
          <li><strong>Download the attached PDF</strong> - Ready for immediate use</li>
          <li><strong>Review and customize</strong> - Make any final personal adjustments</li>
          <li><strong>Apply with confidence</strong> - Your resume is now ATS-optimized</li>
        </ol>
      </div>

      ${isFreeTier ? `
      <div style="background: #fff3cd; padding: 20px; border: 1px solid #ffeaa7; border-radius: 8px; margin: 20px 0;">
        <h4 style="color: #d68910; margin-top: 0;">🌟 Want Premium Templates?</h4>
        <p>This was your FREE ATS Optimized resume. Return to Resume Vita as a "Returning User" to access premium templates with enhanced styling and specialized formatting for $5.99-$9.99.</p>
      </div>
      ` : ''}
      
      <p style="margin-top: 30px;">Questions? Reply to this email and we'll help you out.</p>
      
      <p><strong>Best of luck with your job search!</strong><br>
      The Resume Vita Team</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
      <p style="font-size: 12px; color: #888; text-align: center;">
        Resume generated using AI optimization technology designed for ATS compatibility.<br>
        Always review and personalize your resume before submitting applications.
      </p>
    </div>
  `;

  if (!resend) throw new Error('Resend client not initialized');
  
  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
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

export async function POST(request: NextRequest) {
  try {
    // Initialize services
    initializeServices();
    
    const body = await request.json();
    const { email, resumeContent, jobDescription, fileName, template, isFirstTimeFlow, paymentSessionId, skipPaymentCheck } = body;

    // Validate required fields
    if (!email || !resumeContent || !jobDescription || !fileName || !template) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`[PROCESS_RESUME] Processing file upload - MIME type: ${resumeContent.split(';')[0].split(':')[1]}`);
    console.log(`[PROCESS_RESUME] File data size: ${resumeContent.length} characters`);

    // Check user eligibility using tracking system
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    console.log(`[PROCESS_RESUME] Calling user tracking API: ${baseUrl}/api/user-tracking`);
    
    const trackingResponse = await fetch(`${baseUrl}/api/user-tracking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
        'user-agent': request.headers.get('user-agent') || '',
        'referer': request.headers.get('referer') || ''
      },
      body: JSON.stringify({
        email,
        action: 'check_eligibility'
      })
    });

    const trackingResult = await trackingResponse.json();

    if (!trackingResult.success) {
      return NextResponse.json(
        { success: false, message: 'Unable to verify user eligibility' },
        { status: 500 }
      );
    }

    const { session, eligibility } = trackingResult;

    // Check if this is a post-payment request
    const isPostPayment = skipPaymentCheck === true || paymentSessionId;
    
    console.log(`[PROCESS_RESUME] Processing request for ${email}`);
    console.log(`[PROCESS_RESUME] Template: ${template}, Free eligible: ${eligibility.canUseFree}, Post-payment: ${isPostPayment}`);
    console.log(`[PROCESS_RESUME] Account type: ${session.accountType}, Premium access: ${eligibility.privilegeLevel?.premium_access}`);

    // Check if user can use free service or if they have special privileges
    if (template === 'ats-optimized') {
      if (!eligibility.canUseFree) {
        return NextResponse.json({
          success: false,
          message: eligibility.reason || 'Free resume limit reached',
          session: {
            accountType: session.accountType,
            freeResumesUsed: session.freeResumesUsed,
            whitelistStatus: session.whitelistStatus
          }
        });
      }

      try {
        // Process with Claude  
        const claudeResponse = await processResumeWithClaude(resumeContent, jobDescription, template);
        
        // Send email with PDF
        await sendResumeEmail(email, claudeResponse, template, fileName);

        // Record usage in tracking system
        await fetch(`${baseUrl}/api/user-tracking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
            'user-agent': request.headers.get('user-agent') || ''
          },
          body: JSON.stringify({
            email,
            action: 'record_usage'
          })
        });

        return NextResponse.json({
          success: true,
          message: 'Resume processed and sent via email successfully!',
          session: {
            accountType: session.accountType,
            freeResumesUsed: session.freeResumesUsed + 1,
            whitelistStatus: session.whitelistStatus
          },
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Error processing resume:', error);
        return NextResponse.json(
          { success: false, message: 'Failed to process resume. Please try again.' },
          { status: 500 }
        );
      }
    } else if (isPostPayment || eligibility.canUseFree || eligibility.privilegeLevel?.premium_access) {
      // Premium templates - process if payment verified, user has free eligibility, or premium access privilege
      console.log(`[PROCESS_RESUME] Processing premium template for ${email} - Post-payment: ${isPostPayment}`);
      
      try {
        // Process with Claude  
        const claudeResponse = await processResumeWithClaude(resumeContent, jobDescription, template);
        
        // Send email with PDF
        await sendResumeEmail(email, claudeResponse, template, fileName);

        // Record usage in tracking system (don't increment for post-payment)
        if (!isPostPayment) {
          await fetch(`${baseUrl}/api/user-tracking`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
              'user-agent': request.headers.get('user-agent') || ''
            },
            body: JSON.stringify({
              email,
              action: 'record_usage'
            })
          });
        }

        const templateInfo = {
          'entry-clean': 'Premium Classic',
          'tech-focus': 'Tech Focus', 
          'professional-plus': 'Premium Plus',
          'executive-format': 'Executive Format'
        }[template] || 'Premium Template';

        const accessReason = isPostPayment ? 'Payment verified' : 
                            eligibility.privilegeLevel?.premium_access ? 'Premium access privilege' :
                            eligibility.canUseFree ? 'Free eligibility' : 'Unknown';
        
        console.log(`[PROCESS_RESUME] Premium resume generated successfully for ${email} - ${templateInfo} (${accessReason})`);

        return NextResponse.json({
          success: true,
          message: `Premium ${templateInfo} resume processed and sent via email successfully!`,
          session: {
            accountType: session.accountType,
            freeResumesUsed: session.freeResumesUsed,
            whitelistStatus: session.whitelistStatus
          },
          paymentVerified: isPostPayment,
          accessReason,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('[PROCESS_RESUME] Error processing premium resume:', error);
        return NextResponse.json(
          { success: false, message: 'Failed to process premium resume. Please contact support.' },
          { status: 500 }
        );
      }
    } else {
      // Premium templates - require payment
      const discountPercent = session.discountPercent || 0;
      const template_info = {
        'entry-clean': { name: 'Premium Classic', price: 5.99 },
        'tech-focus': { name: 'Tech Focus', price: 9.99 },
        'professional-plus': { name: 'Premium Plus', price: 7.99 },
        'executive-format': { name: 'Executive Format', price: 8.99 }
      }[template] || { name: 'Premium Template', price: 9.99 };

      const discountedPrice = discountPercent > 0 
        ? (template_info.price * (1 - discountPercent / 100)).toFixed(2)
        : template_info.price;

      // Create payment URL with all necessary parameters
      const paymentParams = new URLSearchParams({
        template,
        email,
        resumeData: Buffer.from(resumeContent).toString('base64'),
        jobDescription: Buffer.from(jobDescription).toString('base64')
      });

      return NextResponse.json({
        success: false,
        requires_payment: true,
        message: 'Premium templates require payment',
        template: template_info.name,
        originalPrice: template_info.price,
        discountedPrice: parseFloat(discountedPrice),
        discountPercent,
        session: {
          accountType: session.accountType,
          whitelistStatus: session.whitelistStatus
        },
        payment_url: `/payment?${paymentParams.toString()}`
      });
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}