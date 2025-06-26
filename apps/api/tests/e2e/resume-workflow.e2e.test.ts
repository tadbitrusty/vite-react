import { test, expect } from './fixtures/test-data';

test.describe('Resume Processing Workflow E2E', () => {
  test('should complete full resume processing workflow', async ({ request, testData }) => {
    // Step 1: Get available templates
    const templatesResponse = await request.get('/trpc/resume.getTemplates');
    expect(templatesResponse.status()).toBe(200);
    
    const templatesBody = await templatesResponse.json();
    const templates = templatesBody.result.data;
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);

    // Step 2: Process resume with a template
    const processPayload = {
      email: testData.validUser.email,
      jobDescription: testData.jobDescription,
      templateId: 'tech-focus',
      fileData: testData.sampleResume.base64,
      fileName: testData.sampleResume.fileName,
      fileSize: testData.sampleResume.content.length,
      mimeType: 'application/pdf',
    };

    const processResponse = await request.post('/trpc/resume.process', {
      data: processPayload
    });
    
    expect(processResponse.status()).toBe(200);
    
    const processBody = await processResponse.json();
    expect(processBody.result.data.success).toBe(true);
    expect(processBody.result.data.data.jobId).toBeDefined();
    
    const jobId = processBody.result.data.data.jobId;

    // Step 3: Check job status
    const statusResponse = await request.get(`/trpc/resume.getJobStatus?input=${encodeURIComponent(JSON.stringify({ jobId }))}`);
    expect(statusResponse.status()).toBe(200);
    
    const statusBody = await statusResponse.json();
    expect(statusBody.result.data.jobId).toBe(jobId);
    expect(statusBody.result.data.status).toBeDefined();
    expect(typeof statusBody.result.data.progress).toBe('number');
  });

  test('should handle resume processing with all template types', async ({ request, testData }) => {
    for (const templateId of testData.templateIds) {
      const processPayload = {
        email: `${templateId}-test@example.com`,
        jobDescription: testData.jobDescription,
        templateId,
        fileData: testData.sampleResume.base64,
        fileName: `resume-${templateId}.pdf`,
        fileSize: testData.sampleResume.content.length,
        mimeType: 'application/pdf',
      };

      const response = await request.post('/trpc/resume.process', {
        data: processPayload
      });

      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body.result.data.success).toBe(true);
      expect(body.result.data.data.jobId).toBeDefined();
      expect(body.result.data.data.templateInfo.id).toBe(templateId);
    }
  });

  test('should validate input parameters properly', async ({ request }) => {
    // Test invalid email
    const invalidEmailPayload = {
      email: 'invalid-email-format',
      jobDescription: 'Valid job description',
      templateId: 'tech-focus',
      fileData: 'dGVzdA==', // base64 for "test"
      fileName: 'test.pdf',
      fileSize: 1000,
      mimeType: 'application/pdf',
    };

    const invalidEmailResponse = await request.post('/trpc/resume.process', {
      data: invalidEmailPayload
    });
    
    expect([400, 422]).toContain(invalidEmailResponse.status());

    // Test invalid template ID
    const invalidTemplatePayload = {
      email: 'valid@example.com',
      jobDescription: 'Valid job description',
      templateId: 'nonexistent-template',
      fileData: 'dGVzdA==',
      fileName: 'test.pdf',
      fileSize: 1000,
      mimeType: 'application/pdf',
    };

    const invalidTemplateResponse = await request.post('/trpc/resume.process', {
      data: invalidTemplatePayload
    });
    
    expect([400, 422]).toContain(invalidTemplateResponse.status());
  });

  test('should handle file upload edge cases', async ({ request, testData }) => {
    // Test with different file types
    const fileTypes = [
      { mimeType: 'application/pdf', fileName: 'resume.pdf' },
      { mimeType: 'application/msword', fileName: 'resume.doc' },
      { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fileName: 'resume.docx' },
    ];

    for (const fileType of fileTypes) {
      const payload = {
        email: `filetype-${fileType.fileName}@example.com`,
        jobDescription: testData.jobDescription,
        templateId: 'ats-optimized',
        fileData: testData.sampleResume.base64,
        fileName: fileType.fileName,
        fileSize: testData.sampleResume.content.length,
        mimeType: fileType.mimeType,
      };

      const response = await request.post('/trpc/resume.process', {
        data: payload
      });

      // PDF should work, other formats might be rejected
      if (fileType.mimeType === 'application/pdf') {
        expect(response.status()).toBe(200);
      } else {
        expect([200, 400, 422]).toContain(response.status());
      }
    }
  });

  test('should handle concurrent resume processing requests', async ({ request, testData }) => {
    const concurrentRequests = Array.from({ length: 5 }, (_, i) => {
      const payload = {
        email: `concurrent-${i}@example.com`,
        jobDescription: testData.jobDescription,
        templateId: 'tech-focus',
        fileData: testData.sampleResume.base64,
        fileName: `resume-${i}.pdf`,
        fileSize: testData.sampleResume.content.length,
        mimeType: 'application/pdf',
      };

      return request.post('/trpc/resume.process', { data: payload });
    });

    const responses = await Promise.all(concurrentRequests);
    
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });

    const bodies = await Promise.all(responses.map(r => r.json()));
    const jobIds = bodies.map(b => b.result.data.data.jobId);
    
    // All job IDs should be unique
    const uniqueJobIds = new Set(jobIds);
    expect(uniqueJobIds.size).toBe(5);
  });

  test('should maintain processing performance under load', async ({ request, testData }) => {
    const startTime = Date.now();
    
    // Process 3 resumes concurrently
    const loadTestRequests = Array.from({ length: 3 }, (_, i) => {
      const payload = {
        email: `load-test-${i}@example.com`,
        jobDescription: testData.jobDescription,
        templateId: 'ats-optimized', // Use free template for faster processing
        fileData: testData.sampleResume.base64,
        fileName: `load-test-${i}.pdf`,
        fileSize: testData.sampleResume.content.length,
        mimeType: 'application/pdf',
      };

      return request.post('/trpc/resume.process', { data: payload });
    });

    const responses = await Promise.all(loadTestRequests);
    const processingTime = Date.now() - startTime;
    
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });

    // Should complete within reasonable time (adjust based on server performance)
    expect(processingTime).toBeLessThan(10000); // 10 seconds
  });

  test('should handle job status polling correctly', async ({ request, testData }) => {
    // First, create a job
    const processPayload = {
      email: testData.validUser.email,
      jobDescription: testData.jobDescription,
      templateId: 'tech-focus',
      fileData: testData.sampleResume.base64,
      fileName: testData.sampleResume.fileName,
      fileSize: testData.sampleResume.content.length,
      mimeType: 'application/pdf',
    };

    const processResponse = await request.post('/trpc/resume.process', {
      data: processPayload
    });
    
    const processBody = await processResponse.json();
    const jobId = processBody.result.data.data.jobId;

    // Poll job status multiple times
    for (let i = 0; i < 3; i++) {
      const statusResponse = await request.get(`/trpc/resume.getJobStatus?input=${encodeURIComponent(JSON.stringify({ jobId }))}`);
      expect(statusResponse.status()).toBe(200);
      
      const statusBody = await statusResponse.json();
      expect(statusBody.result.data.jobId).toBe(jobId);
      expect(statusBody.result.data.status).toBeDefined();
      expect(typeof statusBody.result.data.progress).toBe('number');
      expect(statusBody.result.data.progress).toBeGreaterThanOrEqual(0);
      expect(statusBody.result.data.progress).toBeLessThanOrEqual(100);

      // Short delay between polls
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  });
});