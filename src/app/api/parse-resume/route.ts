import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client (conditionally for build safety)
let anthropic: Anthropic | null = null;

function initializeServices() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
}

// Parse resume text using Claude AI
async function parseResumeWithClaude(resumeText: string) {
  const prompt = `You are an expert resume parser. Extract structured data from the following resume text and return it in JSON format.

Please extract the following information and return as valid JSON:

{
  "personalInfo": {
    "fullName": "extracted full name",
    "email": "extracted email",
    "phone": "extracted phone",
    "location": "extracted location (city, state)",
    "linkedin": "extracted LinkedIn URL (if found)",
    "github": "extracted GitHub URL (if found)"
  },
  "summary": "extracted professional summary or objective",
  "experience": [
    {
      "company": "company name",
      "title": "job title",
      "location": "job location",
      "startDate": "start date (MM/YYYY format)",
      "endDate": "end date (MM/YYYY format or 'Present')",
      "current": false,
      "description": "job description and achievements"
    }
  ],
  "education": [
    {
      "school": "school name",
      "degree": "degree type and field",
      "location": "school location",
      "graduationDate": "graduation date (MM/YYYY format)",
      "gpa": "GPA if mentioned"
    }
  ],
  "skills": ["skill1", "skill2", "skill3"]
}

Resume text to parse:
${resumeText}

Important instructions:
- Extract ALL personal information that is clearly identifiable
- For experience, extract company names, job titles, dates, and descriptions accurately
- For education, include school names, degrees, and dates
- For skills, extract both technical and soft skills mentioned
- If information is not found, use empty string "" for strings and empty array [] for arrays
- Ensure the JSON is valid and properly formatted
- For dates, use MM/YYYY format (e.g., "01/2023" or "Present")
- Set "current" to true only if the job is explicitly marked as current/present

Return ONLY the JSON object, no additional text or explanations.`;

  if (!anthropic) throw new Error('Anthropic client not initialized');
  
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }]
  });

  const responseText = response.content[0]?.text || '';
  
  // Try to extract JSON from the response
  try {
    // Find JSON in the response (in case Claude adds extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in response');
    }
  } catch (error) {
    console.error('Failed to parse JSON from Claude response:', error);
    throw new Error('Failed to parse resume data');
  }
}

// Parse PDF resume using Claude Vision API (same as main page)
async function parseResumeWithClaudeVision(pdfBase64: string) {
  const prompt = `You are an expert resume parser. Extract structured data from this PDF resume and return it in JSON format.

Please extract the following information and return as valid JSON:

{
  "personalInfo": {
    "fullName": "extracted full name",
    "email": "extracted email",
    "phone": "extracted phone",
    "location": "extracted location (city, state)",
    "linkedin": "extracted LinkedIn URL (if found)",
    "github": "extracted GitHub URL (if found)"
  },
  "summary": "extracted professional summary or objective",
  "experience": [
    {
      "company": "company name",
      "title": "job title",
      "location": "job location",
      "startDate": "start date (MM/YYYY format)",
      "endDate": "end date (MM/YYYY format or 'Present')",
      "current": false,
      "description": "job description and achievements"
    }
  ],
  "education": [
    {
      "school": "school name",
      "degree": "degree type and field",
      "location": "school location",
      "graduationDate": "graduation date (MM/YYYY format)",
      "gpa": "GPA if mentioned"
    }
  ],
  "skills": ["skill1", "skill2", "skill3"]
}

Important instructions:
- Extract ALL personal information that is clearly identifiable
- For experience, extract company names, job titles, dates, and descriptions accurately
- For education, include school names, degrees, and dates
- For skills, extract both technical and soft skills mentioned
- If information is not found, use empty string "" for strings and empty array [] for arrays
- Ensure the JSON is valid and properly formatted
- For dates, use MM/YYYY format (e.g., "01/2023" or "Present")
- Set "current" to true only if the job is explicitly marked as current/present

Return ONLY the JSON object, no additional text or explanations.`;

  if (!anthropic) throw new Error('Anthropic client not initialized');

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
        data: pdfBase64
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

  const responseText = response.content[0]?.text || '';
  
  // Try to extract JSON from the response
  try {
    // Find JSON in the response (in case Claude adds extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in response');
    }
  } catch (error) {
    console.error('Failed to parse JSON from Claude Vision response:', error);
    throw new Error('Failed to parse PDF resume data');
  }
}

export async function POST(request: NextRequest) {
  try {
    // Initialize services
    initializeServices();
    
    const body = await request.json();
    const { resumeContent } = body;

    // Validate required fields
    if (!resumeContent || typeof resumeContent !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Resume content is required' },
        { status: 400 }
      );
    }

    let textContent = resumeContent;

    // Handle different file formats like the main page
    if (resumeContent.startsWith('data:application/pdf;base64,')) {
      console.log('[PARSE_RESUME] Processing PDF with Claude Vision...');
      try {
        // Extract base64 from data URL
        const pdfBase64 = resumeContent.split(',')[1];
        
        // Validate base64 content
        if (!pdfBase64 || pdfBase64.length < 100) {
          throw new Error(`Invalid PDF base64 data: length=${pdfBase64?.length || 0}`);
        }
        
        // Validate PDF header
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');
        const pdfHeader = pdfBuffer.toString('ascii', 0, 4);
        if (pdfHeader !== '%PDF') {
          throw new Error(`Invalid PDF format: header="${pdfHeader}"`);
        }
        
        // Use Claude Vision directly for PDFs
        const parsedData = await parseResumeWithClaudeVision(pdfBase64);
        
        // Validate results
        if (!parsedData.personalInfo || !parsedData.personalInfo.fullName) {
          return NextResponse.json(
            { success: false, message: 'Could not extract personal information from PDF resume' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'PDF resume parsed successfully using Claude Vision',
          data: parsedData,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('[PARSE_RESUME] PDF processing failed:', error);
        return NextResponse.json(
          { success: false, message: 'Failed to process PDF. Please try uploading a different format.' },
          { status: 400 }
        );
      }
    } 
    // Handle other data URL formats (DOCX, TXT, etc.)
    else if (resumeContent.startsWith('data:')) {
      console.log('[PARSE_RESUME] Processing non-PDF file...');
      try {
        const base64Content = resumeContent.split(',')[1];
        textContent = Buffer.from(base64Content, 'base64').toString('utf-8');
        // Clean null bytes immediately for DOCX/binary files
        textContent = textContent.replace(/\u0000/g, '');
        console.log(`[PARSE_RESUME] Text extracted and cleaned: ${textContent.length} characters`);
      } catch (error) {
        console.error('[PARSE_RESUME] Text extraction failed:', error);
        textContent = resumeContent.replace(/\u0000/g, ''); // Use as-is but cleaned
      }
    }

    // Validate processed content
    if (textContent.trim().length < 50) {
      return NextResponse.json(
        { success: false, message: 'Resume content appears to be too short or invalid after processing' },
        { status: 400 }
      );
    }

    try {
      // Parse resume with Claude text processing
      const parsedData = await parseResumeWithClaude(textContent);
      
      // Validate that we got some meaningful data
      if (!parsedData.personalInfo || !parsedData.personalInfo.fullName) {
        return NextResponse.json(
          { success: false, message: 'Could not extract personal information from resume' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Resume parsed successfully',
        data: parsedData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error parsing resume:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to parse resume. Please ensure the file contains readable text.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to return parsing status
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Resume parsing API is operational',
    supported_formats: ['PDF', 'DOCX', 'TXT'],
    max_file_size: '10MB'
  });
}