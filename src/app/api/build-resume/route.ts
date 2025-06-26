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

// Resume Builder Pricing
const RESUME_BUILDER_PRICING = {
  BASIC: {
    price: 45,
    stripePrice: 'price_1RdahQK2tmo6HKYKhHAwxQce',
    name: 'Basic Resume Builder',
    description: 'Professional resume built from your information'
  },
  ENHANCED: {
    price: 75,
    stripePrice: 'price_1RdaiAK2tmo6HKYKZUt5ZN0U',
    name: 'AI-Enhanced Resume Builder',
    description: 'AI-optimized resume with enhanced content and formatting'
  }
};

// Build resume from form data using Claude
async function buildResumeWithClaude(resumeData: any, tier: string) {
  const { personalInfo, summary, experience, education, skills } = resumeData;
  
  const enhancedPrompt = tier === 'ENHANCED' ? 
    'Create an AI-enhanced, compelling professional resume with optimized language, quantified achievements, and ATS-friendly keywords.' :
    'Create a clean, professional resume with proper formatting and structure.';

  const prompt = `${enhancedPrompt}

Create a professional resume using the following information:

PERSONAL INFORMATION:
Name: ${personalInfo.fullName}
Email: ${personalInfo.email}
Phone: ${personalInfo.phone}
Location: ${personalInfo.location}
${personalInfo.linkedin ? `LinkedIn: ${personalInfo.linkedin}` : ''}
${personalInfo.github ? `GitHub: ${personalInfo.github}` : ''}

PROFESSIONAL SUMMARY:
${summary}

WORK EXPERIENCE:
${experience.map((exp: any, index: number) => `
Position ${index + 1}:
Company: ${exp.company}
Title: ${exp.title}
Location: ${exp.location || 'Not specified'}
Duration: ${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}
Description: ${exp.description}
`).join('\n')}

EDUCATION:
${education.map((edu: any, index: number) => `
Education ${index + 1}:
School: ${edu.school}
Degree: ${edu.degree}
Location: ${edu.location || 'Not specified'}
Graduation: ${edu.graduationDate}
${edu.gpa ? `GPA: ${edu.gpa}` : ''}
`).join('\n')}

SKILLS:
${Array.isArray(skills) ? skills.join(', ') : skills}

Format this as a professional resume with proper sections and structure. ${tier === 'ENHANCED' ? 'Use compelling language, add relevant keywords, and optimize for ATS systems.' : 'Keep formatting clean and professional.'}`;

  if (!anthropic) throw new Error('Anthropic client not initialized');
  
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }]
  });

  return response.content[0]?.text || '';
}

// Generate PDF (same function as process-resume)
function generateActualPDF(resumeContent: string, tier: string): Buffer {
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
      `Resume built by Resume Vita - ${new Date().toLocaleDateString()} | Page ${i} of ${totalPages}`,
      margin,
      doc.internal.pageSize.height - 10
    );
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}

// Send resume email
async function sendBuilderResumeEmail(
  email: string, 
  resumeContent: string, 
  tier: string,
  personalInfo: any
) {
  const tierInfo = RESUME_BUILDER_PRICING[tier as keyof typeof RESUME_BUILDER_PRICING];
  
  // Generate actual PDF
  const pdfBuffer = generateActualPDF(resumeContent, tier);
  const pdfFileName = `${personalInfo.fullName.replace(/\s+/g, '_')}_Resume_${tier}.pdf`;

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a90a4;">Your ${tierInfo.name} is Ready!</h2>
      
      <p>Hi ${personalInfo.fullName},</p>
      
      <p>Your professional resume has been successfully created and is ready for download. This resume was built using our ${tierInfo.name} service.</p>
      
      <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4a90a4;">
        <h3 style="margin-top: 0; color: #4a90a4;">${tierInfo.name} - $${tierInfo.price}</h3>
        <p><strong>✅ What's Included:</strong></p>
        <ul>
          <li>Professional resume formatting</li>
          <li>Clean, modern design</li>
          <li>ATS-friendly structure</li>
          ${tier === 'ENHANCED' ? '<li>AI-enhanced content optimization</li><li>Keyword optimization for your field</li>' : ''}
        </ul>
      </div>
      
      <div style="background: #e8f4fd; padding: 20px; border: 2px solid #4a90a4; border-radius: 8px; text-align: center;">
        <h4 style="color: #4a90a4; margin-top: 0;">📎 Your Resume PDF is Attached</h4>
        <p style="font-size: 16px; color: #333; margin-bottom: 15px;">
          <strong>${pdfFileName}</strong>
        </p>
        <p style="font-size: 14px; color: #666;">
          Professional resume ready for job applications.
        </p>
      </div>
      
      <div style="margin: 20px 0;">
        <p><strong>Next Steps:</strong></p>
        <ol>
          <li><strong>Download your resume</strong> - Click the attachment above</li>
          <li><strong>Review and customize</strong> - Make any final personal touches</li>
          <li><strong>Start applying</strong> - Your professional resume is ready</li>
        </ol>
      </div>

      <div style="background: #fff3cd; padding: 20px; border: 1px solid #ffeaa7; border-radius: 8px; margin: 20px 0;">
        <h4 style="color: #d68910; margin-top: 0;">🎯 Need Resume Optimization?</h4>
        <p>Have an existing resume? Try our Resume Optimizer to get it tailored for specific job postings. Upload your resume + job description for ATS optimization.</p>
      </div>
      
      <p style="margin-top: 30px;">Questions? Reply to this email and we'll help you out.</p>
      
      <p><strong>Best of luck with your job search!</strong><br>
      The Resume Vita Team</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
      <p style="font-size: 12px; color: #888; text-align: center;">
        Resume created using professional templates and ${tier === 'ENHANCED' ? 'AI enhancement' : 'clean formatting'}.<br>
        Always customize your resume for each application.
      </p>
    </div>
  `;

  if (!resend) throw new Error('Resend client not initialized');
  
  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: email,
    subject: `Your ${tierInfo.name} is Ready - Resume Vita`,
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
    const { personalInfo, summary, experience, education, skills, tier } = body;

    // Validate required fields
    if (!personalInfo?.fullName || !personalInfo?.email || !tier) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields (name, email, tier)' },
        { status: 400 }
      );
    }

    // Validate tier
    if (!RESUME_BUILDER_PRICING[tier as keyof typeof RESUME_BUILDER_PRICING]) {
      return NextResponse.json(
        { success: false, message: 'Invalid pricing tier' },
        { status: 400 }
      );
    }

    const tierInfo = RESUME_BUILDER_PRICING[tier as keyof typeof RESUME_BUILDER_PRICING];

    // Check user eligibility and track usage
    const trackingResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/user-tracking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
        'user-agent': request.headers.get('user-agent') || '',
        'referer': request.headers.get('referer') || ''
      },
      body: JSON.stringify({
        email: personalInfo.email,
        fullName: personalInfo.fullName,
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

    const { session } = trackingResult;

    // Resume Builder is a paid service, but check for admin/beta privileges
    if (session.accountType === 'admin' || session.accountType === 'beta') {
      // Admin and beta users get free access
      try {
        // Build resume with Claude
        const resumeContent = await buildResumeWithClaude({ personalInfo, summary, experience, education, skills }, tier);
        
        // Send email with PDF
        await sendBuilderResumeEmail(personalInfo.email, resumeContent, tier, personalInfo);

        // Record usage
        await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/user-tracking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
            'user-agent': request.headers.get('user-agent') || ''
          },
          body: JSON.stringify({
            email: personalInfo.email,
            action: 'record_usage'
          })
        });

        return NextResponse.json({
          success: true,
          message: `${tierInfo.name} created and sent via email successfully! (Complimentary ${session.accountType} access)`,
          amount: 0, // Free for admin/beta
          tier: tierInfo.name,
          session: {
            accountType: session.accountType,
            whitelistStatus: session.whitelistStatus
          },
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Error building resume:', error);
        return NextResponse.json(
          { success: false, message: 'Failed to build resume. Please try again.' },
          { status: 500 }
        );
      }
    } else {
      // Regular users need to pay - in production this would integrate with Stripe
      // For development, we'll process directly but show payment would be required
      try {
        // Build resume with Claude
        const resumeContent = await buildResumeWithClaude({ personalInfo, summary, experience, education, skills }, tier);
        
        // Send email with PDF
        await sendBuilderResumeEmail(personalInfo.email, resumeContent, tier, personalInfo);

        // Record usage
        await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/user-tracking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
            'user-agent': request.headers.get('user-agent') || ''
          },
          body: JSON.stringify({
            email: personalInfo.email,
            action: 'record_usage'
          })
        });

        return NextResponse.json({
          success: true,
          message: `${tierInfo.name} created and sent via email successfully!`,
          amount: tierInfo.price,
          tier: tierInfo.name,
          session: {
            accountType: session.accountType,
            whitelistStatus: session.whitelistStatus
          },
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Error building resume:', error);
        return NextResponse.json(
          { success: false, message: 'Failed to build resume. Please try again.' },
          { status: 500 }
        );
      }
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to return pricing information
export async function GET() {
  return NextResponse.json({
    success: true,
    pricing: RESUME_BUILDER_PRICING
  });
}