import { pdfService } from '../../../src/services/pdf-service';
import { testResumeData } from '../../fixtures/test-data';

// Mock Puppeteer is already set up in setup.ts

describe('PDF Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePDF', () => {
    const mockPDFInput = {
      templateId: 'tech-focus' as const,
      resumeContent: `
        John Doe
        john.doe@example.com
        (555) 123-4567
        San Francisco, CA
        
        PROFESSIONAL SUMMARY
        Experienced software engineer with 5+ years of full-stack development.
        
        EXPERIENCE
        Senior Software Engineer
        Tech Corp
        2020-2023 • San Francisco, CA
        - Led development of microservices architecture serving 1M+ users
        - Reduced application load time by 40% through performance optimization
        
        EDUCATION
        Bachelor of Science in Computer Science
        University of California, Berkeley
        2018
        
        SKILLS
        JavaScript, TypeScript, React, Node.js, Python, PostgreSQL, AWS, Docker
      `,
      personalInfo: testResumeData.personalInfo,
    };

    it('should generate PDF successfully for tech-focus template', async () => {
      const result = await pdfService.generatePDF(mockPDFInput);

      expect(result).toMatchObject({
        pdfBuffer: expect.any(Buffer),
        fileName: expect.any(String),
        fileSize: expect.any(Number),
        generatedAt: expect.any(Date),
        templateUsed: 'tech-focus',
        processingTime: expect.any(Number),
      });

      expect(result.fileName).toContain('John_Doe');
      expect(result.fileName).toContain('tech-focus.pdf');
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should generate PDF for all template types', async () => {
      const templateIds = ['ats-optimized', 'entry-clean', 'tech-focus', 'professional-plus', 'executive-format'] as const;

      for (const templateId of templateIds) {
        const input = { ...mockPDFInput, templateId };
        const result = await pdfService.generatePDF(input);

        expect(result.templateUsed).toBe(templateId);
        expect(result.pdfBuffer).toBeInstanceOf(Buffer);
        expect(result.pdfBuffer.length).toBeGreaterThan(0);
      }
    });

    it('should use custom filename when provided', async () => {
      const customInput = {
        ...mockPDFInput,
        fileName: 'custom-resume.pdf',
      };

      const result = await pdfService.generatePDF(customInput);

      expect(result.fileName).toBe('custom-resume.pdf');
    });

    it('should generate default filename from personal info', async () => {
      const input = {
        ...mockPDFInput,
        personalInfo: {
          ...mockPDFInput.personalInfo,
          fullName: 'Jane Mary Smith',
        },
      };

      const result = await pdfService.generatePDF(input);

      expect(result.fileName).toBe('Jane_Mary_Smith_tech-focus.pdf');
    });

    it('should handle names with special characters', async () => {
      const input = {
        ...mockPDFInput,
        personalInfo: {
          ...mockPDFInput.personalInfo,
          fullName: 'José María González-López',
        },
      };

      const result = await pdfService.generatePDF(input);

      expect(result.fileName).toContain('José_María_González-López');
      expect(result.fileName).toContain('.pdf');
    });

    it('should validate resume content length', async () => {
      const invalidInput = {
        ...mockPDFInput,
        resumeContent: 'Too short', // Less than 100 characters
      };

      await expect(pdfService.generatePDF(invalidInput))
        .rejects
        .toThrow('Resume content must be substantial');
    });

    it('should validate template ID', async () => {
      const invalidInput = {
        ...mockPDFInput,
        templateId: 'invalid-template' as any,
      };

      await expect(pdfService.generatePDF(invalidInput))
        .rejects
        .toThrow();
    });

    it('should validate personal info email format', async () => {
      const invalidInput = {
        ...mockPDFInput,
        personalInfo: {
          ...mockPDFInput.personalInfo,
          email: 'invalid-email',
        },
      };

      await expect(pdfService.generatePDF(invalidInput))
        .rejects
        .toThrow();
    });

    it('should handle missing optional personal info fields', async () => {
      const minimalInput = {
        ...mockPDFInput,
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com',
          phone: '555-123-4567',
          location: 'San Francisco, CA',
          // linkedin and portfolio are optional
        },
      };

      const result = await pdfService.generatePDF(minimalInput);

      expect(result.pdfBuffer).toBeInstanceOf(Buffer);
      expect(result.templateUsed).toBe('tech-focus');
    });

    it('should include optional personal info fields when provided', async () => {
      const fullInput = {
        ...mockPDFInput,
        personalInfo: {
          ...mockPDFInput.personalInfo,
          linkedin: 'https://linkedin.com/in/johndoe',
          portfolio: 'https://johndoe.dev',
        },
      };

      const result = await pdfService.generatePDF(fullInput);

      expect(result.pdfBuffer).toBeInstanceOf(Buffer);
      // We can't easily test HTML content without additional mocking,
      // but we can verify the PDF was generated successfully
    });

    it('should handle Puppeteer errors gracefully', async () => {
      // Mock Puppeteer to throw an error
      const mockError = new Error('Puppeteer failed');
      jest.spyOn(require('puppeteer').default, 'launch')
        .mockRejectedValueOnce(mockError);

      await expect(pdfService.generatePDF(mockPDFInput))
        .rejects
        .toThrow('Failed to generate PDF');
    });

    it('should measure processing time accurately', async () => {
      const startTime = Date.now();
      const result = await pdfService.generatePDF(mockPDFInput);
      const endTime = Date.now();

      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.processingTime).toBeLessThanOrEqual(endTime - startTime + 100); // Allow small margin
    });
  });

  describe('generatePreviewImage', () => {
    const mockPDFInput = {
      templateId: 'tech-focus' as const,
      resumeContent: `
        John Doe
        PROFESSIONAL SUMMARY
        Software engineer with experience.
        EXPERIENCE
        Software Engineer at Tech Corp
        EDUCATION
        BS Computer Science
        SKILLS
        JavaScript, React
      `,
      personalInfo: testResumeData.personalInfo,
    };

    it('should generate preview image successfully', async () => {
      const result = await pdfService.generatePreviewImage(mockPDFInput);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate preview for all template types', async () => {
      const templateIds = ['ats-optimized', 'entry-clean', 'professional-plus'] as const;

      for (const templateId of templateIds) {
        const input = { ...mockPDFInput, templateId };
        const result = await pdfService.generatePreviewImage(input);

        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBeGreaterThan(0);
      }
    });

    it('should handle preview generation errors', async () => {
      // Mock screenshot to fail
      const mockError = new Error('Screenshot failed');
      jest.spyOn(require('puppeteer').default.launch().newPage(), 'screenshot')
        .mockRejectedValueOnce(mockError);

      await expect(pdfService.generatePreviewImage(mockPDFInput))
        .rejects
        .toThrow();
    });
  });

  describe('content parsing', () => {
    it('should parse resume sections correctly', async () => {
      const contentWithSections = `
        John Doe
        john@example.com
        
        PROFESSIONAL SUMMARY
        Experienced software engineer with expertise in full-stack development.
        
        EXPERIENCE
        Senior Software Engineer
        Tech Corp
        2020-2023 • San Francisco, CA
        - Led development of microservices
        - Improved performance by 40%
        
        Full Stack Developer
        Startup Inc
        2018-2020 • Remote
        - Built React applications
        - Implemented CI/CD pipelines
        
        EDUCATION
        Bachelor of Science in Computer Science
        University of California, Berkeley
        2018 • Berkeley, CA
        
        SKILLS
        JavaScript, TypeScript, React, Node.js, Python
        
        CERTIFICATIONS
        AWS Certified Solutions Architect
      `;

      const input = {
        templateId: 'ats-optimized' as const,
        resumeContent: contentWithSections,
        personalInfo: testResumeData.personalInfo,
      };

      const result = await pdfService.generatePDF(input);

      expect(result.pdfBuffer).toBeInstanceOf(Buffer);
      expect(result.templateUsed).toBe('ats-optimized');
    });

    it('should handle missing sections gracefully', async () => {
      const minimalContent = `
        John Doe
        john@example.com
        
        SUMMARY
        Software engineer.
      `;

      const input = {
        templateId: 'entry-clean' as const,
        resumeContent: minimalContent,
        personalInfo: testResumeData.personalInfo,
      };

      const result = await pdfService.generatePDF(input);

      expect(result.pdfBuffer).toBeInstanceOf(Buffer);
    });

    it('should handle malformed section content', async () => {
      const malformedContent = `
        EXPERIENCE
        Incomplete job entry without proper formatting
        
        EDUCATION
        
        SKILLS
        Skill1, Skill2, Skill3,,,
      `;

      const input = {
        templateId: 'professional-plus' as const,
        resumeContent: malformedContent,
        personalInfo: testResumeData.personalInfo,
      };

      const result = await pdfService.generatePDF(input);

      expect(result.pdfBuffer).toBeInstanceOf(Buffer);
    });
  });

  describe('template-specific features', () => {
    const baseInput = {
      resumeContent: `
        John Doe
        SUMMARY
        Professional summary
        EXPERIENCE
        Job Title
        Company Name
        Dates
        Achievement
      `,
      personalInfo: testResumeData.personalInfo,
    };

    it('should apply ATS-optimized template styles', async () => {
      const input = { ...baseInput, templateId: 'ats-optimized' as const };
      const result = await pdfService.generatePDF(input);

      expect(result.templateUsed).toBe('ats-optimized');
      expect(result.pdfBuffer).toBeInstanceOf(Buffer);
    });

    it('should apply entry-clean template styles', async () => {
      const input = { ...baseInput, templateId: 'entry-clean' as const };
      const result = await pdfService.generatePDF(input);

      expect(result.templateUsed).toBe('entry-clean');
      expect(result.pdfBuffer).toBeInstanceOf(Buffer);
    });

    it('should apply tech-focus template styles', async () => {
      const input = { ...baseInput, templateId: 'tech-focus' as const };
      const result = await pdfService.generatePDF(input);

      expect(result.templateUsed).toBe('tech-focus');
      expect(result.pdfBuffer).toBeInstanceOf(Buffer);
    });

    it('should apply professional-plus template styles', async () => {
      const input = { ...baseInput, templateId: 'professional-plus' as const };
      const result = await pdfService.generatePDF(input);

      expect(result.templateUsed).toBe('professional-plus');
      expect(result.pdfBuffer).toBeInstanceOf(Buffer);
    });

    it('should apply executive-format template styles', async () => {
      const input = { ...baseInput, templateId: 'executive-format' as const };
      const result = await pdfService.generatePDF(input);

      expect(result.templateUsed).toBe('executive-format');
      expect(result.pdfBuffer).toBeInstanceOf(Buffer);
    });
  });

  describe('browser management', () => {
    it('should reuse browser instance for multiple requests', async () => {
      const input = {
        templateId: 'tech-focus' as const,
        resumeContent: 'Sample content with enough characters to pass validation test',
        personalInfo: testResumeData.personalInfo,
      };

      // Generate multiple PDFs
      await pdfService.generatePDF(input);
      await pdfService.generatePDF(input);
      await pdfService.generatePDF(input);

      // Browser should be launched only once (singleton pattern)
      expect(require('puppeteer').default.launch).toHaveBeenCalledTimes(1);
    });

    it('should close browser when requested', async () => {
      await pdfService.close();

      // After closing, next request should launch a new browser
      const input = {
        templateId: 'tech-focus' as const,
        resumeContent: 'Sample content with enough characters to pass validation test',
        personalInfo: testResumeData.personalInfo,
      };

      await pdfService.generatePDF(input);

      // Should launch browser again
      expect(require('puppeteer').default.launch).toHaveBeenCalled();
    });

    it('should handle browser launch failures', async () => {
      const launchError = new Error('Browser launch failed');
      jest.spyOn(require('puppeteer').default, 'launch')
        .mockRejectedValueOnce(launchError);

      const input = {
        templateId: 'tech-focus' as const,
        resumeContent: 'Sample content with enough characters to pass validation test',
        personalInfo: testResumeData.personalInfo,
      };

      await expect(pdfService.generatePDF(input))
        .rejects
        .toThrow('Failed to generate PDF');
    });

    it('should close pages after PDF generation', async () => {
      const mockPage = require('puppeteer').default.launch().newPage();
      const closeSpy = jest.spyOn(mockPage, 'close');

      const input = {
        templateId: 'tech-focus' as const,
        resumeContent: 'Sample content with enough characters to pass validation test',
        personalInfo: testResumeData.personalInfo,
      };

      await pdfService.generatePDF(input);

      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when service is working', async () => {
      const result = await pdfService.healthCheck();

      expect(result).toMatchObject({
        status: 'healthy',
        latency: expect.any(Number),
      });

      expect(result.latency).toBeGreaterThan(0);
    });

    it('should return unhealthy status when service fails', async () => {
      const mockError = new Error('Browser failed');
      jest.spyOn(require('puppeteer').default, 'launch')
        .mockRejectedValueOnce(mockError);

      const result = await pdfService.healthCheck();

      expect(result).toMatchObject({
        status: 'unhealthy',
        latency: expect.any(Number),
      });
    });

    it('should measure latency correctly', async () => {
      const startTime = Date.now();
      const result = await pdfService.healthCheck();
      const endTime = Date.now();

      expect(result.latency).toBeGreaterThan(0);
      expect(result.latency).toBeLessThanOrEqual(endTime - startTime + 100);
    });

    it('should clean up page after health check', async () => {
      const mockPage = require('puppeteer').default.launch().newPage();
      const closeSpy = jest.spyOn(mockPage, 'close');

      await pdfService.healthCheck();

      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle page content loading timeout', async () => {
      const mockPage = require('puppeteer').default.launch().newPage();
      jest.spyOn(mockPage, 'setContent')
        .mockRejectedValueOnce(new Error('Timeout'));

      const input = {
        templateId: 'tech-focus' as const,
        resumeContent: 'Sample content with enough characters to pass validation test',
        personalInfo: testResumeData.personalInfo,
      };

      await expect(pdfService.generatePDF(input))
        .rejects
        .toThrow('Failed to generate PDF');
    });

    it('should handle PDF generation failures', async () => {
      const mockPage = require('puppeteer').default.launch().newPage();
      jest.spyOn(mockPage, 'pdf')
        .mockRejectedValueOnce(new Error('PDF generation failed'));

      const input = {
        templateId: 'tech-focus' as const,
        resumeContent: 'Sample content with enough characters to pass validation test',
        personalInfo: testResumeData.personalInfo,
      };

      await expect(pdfService.generatePDF(input))
        .rejects
        .toThrow('Failed to generate PDF');
    });

    it('should handle large resume content', async () => {
      const largeContent = 'Large resume content with many sections. '.repeat(1000);
      const input = {
        templateId: 'tech-focus' as const,
        resumeContent: largeContent,
        personalInfo: testResumeData.personalInfo,
      };

      const result = await pdfService.generatePDF(input);

      expect(result.pdfBuffer).toBeInstanceOf(Buffer);
      expect(result.fileSize).toBeGreaterThan(0);
    });

    it('should sanitize filename characters', async () => {
      const input = {
        templateId: 'tech-focus' as const,
        resumeContent: 'Sample content with enough characters to pass validation test',
        personalInfo: {
          ...testResumeData.personalInfo,
          fullName: 'John/Doe\\Name:With*Special?Characters',
        },
      };

      const result = await pdfService.generatePDF(input);

      // Filename should contain the name but with spaces replacing special characters
      expect(result.fileName).toContain('John');
      expect(result.fileName).toContain('Doe');
      expect(result.fileName).toContain('.pdf');
    });

    it('should handle Unicode characters in content', async () => {
      const unicodeContent = `
        José María González
        josé@example.com
        
        RESUMEN PROFESIONAL
        Ingeniero de software con experiencia en desarrollo full-stack.
        Especializado en tecnologías modernas y metodologías ágiles.
        
        EXPERIENCIA
        Desarrollador Senior
        Empresa Tecnológica
        2020-2023 • Madrid, España
        - Lideró el desarrollo de arquitectura de microservicios
        - Mejoró el rendimiento en un 40%
      `;

      const input = {
        templateId: 'tech-focus' as const,
        resumeContent: unicodeContent,
        personalInfo: {
          fullName: 'José María González',
          email: 'jose@example.com',
          phone: '+34 600 123 456',
          location: 'Madrid, España',
        },
      };

      const result = await pdfService.generatePDF(input);

      expect(result.pdfBuffer).toBeInstanceOf(Buffer);
      expect(result.fileSize).toBeGreaterThan(0);
    });
  });

  describe('performance considerations', () => {
    it('should generate PDF within reasonable time', async () => {
      const input = {
        templateId: 'tech-focus' as const,
        resumeContent: 'Sample content with enough characters to pass validation test',
        personalInfo: testResumeData.personalInfo,
      };

      const startTime = Date.now();
      const result = await pdfService.generatePDF(input);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(result.processingTime).toBeLessThan(30000);
    });

    it('should handle concurrent PDF generation requests', async () => {
      const input = {
        templateId: 'tech-focus' as const,
        resumeContent: 'Sample content with enough characters to pass validation test',
        personalInfo: testResumeData.personalInfo,
      };

      // Generate multiple PDFs concurrently
      const promises = Array.from({ length: 3 }, () => pdfService.generatePDF(input));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.pdfBuffer).toBeInstanceOf(Buffer);
        expect(result.fileSize).toBeGreaterThan(0);
      });
    });

    it('should generate reasonably sized PDF files', async () => {
      const input = {
        templateId: 'tech-focus' as const,
        resumeContent: 'Sample content with enough characters to pass validation test',
        personalInfo: testResumeData.personalInfo,
      };

      const result = await pdfService.generatePDF(input);

      // PDF should not be too large for a simple resume
      expect(result.fileSize).toBeLessThan(1024 * 1024); // Less than 1MB
      expect(result.fileSize).toBeGreaterThan(1024); // Greater than 1KB
    });
  });
});