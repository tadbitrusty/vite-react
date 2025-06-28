import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import jsPDF from 'jspdf';
import { 
  uploadResumeFile, 
  createProcessingJob, 
  updateProcessingJobStatus, 
  storeIntelligenceData,
  uploadGeneratedPDF 
} from '@/lib/storage';

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

// Process PDF directly with Claude Vision (SERVERLESS COMPATIBLE)
async function processPDFWithClaudeVision(pdfBase64: string, jobDescription: string, template: string) {
  const templateInfo = getTemplatePromptEnhancements(template);
  
  console.log(`[CLAUDE_VISION_PDF] Processing PDF directly with Claude Vision`);
  console.log(`[CLAUDE_VISION_PDF] Template: ${template}, Job description length: ${jobDescription.length}`);
  
  const prompt = `You are a master resume writer specializing in ATS optimization. You are looking at a PDF resume document.

TEMPLATE TYPE: ${templateInfo.type}
TARGET AUDIENCE: ${templateInfo.target}
TEMPLATE GUIDANCE: ${templateInfo.guidance}

CRITICAL INSTRUCTIONS FOR DATA COLLECTION:
- NEVER CHANGE THE PERSON'S IDENTITY - Keep exact name, email, phone, and personal details
- EXTRACT EVERY WORD, SKILL, AND DETAIL - this data is valuable for market intelligence
- ONLY enhance and optimize the existing content from the original resume
- Use keywords from the job description naturally within EXISTING experience
- Keep ALL contact information EXACTLY as provided in the original resume
- Maintain professional formatting appropriate for ${templateInfo.type}
- Focus on relevant experience for this specific job using ONLY the person's actual background
- IMPORTANT: Return ONLY the final resume content, no explanatory text or instructions
- Do NOT include any sections that are empty or have no content
- If a section like CERTIFICATIONS has no content, omit it entirely
- PRESERVE THE PERSON'S ACTUAL IDENTITY AND CONTACT INFORMATION
- CAPTURE ALL SKILLS, TECHNOLOGIES, AND KEYWORDS - nothing should be lost

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

Read the PDF resume carefully and optimize for the above job description while preserving every detail for data collection purposes.

Return ONLY the clean, final resume content with no instructional text:`;

  if (!anthropic) throw new Error('Anthropic client not initialized');

  // Use the provided base64 string directly
  const base64PDF = pdfBase64;
  
  // Build content array with text and PDF
  const content: any[] = [
    {
      type: "text",
      text: prompt
    },
    {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: base64PDF
      }
    }
  ];

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022", 
    max_tokens: 4000,
    messages: [{ 
      role: "user", 
      content: content
    }]
  });

  const rawContent = response.content[0]?.text || '';
  return cleanResumeOutput(rawContent);
}


// Process resume with Claude using extracted text (FALLBACK)
async function processResumeWithClaude(resumeContent: string, jobDescription: string, template: string) {
  const templateInfo = getTemplatePromptEnhancements(template);
  
  console.log(`[CLAUDE] Processing extracted text, length: ${resumeContent.length}`);
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

ORIGINAL RESUME:
${resumeContent}

JOB DESCRIPTION:
${jobDescription}

Return ONLY the clean, final resume content with no instructional text:`;

  if (!anthropic) throw new Error('Anthropic client not initialized');

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022", 
    max_tokens: 4000,
    messages: [{ 
      role: "user", 
      content: prompt
    }]
  });

  const rawContent = response.content[0]?.text || '';
  return cleanResumeOutput(rawContent);
}

// Extract market intelligence data from resume content
function extractIntelligenceData(resumeContent: string, jobDescription: string): {
  extracted_skills: string[];
  job_titles: string[];
  companies: string[];
  technologies: string[];
  keywords: string[];
  experience_years?: number;
  education_level?: string;
  industry_sectors: string[];
  job_description_keywords: string[];
} {
  console.log('[INTELLIGENCE] Extracting market data from resume content...');
  
  const lines = resumeContent.split('\n');
  const skills: Set<string> = new Set();
  const jobTitles: Set<string> = new Set();
  const companies: Set<string> = new Set();
  const technologies: Set<string> = new Set();
  const keywords: Set<string> = new Set();
  const industrySectors: Set<string> = new Set();
  const jobDescKeywords: Set<string> = new Set();
  
  let educationLevel = '';
  let experienceYears = 0;
  
  // Extract skills from SKILLS section
  let inSkillsSection = false;
  let inExperienceSection = false;
  
  for (const line of lines) {
    const cleanLine = line.trim();
    
    if (cleanLine.includes('SKILLS:')) {
      inSkillsSection = true;
      inExperienceSection = false;
      continue;
    } else if (cleanLine.includes('EXPERIENCE:')) {
      inExperienceSection = true;
      inSkillsSection = false;
      continue;
    } else if (cleanLine.includes('EDUCATION:') || cleanLine.includes('CERTIFICATIONS:')) {
      inSkillsSection = false;
      inExperienceSection = false;
      
      // Extract education level
      if (cleanLine.includes('Bachelor') || cleanLine.includes("Bachelor's")) educationLevel = 'Bachelor';
      else if (cleanLine.includes('Master') || cleanLine.includes("Master's")) educationLevel = 'Master';
      else if (cleanLine.includes('PhD') || cleanLine.includes('Doctorate')) educationLevel = 'PhD';
      else if (cleanLine.includes('Associate')) educationLevel = 'Associate';
      continue;
    }
    
    if (inSkillsSection && cleanLine) {
      // Parse skills - look for common patterns
      const skillPatterns = cleanLine.split(/[,;•·]/).map(s => s.trim()).filter(s => s.length > 2);
      skillPatterns.forEach(skill => {
        skills.add(skill);
        keywords.add(skill.toLowerCase());
        
        // Categorize as technology if it matches common tech patterns
        if (skill.match(/^[A-Z][a-z]*(?:\.[a-z]+)*$/) || // JavaScript, Node.js
            skill.match(/^[A-Z]+$/) || // SQL, AWS, API
            skill.toLowerCase().includes('script') ||
            skill.toLowerCase().includes('framework') ||
            skill.toLowerCase().includes('database')) {
          technologies.add(skill);
        }
      });
    }
    
    if (inExperienceSection && cleanLine) {
      // Extract job titles and companies
      if (cleanLine.includes(' - ') && !cleanLine.startsWith('•')) {
        const parts = cleanLine.split(' - ');
        if (parts.length >= 2) {
          jobTitles.add(parts[0].trim());
          companies.add(parts[1].trim());
        }
      }
      
      // Extract date ranges to calculate experience
      const dateMatch = cleanLine.match(/(\d{4})\s*-?\s*(\d{4}|Present|Current)/i);
      if (dateMatch) {
        const startYear = parseInt(dateMatch[1]);
        const endYear = dateMatch[2].toLowerCase().includes('present') || 
                       dateMatch[2].toLowerCase().includes('current') ? 
                       new Date().getFullYear() : parseInt(dateMatch[2]);
        if (!isNaN(startYear) && !isNaN(endYear)) {
          experienceYears += (endYear - startYear);
        }
      }
    }
    
    // Extract all meaningful words as keywords
    const words = cleanLine.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    words.forEach(word => {
      if (!['the', 'and', 'for', 'with', 'this', 'that', 'from', 'they', 'were', 'been', 'have', 'will'].includes(word)) {
        keywords.add(word);
      }
    });
  }
  
  // Extract keywords from job description
  const jobWords = jobDescription.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  jobWords.forEach(word => {
    if (!['the', 'and', 'for', 'with', 'this', 'that', 'from', 'they', 'were', 'been', 'have', 'will'].includes(word)) {
      jobDescKeywords.add(word);
    }
  });
  
  // Industry classification based on keywords
  const industryKeywords = {
    'technology': ['software', 'developer', 'engineer', 'programming', 'code', 'system', 'technical'],
    'finance': ['financial', 'banking', 'investment', 'accounting', 'trading', 'analyst'],
    'healthcare': ['medical', 'health', 'hospital', 'clinical', 'patient', 'care'],
    'marketing': ['marketing', 'brand', 'campaign', 'social', 'content', 'advertising'],
    'sales': ['sales', 'revenue', 'client', 'customer', 'business', 'relationship'],
    'operations': ['operations', 'logistics', 'supply', 'process', 'efficiency', 'management']
  };
  
  Object.entries(industryKeywords).forEach(([industry, keywordList]) => {
    if (keywordList.some(keyword => Array.from(keywords).includes(keyword))) {
      industrySectors.add(industry);
    }
  });
  
  const result = {
    extracted_skills: Array.from(skills).slice(0, 50), // Limit for storage
    job_titles: Array.from(jobTitles),
    companies: Array.from(companies),
    technologies: Array.from(technologies).slice(0, 30),
    keywords: Array.from(keywords).slice(0, 100),
    experience_years: experienceYears > 0 ? experienceYears : undefined,
    education_level: educationLevel || undefined,
    industry_sectors: Array.from(industrySectors),
    job_description_keywords: Array.from(jobDescKeywords).slice(0, 50)
  };
  
  console.log(`[INTELLIGENCE] Extracted: ${result.extracted_skills.length} skills, ${result.job_titles.length} job titles, ${result.companies.length} companies`);
  return result;
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

    console.log(`[STORAGE_PIPELINE] Starting complete data collection pipeline for ${email}`);
    console.log(`[STORAGE_PIPELINE] File: ${fileName}, Template: ${template}`);
    
    // STEP 1: Upload original file to Supabase Storage
    const fileObj = {
      name: fileName,
      type: resumeContent.startsWith('data:application/pdf') ? 'application/pdf' : 'text/plain',
      size: resumeContent.length
    } as File;
    
    const uploadResult = await uploadResumeFile(fileObj, email, resumeContent);
    if (!uploadResult.success || !uploadResult.fileRecord) {
      console.error('[STORAGE_PIPELINE] File upload failed:', uploadResult.error);
      return NextResponse.json({
        success: false,
        message: 'Failed to store resume file',
        error: uploadResult.error
      }, { status: 500 });
    }
    
    console.log(`[STORAGE_PIPELINE] File uploaded successfully: ${uploadResult.fileRecord.id}`);
    
    // STEP 2: Create processing job record
    const templateNames = {
      'ats-optimized': 'ATS Optimized',
      'entry-clean': 'Premium Classic',
      'tech-focus': 'Tech Focus',
      'professional-plus': 'Premium Plus',
      'executive-format': 'Executive Format'
    };
    
    const templateName = templateNames[template as keyof typeof templateNames] || 'ATS Optimized';
    
    const jobResult = await createProcessingJob(
      uploadResult.fileRecord.id,
      email,
      jobDescription,
      template,
      templateName
    );
    
    if (!jobResult.success || !jobResult.jobId) {
      console.error('[STORAGE_PIPELINE] Processing job creation failed:', jobResult.error);
      return NextResponse.json({
        success: false,
        message: 'Failed to create processing job',
        error: jobResult.error
      }, { status: 500 });
    }
    
    console.log(`[STORAGE_PIPELINE] Processing job created: ${jobResult.jobId}`);
    
    // STEP 3: Process file content for Claude
    let claudeProcessor: 'pdf_vision' | 'text' = 'text';
    let extractedText: string = resumeContent;
    let pdfBuffer: Buffer | null = null;
    let pdfBase64: string | null = null;
    
    // Update job status to processing
    await updateProcessingJobStatus(jobResult.jobId, 'processing');
    
    // Handle data URL format (data:application/pdf;base64,...)
    if (resumeContent.startsWith('data:application/pdf;base64,')) {
      console.log('[STORAGE_PIPELINE] Processing PDF with Claude Vision for 100% data capture...');
      try {
        // Extract base64 from data URL
        pdfBase64 = resumeContent.split(',')[1];
        
        // Validate base64 content before processing
        if (!pdfBase64 || pdfBase64.length < 100) {
          throw new Error(`Invalid PDF base64 data: length=${pdfBase64?.length || 0}`);
        }
        
        // Validate base64 format
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(pdfBase64)) {
          throw new Error('Invalid base64 format detected');
        }
        
        pdfBuffer = Buffer.from(pdfBase64, 'base64');
        
        // Validate PDF header (PDFs start with %PDF)
        const pdfHeader = pdfBuffer.toString('ascii', 0, 4);
        if (pdfHeader !== '%PDF') {
          throw new Error(`Invalid PDF format: header="${pdfHeader}" (expected "%PDF")`);
        }
        
        claudeProcessor = 'pdf_vision';
        
        console.log(`[STORAGE_PIPELINE] PDF validated and prepared for Claude Vision (size: ${pdfBuffer.length} bytes)`);
        console.log(`[STORAGE_PIPELINE] PDF header confirmed: ${pdfHeader}`);
        
      } catch (error) {
        console.error('[STORAGE_PIPELINE] PDF processing failed, falling back to text extraction:', error);
        // Fallback to text extraction
        try {
          const pdfParse = (await import('pdf-parse')).default;
          const pdfData = await pdfParse(Buffer.from(pdfBase64 || '', 'base64'));
          extractedText = pdfData.text;
          claudeProcessor = 'text';
          console.log(`[STORAGE_PIPELINE] Fallback text extraction: ${extractedText.length} characters`);
        } catch (textError) {
          console.error('[STORAGE_PIPELINE] Both PDF and text extraction failed:', textError);
          await updateProcessingJobStatus(jobResult.jobId, 'failed', 'PDF processing failed');
          return NextResponse.json({
            success: false,
            message: 'Failed to process PDF file. Please try uploading a different format.',
            error_type: 'PDF_PROCESSING_FAILED'
          }, { status: 400 });
        }
      }
    }
    // Handle other data URL formats (DOCX, TXT, etc.)
    else if (resumeContent.startsWith('data:')) {
      console.log('[STORAGE_PIPELINE] Processing non-PDF file...');
      try {
        const base64Content = resumeContent.split(',')[1];
        const textContent = Buffer.from(base64Content, 'base64').toString('utf-8');
        extractedText = textContent;
        claudeProcessor = 'text';
        console.log(`[STORAGE_PIPELINE] Text extracted: ${extractedText.length} characters`);
      } catch (error) {
        console.error('[STORAGE_PIPELINE] Text extraction failed:', error);
        extractedText = resumeContent; // Use as-is
      }
    }

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
        await updateProcessingJobStatus(jobResult.jobId, 'failed', 'User not eligible for free service');
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
        // STEP 4: Process with Claude PDF Vision or text extraction
        console.log(`[STORAGE_PIPELINE] Processing with Claude ${claudeProcessor}...`);
        const claudeResponse = claudeProcessor === 'pdf_vision' && pdfBase64
          ? await processPDFWithClaudeVision(pdfBase64, jobDescription, template)
          : await processResumeWithClaude(extractedText, jobDescription, template);
        
        // STEP 5: Extract market intelligence data
        console.log(`[STORAGE_PIPELINE] Extracting market intelligence data...`);
        const intelligenceData = extractIntelligenceData(claudeResponse, jobDescription);
        
        // STEP 6: Generate and store PDF
        console.log(`[STORAGE_PIPELINE] Generating and storing PDF...`);
        const pdfBuffer = generateActualPDF(claudeResponse, template);
        const pdfUploadResult = await uploadGeneratedPDF(pdfBuffer, fileName, email);
        
        // STEP 7: Store complete intelligence data in database
        // For PDFs: Don't store binary original_text (causes Unicode errors)
        // For text files: Store the extracted text for reference
        const originalTextForStorage = claudeProcessor === 'pdf_vision' 
          ? null  // PDF processed visually - no text extraction
          : extractedText;  // Text files - store extracted content
          
        // Clean Claude response and intelligence data for Unicode issues
        const cleanedClaudeResponse = claudeResponse.replace(/\u0000/g, '');
        const cleanedIntelligenceData = {
          ...intelligenceData,
          extracted_skills: intelligenceData.extracted_skills.map(skill => skill.replace(/\u0000/g, '')),
          keywords: intelligenceData.keywords.map(keyword => keyword.replace(/\u0000/g, '')),
          job_titles: intelligenceData.job_titles.map(title => title.replace(/\u0000/g, '')),
          companies: intelligenceData.companies.map(company => company.replace(/\u0000/g, '')),
          technologies: intelligenceData.technologies.map(tech => tech.replace(/\u0000/g, '')),
          industry_sectors: intelligenceData.industry_sectors.map(sector => sector.replace(/\u0000/g, '')),
          job_description_keywords: intelligenceData.job_description_keywords.map(keyword => keyword.replace(/\u0000/g, ''))
        };
        
        const intelligenceResult = await storeIntelligenceData(jobResult.jobId, email, {
          original_text: originalTextForStorage,
          optimized_resume_text: cleanedClaudeResponse,
          optimized_pdf_path: pdfUploadResult.filePath || undefined,
          ...cleanedIntelligenceData
        });
        
        if (!intelligenceResult.success) {
          console.warn('[STORAGE_PIPELINE] Intelligence data storage failed:', intelligenceResult.error);
        }
        
        // STEP 8: Send email with PDF
        console.log(`[STORAGE_PIPELINE] Sending email notification...`);
        await sendResumeEmail(email, claudeResponse, template, fileName);

        // STEP 9: Mark processing job as completed
        await updateProcessingJobStatus(jobResult.jobId, 'completed', undefined, {
          claude_processor: claudeProcessor,
          intelligence_extracted: intelligenceResult.success,
          pdf_generated: pdfUploadResult.success,
          total_keywords: intelligenceData.keywords.length,
          skills_count: intelligenceData.extracted_skills.length
        });

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

        console.log(`[STORAGE_PIPELINE] Complete pipeline finished successfully for ${email}`);
        
        return NextResponse.json({
          success: true,
          message: 'Resume processed and sent via email successfully!',
          session: {
            accountType: session.accountType,
            freeResumesUsed: session.freeResumesUsed + 1,
            whitelistStatus: session.whitelistStatus
          },
          processing_job_id: jobResult.jobId,
          intelligence_data: intelligenceResult.success,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('[STORAGE_PIPELINE] Error processing free template:', error);
        await updateProcessingJobStatus(jobResult.jobId, 'failed', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
          { success: false, message: 'Failed to process resume. Please try again.' },
          { status: 500 }
        );
      }
    } else if (isPostPayment || eligibility.canUseFree || eligibility.privilegeLevel?.premium_access) {
      // Premium templates - process if payment verified, user has free eligibility, or premium access privilege
      console.log(`[STORAGE_PIPELINE] Processing premium template for ${email} - Post-payment: ${isPostPayment}`);
      
      try {
        // STEP 4: Process with Claude PDF Vision or text extraction
        console.log(`[STORAGE_PIPELINE] Processing with Claude ${claudeProcessor}...`);
        const claudeResponse = claudeProcessor === 'pdf_vision' && pdfBase64
          ? await processPDFWithClaudeVision(pdfBase64, jobDescription, template)
          : await processResumeWithClaude(extractedText, jobDescription, template);
        
        // STEP 5: Extract market intelligence data
        console.log(`[STORAGE_PIPELINE] Extracting market intelligence data...`);
        const intelligenceData = extractIntelligenceData(claudeResponse, jobDescription);
        
        // STEP 6: Generate and store PDF
        console.log(`[STORAGE_PIPELINE] Generating and storing PDF...`);
        const pdfBuffer = generateActualPDF(claudeResponse, template);
        const pdfUploadResult = await uploadGeneratedPDF(pdfBuffer, fileName, email);
        
        // STEP 7: Store complete intelligence data in database
        // For PDFs: Don't store binary original_text (causes Unicode errors)
        // For text files: Store the extracted text for reference
        const originalTextForStorage = claudeProcessor === 'pdf_vision' 
          ? null  // PDF processed visually - no text extraction
          : extractedText;  // Text files - store extracted content
          
        // Clean Claude response and intelligence data for Unicode issues
        const cleanedClaudeResponse = claudeResponse.replace(/\u0000/g, '');
        const cleanedIntelligenceData = {
          ...intelligenceData,
          extracted_skills: intelligenceData.extracted_skills.map(skill => skill.replace(/\u0000/g, '')),
          keywords: intelligenceData.keywords.map(keyword => keyword.replace(/\u0000/g, '')),
          job_titles: intelligenceData.job_titles.map(title => title.replace(/\u0000/g, '')),
          companies: intelligenceData.companies.map(company => company.replace(/\u0000/g, '')),
          technologies: intelligenceData.technologies.map(tech => tech.replace(/\u0000/g, '')),
          industry_sectors: intelligenceData.industry_sectors.map(sector => sector.replace(/\u0000/g, '')),
          job_description_keywords: intelligenceData.job_description_keywords.map(keyword => keyword.replace(/\u0000/g, ''))
        };
        
        const intelligenceResult = await storeIntelligenceData(jobResult.jobId, email, {
          original_text: originalTextForStorage,
          optimized_resume_text: cleanedClaudeResponse,
          optimized_pdf_path: pdfUploadResult.filePath || undefined,
          ...cleanedIntelligenceData
        });
        
        if (!intelligenceResult.success) {
          console.warn('[STORAGE_PIPELINE] Intelligence data storage failed:', intelligenceResult.error);
        }
        
        // STEP 8: Send email with PDF
        console.log(`[STORAGE_PIPELINE] Sending email notification...`);
        await sendResumeEmail(email, claudeResponse, template, fileName);

        // STEP 9: Mark processing job as completed
        await updateProcessingJobStatus(jobResult.jobId, 'completed', undefined, {
          claude_processor: claudeProcessor,
          intelligence_extracted: intelligenceResult.success,
          pdf_generated: pdfUploadResult.success,
          total_keywords: intelligenceData.keywords.length,
          skills_count: intelligenceData.extracted_skills.length,
          premium_template: true
        });

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
        
        console.log(`[STORAGE_PIPELINE] Premium template pipeline completed for ${email} - ${templateInfo} (${accessReason})`);

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