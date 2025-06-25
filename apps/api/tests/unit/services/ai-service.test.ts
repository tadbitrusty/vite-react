import { aiService } from '../../../src/services/ai-service';
import { testResumeData, testJobDescription } from '../../fixtures/test-data';

describe('AI Service', () => {
  describe('optimizeResume', () => {
    it('should optimize resume content successfully', async () => {
      const input = {
        resumeText: 'Sample resume text content',
        jobDescription: testJobDescription,
        templateType: 'tech-focus' as const,
      };

      const result = await aiService.optimizeResume(input);

      expect(result).toMatchObject({
        optimizedContent: expect.any(String),
        improvements: expect.any(Array),
        atsScore: expect.any(Number),
        keywordMatches: expect.any(Array),
        recommendations: expect.any(Array),
        estimatedImpact: expect.any(String),
      });

      expect(result.atsScore).toBeGreaterThanOrEqual(0);
      expect(result.atsScore).toBeLessThanOrEqual(100);
      expect(result.improvements.length).toBeGreaterThan(0);
    });

    it('should reject invalid input', async () => {
      const invalidInput = {
        resumeText: '', // Too short
        jobDescription: testJobDescription,
        templateType: 'tech-focus' as const,
      };

      await expect(aiService.optimizeResume(invalidInput))
        .rejects
        .toThrow('Resume text must be at least 100 characters');
    });

    it('should handle different template types', async () => {
      const templateTypes = ['ats-optimized', 'entry-clean', 'tech-focus', 'professional-plus', 'executive-format'] as const;

      for (const templateType of templateTypes) {
        const input = {
          resumeText: 'Sample resume text content that is long enough for validation',
          jobDescription: testJobDescription,
          templateType,
        };

        const result = await aiService.optimizeResume(input);
        expect(result.optimizedContent).toContain('Mock AI response');
      }
    });

    it('should include user instructions when provided', async () => {
      const input = {
        resumeText: 'Sample resume text content that is long enough for validation',
        jobDescription: testJobDescription,
        templateType: 'tech-focus' as const,
        userInstructions: 'Focus on leadership experience',
      };

      const result = await aiService.optimizeResume(input);
      expect(result).toBeDefined();
      expect(result.optimizedContent).toContain('Mock AI response');
    });
  });

  describe('buildResume', () => {
    it('should build resume from structured data', async () => {
      const input = {
        personalInfo: testResumeData.personalInfo,
        professionalSummary: testResumeData.professionalSummary,
        workExperience: testResumeData.workExperience,
        education: testResumeData.education,
        skills: testResumeData.skills,
        certifications: testResumeData.certifications,
        templateType: 'professional-plus' as const,
      };

      const result = await aiService.buildResume(input);

      expect(result).toMatchObject({
        formattedResume: expect.any(String),
        optimizedSummary: expect.any(String),
        enhancedExperience: expect.any(String),
        skillsAnalysis: expect.any(Array),
        atsOptimizations: expect.any(Array),
      });
    });

    it('should validate required fields', async () => {
      const invalidInput = {
        personalInfo: {
          ...testResumeData.personalInfo,
          email: 'invalid-email', // Invalid email format
        },
        professionalSummary: testResumeData.professionalSummary,
        workExperience: testResumeData.workExperience,
        education: testResumeData.education,
        skills: testResumeData.skills,
        templateType: 'ats-optimized' as const,
      };

      await expect(aiService.buildResume(invalidInput))
        .rejects
        .toThrow();
    });

    it('should include target job description when provided', async () => {
      const input = {
        personalInfo: testResumeData.personalInfo,
        professionalSummary: testResumeData.professionalSummary,
        workExperience: testResumeData.workExperience,
        education: testResumeData.education,
        skills: testResumeData.skills,
        templateType: 'tech-focus' as const,
        targetJobDescription: testJobDescription,
      };

      const result = await aiService.buildResume(input);
      expect(result.formattedResume).toContain('Mock AI response');
    });
  });

  describe('parseResumeContent', () => {
    it('should parse resume text into structured data', async () => {
      const resumeText = `
        John Doe
        john.doe@example.com
        (555) 123-4567
        San Francisco, CA
        
        PROFESSIONAL SUMMARY
        Experienced software engineer with 5+ years of full-stack development.
        
        EXPERIENCE
        Software Engineer at Tech Corp
        2020-2023
        - Built microservices architecture
        - Reduced load time by 40%
      `;

      const result = await aiService.parseResumeContent(resumeText);

      expect(result).toMatchObject({
        personalInfo: expect.objectContaining({
          name: expect.any(String),
          email: expect.any(String),
        }),
        sections: expect.objectContaining({
          summary: expect.any(String),
          experience: expect.any(Array),
        }),
        extractedText: expect.any(String),
        confidence: expect.any(Number),
      });

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle malformed resume content', async () => {
      const malformedText = 'This is not a valid resume format';

      const result = await aiService.parseResumeContent(malformedText);
      expect(result.confidence).toBeLessThan(0.8); // Low confidence for poor format
    });

    it('should extract contact information correctly', async () => {
      const resumeWithContacts = `
        Jane Smith
        jane.smith@email.com
        +1-555-987-6543
        New York, NY
        linkedin.com/in/janesmith
        portfolio.janesmith.com
      `;

      const result = await aiService.parseResumeContent(resumeWithContacts);
      
      expect(result.personalInfo.email).toBe('jane.smith@email.com');
      expect(result.personalInfo.phone).toContain('555-987-6543');
      expect(result.personalInfo.location).toContain('New York');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const result = await aiService.healthCheck();

      expect(result).toMatchObject({
        status: 'healthy',
        latency: expect.any(Number),
      });

      expect(result.latency).toBeGreaterThan(0);
    });

    it('should handle service unavailability', async () => {
      // Mock service failure
      const mockAnthropicError = new Error('Service unavailable');
      jest.spyOn(require('@anthropic-ai/sdk').Anthropic.prototype.messages, 'create')
        .mockRejectedValueOnce(mockAnthropicError);

      const result = await aiService.healthCheck();

      expect(result).toMatchObject({
        status: 'unhealthy',
        latency: expect.any(Number),
      });
    });
  });

  describe('error handling', () => {
    it('should handle API rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      jest.spyOn(require('@anthropic-ai/sdk').Anthropic.prototype.messages, 'create')
        .mockRejectedValueOnce(rateLimitError);

      const input = {
        resumeText: 'Sample resume content that meets minimum length requirements',
        jobDescription: testJobDescription,
        templateType: 'ats-optimized' as const,
      };

      await expect(aiService.optimizeResume(input))
        .rejects
        .toThrow('Failed to optimize resume with AI service');
    });

    it('should handle malformed AI responses', async () => {
      // Mock malformed response
      jest.spyOn(require('@anthropic-ai/sdk').Anthropic.prototype.messages, 'create')
        .mockResolvedValueOnce({
          content: [{ type: 'image', source: { data: 'invalid' } }], // Wrong content type
        });

      const input = {
        resumeText: 'Sample resume content that meets minimum length requirements',
        jobDescription: testJobDescription,
        templateType: 'ats-optimized' as const,
      };

      await expect(aiService.optimizeResume(input))
        .rejects
        .toThrow('Unexpected response type from AI service');
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      jest.spyOn(require('@anthropic-ai/sdk').Anthropic.prototype.messages, 'create')
        .mockRejectedValueOnce(timeoutError);

      const input = {
        personalInfo: testResumeData.personalInfo,
        professionalSummary: testResumeData.professionalSummary,
        workExperience: testResumeData.workExperience,
        education: testResumeData.education,
        skills: testResumeData.skills,
        templateType: 'tech-focus' as const,
      };

      await expect(aiService.buildResume(input))
        .rejects
        .toThrow('Failed to build resume with AI service');
    });
  });

  describe('input validation', () => {
    it('should validate minimum resume text length', async () => {
      const input = {
        resumeText: 'Short', // Too short
        jobDescription: testJobDescription,
        templateType: 'ats-optimized' as const,
      };

      await expect(aiService.optimizeResume(input))
        .rejects
        .toThrow('Resume text must be at least 100 characters');
    });

    it('should validate job description length', async () => {
      const input = {
        resumeText: 'This is a valid resume text that meets the minimum length requirement for processing',
        jobDescription: 'Short', // Too short
        templateType: 'ats-optimized' as const,
      };

      await expect(aiService.optimizeResume(input))
        .rejects
        .toThrow('Job description must be at least 50 characters');
    });

    it('should validate template type', async () => {
      const input = {
        resumeText: 'This is a valid resume text that meets the minimum length requirement for processing',
        jobDescription: testJobDescription,
        templateType: 'invalid-template' as any,
      };

      await expect(aiService.optimizeResume(input))
        .rejects
        .toThrow();
    });

    it('should validate email format in personal info', async () => {
      const input = {
        personalInfo: {
          ...testResumeData.personalInfo,
          email: 'invalid-email-format',
        },
        professionalSummary: testResumeData.professionalSummary,
        workExperience: testResumeData.workExperience,
        education: testResumeData.education,
        skills: testResumeData.skills,
        templateType: 'ats-optimized' as const,
      };

      await expect(aiService.buildResume(input))
        .rejects
        .toThrow();
    });
  });
});