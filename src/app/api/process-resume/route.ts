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

// Process resume with Claude and generate actual PDF
async function processResumeWithClaude(resumeContent: string, jobDescription: string, template: string) {
  const prompt = `You are an expert resume writer and ATS optimization specialist. Analyze the provided resume and job description, then create an optimized resume that will pass ATS systems and appeal to hiring managers.

IMPORTANT: Return your response as a properly formatted resume with clear sections. Use this EXACT structure:

${resumeContent.slice(0, 100)}...

PERSONAL INFORMATION:
[Extract and clean up: Name, Email, Phone, Location, LinkedIn]

PROFESSIONAL SUMMARY:
[Write 3-4 sentences highlighting key qualifications that match the job]

WORK EXPERIENCE:
[List positions in reverse chronological order with quantified achievements]

EDUCATION:
[Degrees, certifications, relevant coursework]

SKILLS:
[Technical and soft skills relevant to the target role]

ORIGINAL RESUME:
${resumeContent}

JOB DESCRIPTION:
${jobDescription}

Create a professional, ATS-optimized resume following the exact format above.`;

  if (!anthropic) throw new Error('Anthropic client not initialized');
  
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }]
  });

  return response.content[0]?.text || '';
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
    const { email, resumeContent, jobDescription, fileName, template, isFirstTimeFlow } = body;

    // Validate required fields
    if (!email || !resumeContent || !jobDescription || !fileName || !template) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if this is a first-time free request
    if (isFirstTimeFlow && template === 'ats-optimized') {
      try {
        // Process with Claude
        const claudeResponse = await processResumeWithClaude(resumeContent, jobDescription, template);
        
        // Send email with PDF
        await sendResumeEmail(email, claudeResponse, template, fileName);

        return NextResponse.json({
          success: true,
          message: 'Resume processed and sent via email successfully!',
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Error processing resume:', error);
        return NextResponse.json(
          { success: false, message: 'Failed to process resume. Please try again.' },
          { status: 500 }
        );
      }
    } else {
      // Premium templates require payment
      return NextResponse.json({
        success: false,
        requires_payment: true,
        message: 'Premium templates require payment',
        payment_url: '/payment' // Implement Stripe integration
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