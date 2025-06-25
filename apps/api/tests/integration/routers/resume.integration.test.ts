import { createTestCaller, createTestContext, TestDatabase, integrationTestHelpers, prisma } from '../setup';

describe('Resume Router Integration Tests', () => {
  beforeEach(async () => {
    await TestDatabase.seed();
  });

  describe('getTemplates', () => {
    it('should return all available templates', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const result = await caller.resume.getTemplates();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Check template structure
      result.forEach(template => {
        integrationTestHelpers.expectValidResponse(template, [
          'id',
          'name',
          'description',
          'price',
          'icon',
          'isFree'
        ]);

        expect(typeof template.id).toBe('string');
        expect(typeof template.name).toBe('string');
        expect(typeof template.description).toBe('string');
        expect(typeof template.price).toBe('number');
        expect(typeof template.icon).toBe('string');
        expect(typeof template.isFree).toBe('boolean');

        if (!template.isFree) {
          expect(template).toHaveProperty('stripeProductId');
          expect(typeof template.stripeProductId).toBe('string');
        }
      });
    });

    it('should include ATS optimized free template', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const result = await caller.resume.getTemplates();

      const atsTemplate = result.find(t => t.id === 'ats-optimized');
      expect(atsTemplate).toBeDefined();
      expect(atsTemplate!.isFree).toBe(true);
      expect(atsTemplate!.price).toBe(0);
      expect(atsTemplate!.name).toBe('ATS Optimized');
    });

    it('should include premium templates with correct pricing', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const result = await caller.resume.getTemplates();

      const techFocusTemplate = result.find(t => t.id === 'tech-focus');
      expect(techFocusTemplate).toBeDefined();
      expect(techFocusTemplate!.isFree).toBe(false);
      expect(techFocusTemplate!.price).toBe(999); // $9.99
      expect(techFocusTemplate!.stripeProductId).toBeDefined();

      const professionalTemplate = result.find(t => t.id === 'professional-plus');
      expect(professionalTemplate).toBeDefined();
      expect(professionalTemplate!.price).toBe(799); // $7.99
    });

    it('should be consistent across multiple calls', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const result1 = await caller.resume.getTemplates();
      const result2 = await caller.resume.getTemplates();

      expect(result1).toEqual(result2);
      expect(result1.length).toBe(result2.length);
    });

    it('should respond quickly', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const startTime = Date.now();
      await caller.resume.getTemplates();
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  describe('process resume', () => {
    it('should process resume file successfully', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const mockFile = integrationTestHelpers.createMockFile();
      const processData = {
        email: 'process@example.com',
        jobDescription: 'Software Engineer position requiring React and Node.js experience with 3+ years of full-stack development.',
        templateId: 'tech-focus' as const,
        fileData: mockFile.content,
        fileName: mockFile.fileName,
        fileSize: mockFile.fileSize,
        mimeType: mockFile.mimeType,
      };

      const result = await caller.resume.process(processData);

      integrationTestHelpers.expectValidResponse(result, [
        'success',
        'message',
        'data',
        'requestId',
        'timestamp'
      ]);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('jobId');
      expect(result.data).toHaveProperty('estimatedTime');
      expect(result.data).toHaveProperty('templateInfo');
      expect(result.data.templateInfo.id).toBe('tech-focus');
      expect(typeof result.data.estimatedTime).toBe('number');
      expect(result.data.estimatedTime).toBeGreaterThan(0);
    });

    it('should validate input parameters', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      // Test invalid email
      await expect(caller.resume.process({
        email: 'invalid-email',
        jobDescription: 'Valid job description',
        templateId: 'tech-focus',
        fileData: 'base64data',
        fileName: 'resume.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      })).rejects.toThrow();

      // Test short job description
      await expect(caller.resume.process({
        email: 'valid@example.com',
        jobDescription: 'Short',
        templateId: 'tech-focus',
        fileData: 'base64data',
        fileName: 'resume.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      })).rejects.toThrow();

      // Test invalid template ID
      await expect(caller.resume.process({
        email: 'valid@example.com',
        jobDescription: 'Valid job description for testing',
        templateId: 'invalid-template' as any,
        fileData: 'base64data',
        fileName: 'resume.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      })).rejects.toThrow();
    });

    it('should handle different template types', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const templateIds = ['ats-optimized', 'entry-clean', 'tech-focus', 'professional-plus', 'executive-format'] as const;
      const mockFile = integrationTestHelpers.createMockFile();

      for (const templateId of templateIds) {
        const processData = {
          email: `${templateId}@example.com`,
          jobDescription: 'Software Engineer position requiring experience in web development technologies.',
          templateId,
          fileData: mockFile.content,
          fileName: mockFile.fileName,
          fileSize: mockFile.fileSize,
          mimeType: mockFile.mimeType,
        };

        const result = await caller.resume.process(processData);

        expect(result.success).toBe(true);
        expect(result.data.templateInfo.id).toBe(templateId);
      }
    });

    it('should generate unique job IDs', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const mockFile = integrationTestHelpers.createMockFile();
      const baseData = {
        jobDescription: 'Software Engineer position requiring experience in web development technologies.',
        templateId: 'tech-focus' as const,
        fileData: mockFile.content,
        fileName: mockFile.fileName,
        fileSize: mockFile.fileSize,
        mimeType: mockFile.mimeType,
      };

      const results = await Promise.all([
        caller.resume.process({ ...baseData, email: 'user1@example.com' }),
        caller.resume.process({ ...baseData, email: 'user2@example.com' }),
        caller.resume.process({ ...baseData, email: 'user3@example.com' }),
      ]);

      const jobIds = results.map(r => r.data.jobId);
      const uniqueJobIds = new Set(jobIds);
      expect(uniqueJobIds.size).toBe(3); // All should be unique
    });

    it('should handle large files', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const largeFile = integrationTestHelpers.createMockFile({
        fileSize: 5 * 1024 * 1024, // 5MB
        content: Buffer.alloc(5 * 1024 * 1024).toString('base64'),
      });

      const result = await caller.resume.process({
        email: 'largefile@example.com',
        jobDescription: 'Software Engineer position requiring experience in web development technologies.',
        templateId: 'tech-focus',
        fileData: largeFile.content,
        fileName: largeFile.fileName,
        fileSize: largeFile.fileSize,
        mimeType: largeFile.mimeType,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('buildFromData', () => {
    it('should build resume from structured data successfully', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const resumeData = integrationTestHelpers.createMockResumeData();
      const buildData = {
        data: resumeData,
        templateId: 'professional-plus' as const,
        pricing: 'enhanced' as const,
      };

      const result = await caller.resume.buildFromData(buildData);

      integrationTestHelpers.expectValidResponse(result, [
        'success',
        'message',
        'paymentRequired'
      ]);

      expect(result.success).toBe(true);
      expect(result.paymentRequired).toBe(true); // Enhanced pricing requires payment
      expect(result.paymentUrl).toBeDefined();
    });

    it('should handle free template with basic pricing', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const resumeData = integrationTestHelpers.createMockResumeData();
      const buildData = {
        data: resumeData,
        templateId: 'ats-optimized' as const,
        pricing: 'basic' as const,
      };

      const result = await caller.resume.buildFromData(buildData);

      expect(result.success).toBe(true);
      expect(result.paymentRequired).toBe(false); // Free template with basic pricing
      expect(result.paymentUrl).toBeUndefined();
    });

    it('should require payment for premium templates', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const resumeData = integrationTestHelpers.createMockResumeData();
      const buildData = {
        data: resumeData,
        templateId: 'tech-focus' as const,
        pricing: 'basic' as const,
      };

      const result = await caller.resume.buildFromData(buildData);

      expect(result.success).toBe(true);
      expect(result.paymentRequired).toBe(true); // Premium template requires payment
      expect(result.paymentUrl).toBeDefined();
    });

    it('should validate resume data structure', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      // Test with invalid personal info
      const invalidData = {
        data: {
          personalInfo: {
            fullName: '', // Empty name should be invalid
            email: 'invalid-email', // Invalid email format
          },
          // Missing required fields
        },
        templateId: 'tech-focus' as const,
        pricing: 'basic' as const,
      };

      await expect(caller.resume.buildFromData(invalidData))
        .rejects
        .toThrow();
    });

    it('should handle all pricing options', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const resumeData = integrationTestHelpers.createMockResumeData();
      const pricingOptions = ['basic', 'enhanced'] as const;

      for (const pricing of pricingOptions) {
        const result = await caller.resume.buildFromData({
          data: resumeData,
          templateId: 'tech-focus',
          pricing,
        });

        expect(result.success).toBe(true);
        // Enhanced pricing always requires payment for premium templates
        expect(result.paymentRequired).toBe(true);
      }
    });

    it('should handle incomplete resume data gracefully', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const minimalData = {
        personalInfo: {
          fullName: 'Minimal User',
          email: 'minimal@example.com',
          phone: '555-1234',
          location: 'City, State',
        },
        professionalSummary: 'Brief summary',
        workExperience: [],
        education: [],
        skills: ['Skill 1'],
      };

      const result = await caller.resume.buildFromData({
        data: minimalData,
        templateId: 'ats-optimized',
        pricing: 'basic',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('getJobStatus', () => {
    it('should return job status successfully', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const result = await caller.resume.getJobStatus({ jobId: 'test-job-123' });

      integrationTestHelpers.expectValidResponse(result, [
        'jobId',
        'status',
        'progress',
        'result'
      ]);

      expect(result.jobId).toBe('test-job-123');
      expect(result.status).toBe('COMPLETED');
      expect(result.progress).toBe(100);
      expect(result.result).toHaveProperty('downloadUrl');
      expect(result.result).toHaveProperty('emailSent');
    });

    it('should handle different job IDs', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const jobIds = ['job-1', 'job-2', 'job-3', 'very-long-job-id-with-special-characters-123'];

      for (const jobId of jobIds) {
        const result = await caller.resume.getJobStatus({ jobId });
        expect(result.jobId).toBe(jobId);
        expect(result.status).toBeDefined();
        expect(typeof result.progress).toBe('number');
      }
    });

    it('should validate job ID format', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      // Test empty job ID
      await expect(caller.resume.getJobStatus({ jobId: '' }))
        .rejects
        .toThrow();
    });

    it('should return consistent results for same job ID', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const jobId = 'consistent-job-123';
      const result1 = await caller.resume.getJobStatus({ jobId });
      const result2 = await caller.resume.getJobStatus({ jobId });

      expect(result1).toEqual(result2);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle malformed file data', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const processData = {
        email: 'malformed@example.com',
        jobDescription: 'Valid job description for testing purposes.',
        templateId: 'tech-focus' as const,
        fileData: 'invalid-base64-data!@#$%',
        fileName: 'test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      };

      // Should not throw at the router level (validation happens in services)
      const result = await caller.resume.process(processData);
      expect(result.success).toBe(true); // Router accepts the request
    });

    it('should handle concurrent resume processing requests', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const mockFile = integrationTestHelpers.createMockFile();
      const promises = Array.from({ length: 5 }, (_, i) => 
        caller.resume.process({
          email: `concurrent${i}@example.com`,
          jobDescription: 'Software Engineer position requiring experience in web development.',
          templateId: 'tech-focus',
          fileData: mockFile.content,
          fileName: mockFile.fileName,
          fileSize: mockFile.fileSize,
          mimeType: mockFile.mimeType,
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data.jobId).toBeDefined();
      });

      // All job IDs should be unique
      const jobIds = results.map(r => r.data.jobId);
      const uniqueJobIds = new Set(jobIds);
      expect(uniqueJobIds.size).toBe(5);
    });

    it('should handle very long job descriptions', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const longDescription = 'A'.repeat(5000); // Very long job description
      const mockFile = integrationTestHelpers.createMockFile();

      const result = await caller.resume.process({
        email: 'longdesc@example.com',
        jobDescription: longDescription,
        templateId: 'tech-focus',
        fileData: mockFile.content,
        fileName: mockFile.fileName,
        fileSize: mockFile.fileSize,
        mimeType: mockFile.mimeType,
      });

      expect(result.success).toBe(true);
    });

    it('should handle special characters in file names', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const specialFileNames = [
        'résumé.pdf',
        'resume (final).pdf',
        'my_resume-v2.pdf',
        'resume & cover letter.pdf',
      ];

      for (let i = 0; i < specialFileNames.length; i++) {
        const mockFile = integrationTestHelpers.createMockFile({
          fileName: specialFileNames[i],
        });

        const result = await caller.resume.process({
          email: `special${i}@example.com`,
          jobDescription: 'Software Engineer position with requirements.',
          templateId: 'tech-focus',
          fileData: mockFile.content,
          fileName: mockFile.fileName,
          fileSize: mockFile.fileSize,
          mimeType: mockFile.mimeType,
        });

        expect(result.success).toBe(true);
      }
    });
  });

  describe('performance tests', () => {
    it('should handle multiple template requests efficiently', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const startTime = Date.now();

      // 20 concurrent template requests
      const promises = Array.from({ length: 20 }, () => 
        caller.resume.getTemplates()
      );

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should maintain response time under processing load', async () => {
      const ctx = await createTestContext();
      const caller = createTestCaller(ctx);

      const mockFile = integrationTestHelpers.createMockFile();
      const startTime = Date.now();

      // 10 concurrent processing requests
      const promises = Array.from({ length: 10 }, (_, i) => 
        caller.resume.process({
          email: `load${i}@example.com`,
          jobDescription: 'Software Engineer position requiring web development experience.',
          templateId: 'tech-focus',
          fileData: mockFile.content,
          fileName: mockFile.fileName,
          fileSize: mockFile.fileSize,
          mimeType: mockFile.mimeType,
        })
      );

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});