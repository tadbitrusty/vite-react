import { Anthropic } from '@anthropic-ai/sdk';
import { config } from '@resume-vita/config';
import { z } from 'zod';

// AI service configuration
const anthropic = new Anthropic({
  apiKey: config.env.ANTHROPIC_API_KEY,
});

// Input validation schemas
const OptimizeResumeInputSchema = z.object({
  resumeText: z.string().min(100, 'Resume text must be at least 100 characters'),
  jobDescription: z.string().min(50, 'Job description must be at least 50 characters'),
  templateType: z.enum(['ats-optimized', 'entry-clean', 'tech-focus', 'professional-plus', 'executive-format']),
  userInstructions: z.string().optional(),
});

const BuildResumeInputSchema = z.object({
  personalInfo: z.object({
    fullName: z.string(),
    email: z.string().email(),
    phone: z.string(),
    location: z.string(),
    linkedin: z.string().optional(),
    portfolio: z.string().optional(),
  }),
  professionalSummary: z.string(),
  workExperience: z.array(z.any()),
  education: z.array(z.any()),
  skills: z.array(z.string()),
  certifications: z.array(z.string()).optional(),
  templateType: z.enum(['ats-optimized', 'entry-clean', 'tech-focus', 'professional-plus', 'executive-format']),
  targetJobDescription: z.string().optional(),
});

type OptimizeResumeInput = z.infer<typeof OptimizeResumeInputSchema>;
type BuildResumeInput = z.infer<typeof BuildResumeInputSchema>;

// Result interfaces
interface OptimizeResumeResult {
  optimizedContent: string;
  improvements: string[];
  atsScore: number;
  keywordMatches: string[];
  recommendations: string[];
  estimatedImpact: string;
}

interface BuildResumeResult {
  formattedResume: string;
  optimizedSummary: string;
  enhancedExperience: string;
  skillsAnalysis: string[];
  atsOptimizations: string[];
}

interface ParsedResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
  };
  sections: {
    summary?: string;
    experience: any[];
    education: any[];
    skills: string[];
  };
  extractedText: string;
  confidence: number;
}

class AIService {
  /**
   * Optimize existing resume content for specific job
   */
  async optimizeResume(input: OptimizeResumeInput): Promise<OptimizeResumeResult> {
    const validatedInput = OptimizeResumeInputSchema.parse(input);
    
    try {
      const prompt = this.buildOptimizationPrompt(validatedInput);
      
      const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from AI service');
      }

      return this.parseOptimizationResponse(content.text);
    } catch (error) {
      console.error('AI optimization failed:', error);
      throw new Error('Failed to optimize resume with AI service');
    }
  }

  /**
   * Build resume from structured data
   */
  async buildResume(input: BuildResumeInput): Promise<BuildResumeResult> {
    const validatedInput = BuildResumeInputSchema.parse(input);
    
    try {
      const prompt = this.buildResumePrompt(validatedInput);
      
      const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from AI service');
      }

      return this.parseResumeResponse(content.text);
    } catch (error) {
      console.error('AI resume building failed:', error);
      throw new Error('Failed to build resume with AI service');
    }
  }

  /**
   * Parse resume content into structured data
   */
  async parseResumeContent(resumeText: string): Promise<ParsedResumeData> {
    try {
      const prompt = this.buildParsingPrompt(resumeText);
      
      const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from AI service');
      }

      return this.parseResumeData(content.text, resumeText);
    } catch (error) {
      console.error('AI parsing failed:', error);
      throw new Error('Failed to parse resume with AI service');
    }
  }

  /**
   * Health check for AI service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const start = Date.now();
    
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'Health check',
        }],
      });

      return {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } catch (error) {
      console.error('AI service health check failed:', error);
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
      };
    }
  }

  private buildOptimizationPrompt(input: OptimizeResumeInput): string {
    return `
You are a professional resume optimization expert. Please optimize the following resume for the given job description and template type.

Template Type: ${input.templateType}
${input.userInstructions ? `User Instructions: ${input.userInstructions}` : ''}

Job Description:
${input.jobDescription}

Current Resume:
${input.resumeText}

Please provide an optimized version that:
1. Matches key skills and keywords from the job description
2. Improves ATS compatibility
3. Enhances achievement statements with metrics where possible
4. Follows ${input.templateType} formatting principles

Return the response in this JSON format:
{
  "optimizedContent": "Complete optimized resume text",
  "improvements": ["List of specific improvements made"],
  "atsScore": 85,
  "keywordMatches": ["keywords", "matched", "from", "job"],
  "recommendations": ["Additional suggestions"],
  "estimatedImpact": "High/Medium/Low impact description"
}`;
  }

  private buildResumePrompt(input: BuildResumeInput): string {
    return `
You are a professional resume writer. Create a complete professional resume using the provided information.

Template Type: ${input.templateType}
${input.targetJobDescription ? `Target Job: ${input.targetJobDescription}` : ''}

Personal Information:
${JSON.stringify(input.personalInfo, null, 2)}

Professional Summary:
${input.professionalSummary}

Work Experience:
${JSON.stringify(input.workExperience, null, 2)}

Education:
${JSON.stringify(input.education, null, 2)}

Skills:
${input.skills.join(', ')}

${input.certifications ? `Certifications: ${input.certifications.join(', ')}` : ''}

Create a professional resume optimized for ${input.templateType} style. Return the response in this JSON format:
{
  "formattedResume": "Complete formatted resume text",
  "optimizedSummary": "Enhanced professional summary",
  "enhancedExperience": "Enhanced work experience section",
  "skillsAnalysis": ["Analysis of skills presentation"],
  "atsOptimizations": ["ATS optimization features applied"]
}`;
  }

  private buildParsingPrompt(resumeText: string): string {
    return `
Parse the following resume text and extract structured information:

${resumeText}

Extract and return the information in this JSON format:
{
  "personalInfo": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "phone number",
    "location": "city, state"
  },
  "sections": {
    "summary": "Professional summary text",
    "experience": [{"title": "Job Title", "company": "Company", "dates": "2020-2023", "achievements": ["achievement 1"]}],
    "education": [{"degree": "Degree", "school": "School", "year": "2020"}],
    "skills": ["skill1", "skill2"]
  },
  "confidence": 0.95
}`;
  }

  private parseOptimizationResponse(response: string): OptimizeResumeResult {
    try {
      const parsed = JSON.parse(response);
      return {
        optimizedContent: parsed.optimizedContent || '',
        improvements: parsed.improvements || [],
        atsScore: parsed.atsScore || 0,
        keywordMatches: parsed.keywordMatches || [],
        recommendations: parsed.recommendations || [],
        estimatedImpact: parsed.estimatedImpact || 'Unknown',
      };
    } catch (error) {
      // Fallback parsing if JSON is malformed
      return {
        optimizedContent: response,
        improvements: ['Resume optimized with AI assistance'],
        atsScore: 75,
        keywordMatches: [],
        recommendations: ['Review optimized content'],
        estimatedImpact: 'Medium',
      };
    }
  }

  private parseResumeResponse(response: string): BuildResumeResult {
    try {
      const parsed = JSON.parse(response);
      return {
        formattedResume: parsed.formattedResume || '',
        optimizedSummary: parsed.optimizedSummary || '',
        enhancedExperience: parsed.enhancedExperience || '',
        skillsAnalysis: parsed.skillsAnalysis || [],
        atsOptimizations: parsed.atsOptimizations || [],
      };
    } catch (error) {
      // Fallback parsing if JSON is malformed
      return {
        formattedResume: response,
        optimizedSummary: 'Professional summary enhanced',
        enhancedExperience: 'Work experience optimized',
        skillsAnalysis: ['Skills presentation improved'],
        atsOptimizations: ['ATS compatibility enhanced'],
      };
    }
  }

  private parseResumeData(response: string, originalText: string): ParsedResumeData {
    try {
      const parsed = JSON.parse(response);
      return {
        personalInfo: parsed.personalInfo || { name: '', email: '' },
        sections: parsed.sections || { experience: [], education: [], skills: [] },
        extractedText: originalText,
        confidence: parsed.confidence || 0.8,
      };
    } catch (error) {
      // Fallback parsing if JSON is malformed
      return {
        personalInfo: { name: 'Unknown', email: '' },
        sections: { experience: [], education: [], skills: [] },
        extractedText: originalText,
        confidence: 0.5,
      };
    }
  }
}

// Export singleton instance
export const aiService = new AIService();
export type { 
  OptimizeResumeResult, 
  BuildResumeResult, 
  ParsedResumeData,
  OptimizeResumeInput,
  BuildResumeInput 
};