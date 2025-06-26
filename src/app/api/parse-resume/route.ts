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

    if (resumeContent.trim().length < 50) {
      return NextResponse.json(
        { success: false, message: 'Resume content appears to be too short or invalid' },
        { status: 400 }
      );
    }

    try {
      // Parse resume with Claude
      const parsedData = await parseResumeWithClaude(resumeContent);
      
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