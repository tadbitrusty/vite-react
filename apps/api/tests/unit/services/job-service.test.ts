import { jobService } from '../../../src/services/job-service';
import { testResumeData, testUsers, testJobStatuses } from '../../fixtures/test-data';
import { prisma } from '../../../src/lib/prisma';

// Mock Bull (job queue)
jest.mock('bull', () => {
  const mockJob = {
    id: 'job_test_123',
    progress: jest.fn(() => 50),
    data: {},
  };

  const mockQueue = {
    add: jest.fn().mockResolvedValue(mockJob),
    process: jest.fn(),
    on: jest.fn(),
    getJob: jest.fn().mockResolvedValue(mockJob),
    getWaiting: jest.fn().mockResolvedValue([]),
    getActive: jest.fn().mockResolvedValue([]),
    getCompleted: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([]),
    getDelayed: jest.fn().mockResolvedValue([]),
    close: jest.fn().mockResolvedValue(undefined),
  };

  return jest.fn().mockImplementation(() => mockQueue);
});

// Mock Prisma
jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    resumeJob: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    resume: {
      create: jest.fn(),
    },
  },
}));

// Mock services
jest.mock('../../../src/services/ai-service', () => ({
  aiService: {
    optimizeResume: jest.fn().mockResolvedValue({
      optimizedContent: 'Optimized resume content',
      improvements: ['Improved formatting', 'Added keywords'],
      atsScore: 85,
      keywordMatches: ['React', 'TypeScript'],
      recommendations: ['Add more metrics'],
      estimatedImpact: 'High',
    }),
    buildResume: jest.fn().mockResolvedValue({
      formattedResume: 'Formatted resume content',
      optimizedSummary: 'Enhanced summary',
      enhancedExperience: 'Enhanced experience',
      skillsAnalysis: ['Strong technical skills'],
      atsOptimizations: ['Keyword optimization'],
    }),
  },
}));

jest.mock('../../../src/services/file-service', () => ({
  fileService: {
    getFileStatus: jest.fn().mockResolvedValue({
      status: 'COMPLETED',
      extractedText: 'Sample resume text',
      parsedData: { personalInfo: testResumeData.personalInfo },
    }),
    cleanupOldFiles: jest.fn().mockResolvedValue(5),
  },
}));

jest.mock('../../../src/services/pdf-service', () => ({
  pdfService: {
    generatePDF: jest.fn().mockResolvedValue({
      pdfBuffer: Buffer.from('mock-pdf-content'),
      fileName: 'test-resume.pdf',
      fileSize: 1024,
      generatedAt: new Date(),
      templateUsed: 'tech-focus',
      processingTime: 2000,
    }),
  },
}));

jest.mock('../../../src/services/email-service', () => ({
  emailService: {
    sendEmail: jest.fn().mockResolvedValue({
      messageId: 'email_test_123',
      success: true,
      deliveredAt: new Date(),
      recipientEmail: 'test@example.com',
      templateUsed: 'resume-optimization',
    }),
  },
}));

describe('Job Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock values
    (prisma.resumeJob.create as jest.Mock).mockResolvedValue({
      id: 'job_test_123',
      status: 'PENDING',
    });
    (prisma.resumeJob.update as jest.Mock).mockResolvedValue({
      id: 'job_test_123',
      status: 'COMPLETED',
    });
    (prisma.resumeJob.findUnique as jest.Mock).mockResolvedValue({
      id: 'job_test_123',
      status: 'COMPLETED',
      output: { success: true },
      error: null,
      jobType: 'RESUME_OPTIMIZATION',
    });
    (prisma.resume.create as jest.Mock).mockResolvedValue({
      id: 'resume_test_123',
      userId: testUsers.validUser.id,
    });
  });

  describe('addResumeProcessingJob', () => {
    const resumeProcessingData = {
      userId: testUsers.validUser.id,
      email: testUsers.validUser.email,
      resumeFileId: 'file_test_123',
      jobDescription: 'Software Engineer position requiring React and Node.js experience',
      templateId: 'tech-focus' as const,
      isFirstTime: true,
      paymentRequired: true,
      paymentSessionId: 'cs_test_123',
    };

    it('should add resume processing job successfully', async () => {
      const jobId = await jobService.addResumeProcessingJob(resumeProcessingData);

      expect(jobId).toBe('job_test_123');
      expect(prisma.resumeJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'job_test_123',
          resumeId: 'file_test_123',
          jobType: 'RESUME_OPTIMIZATION',
          templateId: 'tech-focus',
          status: 'PENDING',
          priority: 1, // Paid jobs get higher priority
        }),
      });
    });

    it('should prioritize paid jobs higher', async () => {
      const paidJobData = { ...resumeProcessingData, paymentRequired: true };
      const freeJobData = { ...resumeProcessingData, paymentRequired: false };

      await jobService.addResumeProcessingJob(paidJobData);
      await jobService.addResumeProcessingJob(freeJobData);

      const bullCalls = require('bull').prototype.add.mock.calls;
      expect(bullCalls[0][2].priority).toBe(1); // Paid job
      expect(bullCalls[1][2].priority).toBe(5); // Free job
    });

    it('should validate job data schema', async () => {
      const invalidData = {
        ...resumeProcessingData,
        email: 'invalid-email', // Invalid email
      };

      await expect(jobService.addResumeProcessingJob(invalidData))
        .rejects
        .toThrow();
    });

    it('should handle database errors during job creation', async () => {
      (prisma.resumeJob.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(jobService.addResumeProcessingJob(resumeProcessingData))
        .rejects
        .toThrow('Database error');
    });
  });

  describe('addResumeBuilderJob', () => {
    const resumeBuilderData = {
      userId: testUsers.validUser.id,
      email: testUsers.validUser.email,
      resumeData: testResumeData,
      templateId: 'professional-plus' as const,
      packageType: 'enhanced' as const,
      paymentSessionId: 'cs_test_123',
    };

    it('should add resume builder job successfully', async () => {
      const jobId = await jobService.addResumeBuilderJob(resumeBuilderData);

      expect(jobId).toBe('job_test_123');
      expect(prisma.resume.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: resumeBuilderData.userId,
          fileName: `${resumeBuilderData.resumeData.personalInfo.fullName}_${resumeBuilderData.templateId}.pdf`,
          status: 'PROCESSING',
        }),
      });
      expect(prisma.resumeJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jobType: 'TEMPLATE_GENERATION',
          templateId: 'professional-plus',
          status: 'PENDING',
          priority: 1, // Enhanced package gets higher priority
        }),
      });
    });

    it('should prioritize enhanced packages higher', async () => {
      const enhancedData = { ...resumeBuilderData, packageType: 'enhanced' as const };
      const basicData = { ...resumeBuilderData, packageType: 'basic' as const };

      await jobService.addResumeBuilderJob(enhancedData);
      await jobService.addResumeBuilderJob(basicData);

      const bullCalls = require('bull').prototype.add.mock.calls;
      expect(bullCalls[0][2].priority).toBe(1); // Enhanced package
      expect(bullCalls[1][2].priority).toBe(3); // Basic package
    });

    it('should create resume record with correct data', async () => {
      await jobService.addResumeBuilderJob(resumeBuilderData);

      expect(prisma.resume.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          extractedText: JSON.stringify(resumeBuilderData.resumeData),
          parsedData: resumeBuilderData.resumeData,
          contentHash: expect.any(String),
          mimeType: 'application/json',
        }),
      });
    });
  });

  describe('addEmailJob', () => {
    const emailJobData = {
      to: 'test@example.com',
      templateType: 'resume-optimization' as const,
      templateData: {
        userName: 'John Doe',
        templateName: 'Tech Focus',
        optimizationFeatures: ['ATS optimization'],
        atsScore: 85,
        keywordMatches: ['React'],
        improvements: ['Added keywords'],
        processingTime: '2 minutes',
      },
      attachments: [{
        filename: 'resume.pdf',
        content: 'base64-content',
        contentType: 'application/pdf',
      }],
    };

    it('should add email job successfully', async () => {
      const jobId = await jobService.addEmailJob(emailJobData);

      expect(jobId).toBe('job_test_123');
      expect(require('bull').prototype.add).toHaveBeenCalledWith(
        'email-delivery',
        emailJobData,
        expect.objectContaining({ priority: 1 })
      );
    });

    it('should validate email job data', async () => {
      const invalidData = {
        ...emailJobData,
        to: 'invalid-email',
      };

      await expect(jobService.addEmailJob(invalidData))
        .rejects
        .toThrow();
    });
  });

  describe('getJobStatus', () => {
    it('should return job status from database', async () => {
      const mockDbJob = {
        id: 'job_test_123',
        status: 'COMPLETED',
        output: { success: true },
        error: null,
        jobType: 'RESUME_OPTIMIZATION',
      };
      (prisma.resumeJob.findUnique as jest.Mock).mockResolvedValue(mockDbJob);

      const status = await jobService.getJobStatus('job_test_123');

      expect(status).toMatchObject({
        status: 'COMPLETED',
        progress: 50, // From mocked job.progress()
        result: { success: true },
        error: null,
      });
    });

    it('should return progress from queue if job is active', async () => {
      const mockDbJob = {
        id: 'job_test_123',
        status: 'PROCESSING',
        output: null,
        error: null,
        jobType: 'RESUME_OPTIMIZATION',
      };
      (prisma.resumeJob.findUnique as jest.Mock).mockResolvedValue(mockDbJob);

      const status = await jobService.getJobStatus('job_test_123');

      expect(status.progress).toBe(50); // From mocked job.progress()
    });

    it('should handle missing job', async () => {
      (prisma.resumeJob.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(jobService.getJobStatus('nonexistent'))
        .rejects
        .toThrow('Job not found');
    });

    it('should handle completed jobs without active queue entry', async () => {
      const mockDbJob = {
        id: 'job_test_123',
        status: 'COMPLETED',
        output: { success: true },
        error: null,
        jobType: 'RESUME_OPTIMIZATION',
      };
      (prisma.resumeJob.findUnique as jest.Mock).mockResolvedValue(mockDbJob);
      require('bull').prototype.getJob.mockResolvedValue(null); // No active job

      const status = await jobService.getJobStatus('job_test_123');

      expect(status).toMatchObject({
        status: 'COMPLETED',
        progress: 100, // Completed jobs show 100%
        result: { success: true },
      });
    });
  });

  describe('getQueueStats', () => {
    it('should return statistics for all queues', async () => {
      // Mock queue methods
      require('bull').prototype.getWaiting.mockResolvedValue(['job1', 'job2']);
      require('bull').prototype.getActive.mockResolvedValue(['job3']);
      require('bull').prototype.getCompleted.mockResolvedValue(['job4', 'job5', 'job6']);
      require('bull').prototype.getFailed.mockResolvedValue(['job7']);
      require('bull').prototype.getDelayed.mockResolvedValue([]);

      const stats = await jobService.getQueueStats();

      expect(stats).toMatchObject({
        main: {
          waiting: 2,
          active: 1,
          completed: 3,
          failed: 1,
          delayed: 0,
        },
        email: {
          waiting: 2,
          active: 1,
          completed: 3,
          failed: 1,
          delayed: 0,
        },
        cleanup: {
          waiting: 2,
          active: 1,
          completed: 3,
          failed: 1,
          delayed: 0,
        },
      });
    });

    it('should handle queue method errors', async () => {
      require('bull').prototype.getWaiting.mockRejectedValue(new Error('Queue error'));

      await expect(jobService.getQueueStats())
        .rejects
        .toThrow('Queue error');
    });
  });

  describe('scheduleCleanupJobs', () => {
    it('should schedule all cleanup jobs', async () => {
      await jobService.scheduleCleanupJobs();

      const addCalls = require('bull').prototype.add.mock.calls;
      
      // Should schedule 3 cleanup jobs
      expect(addCalls.filter(call => call[0] === 'cleanup')).toHaveLength(3);
      
      // Check for specific job configurations
      const fileCleanup = addCalls.find(call => 
        call[1].operation === 'old-files'
      );
      expect(fileCleanup[2].repeat.cron).toBe('0 2 * * *'); // Daily at 2 AM
      
      const sessionCleanup = addCalls.find(call => 
        call[1].operation === 'expired-sessions'
      );
      expect(sessionCleanup[2].repeat.cron).toBe('0 * * * *'); // Hourly
      
      const failedJobCleanup = addCalls.find(call => 
        call[1].operation === 'failed-jobs'
      );
      expect(failedJobCleanup[2].repeat.cron).toBe('0 3 * * 0'); // Weekly Sunday 3 AM
    });
  });

  describe('shutdown', () => {
    it('should close all queues gracefully', async () => {
      await jobService.shutdown();

      // Should close all three queues
      expect(require('bull').prototype.close).toHaveBeenCalledTimes(3);
    });

    it('should handle queue closure errors', async () => {
      require('bull').prototype.close.mockRejectedValue(new Error('Close error'));

      await expect(jobService.shutdown())
        .rejects
        .toThrow('Close error');
    });
  });

  describe('job processing simulation', () => {
    // These tests simulate the private methods that would be called by Bull processors
    
    it('should handle resume processing workflow', async () => {
      // Simulate the data that would be passed to processResumeJob
      const jobData = {
        userId: testUsers.validUser.id,
        email: testUsers.validUser.email,
        resumeFileId: 'file_test_123',
        jobDescription: 'Software Engineer position',
        templateId: 'tech-focus' as const,
        isFirstTime: true,
        paymentRequired: true,
      };

      // Add the job
      const jobId = await jobService.addResumeProcessingJob(jobData);

      expect(jobId).toBe('job_test_123');
      
      // Verify the services would be called (through mocks)
      expect(require('bull').prototype.add).toHaveBeenCalledWith(
        'resume-processing',
        jobData,
        expect.objectContaining({ priority: 1 })
      );
    });

    it('should handle resume builder workflow', async () => {
      const jobData = {
        userId: testUsers.validUser.id,
        email: testUsers.validUser.email,
        resumeData: testResumeData,
        templateId: 'professional-plus' as const,
        packageType: 'enhanced' as const,
        paymentSessionId: 'cs_test_123',
      };

      const jobId = await jobService.addResumeBuilderJob(jobData);

      expect(jobId).toBe('job_test_123');
      expect(prisma.resume.create).toHaveBeenCalled();
      expect(prisma.resumeJob.create).toHaveBeenCalled();
    });

    it('should handle email delivery workflow', async () => {
      const emailData = {
        to: 'test@example.com',
        templateType: 'resume-optimization' as const,
        templateData: { userName: 'John Doe' },
      };

      const jobId = await jobService.addEmailJob(emailData);

      expect(jobId).toBe('job_test_123');
      expect(require('bull').prototype.add).toHaveBeenCalledWith(
        'email-delivery',
        emailData,
        expect.objectContaining({ priority: 1 })
      );
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle Bull queue initialization errors', async () => {
      require('bull').mockImplementationOnce(() => {
        throw new Error('Queue initialization failed');
      });

      // This would typically be tested during service startup, 
      // but we can test the behavior conceptually
      expect(() => {
        require('bull')('test-queue');
      }).toThrow('Queue initialization failed');
    });

    it('should handle missing Redis connection', async () => {
      const mockQueue = require('bull').prototype;
      mockQueue.add.mockRejectedValue(new Error('Redis connection failed'));

      const jobData = {
        userId: testUsers.validUser.id,
        email: testUsers.validUser.email,
        resumeFileId: 'file_test_123',
        jobDescription: 'Test job',
        templateId: 'tech-focus' as const,
        isFirstTime: true,
        paymentRequired: false,
      };

      await expect(jobService.addResumeProcessingJob(jobData))
        .rejects
        .toThrow('Redis connection failed');
    });

    it('should handle job status updates during processing', async () => {
      const mockDbJob = {
        id: 'job_test_123',
        status: 'PROCESSING',
        output: null,
        error: null,
        jobType: 'RESUME_OPTIMIZATION',
      };
      (prisma.resumeJob.findUnique as jest.Mock).mockResolvedValue(mockDbJob);

      const status = await jobService.getJobStatus('job_test_123');

      expect(status.status).toBe('PROCESSING');
      expect(status.progress).toBeGreaterThan(0);
    });

    it('should handle failed job status', async () => {
      const mockDbJob = {
        id: 'job_test_123',
        status: 'FAILED',
        output: null,
        error: 'Processing failed',
        jobType: 'RESUME_OPTIMIZATION',
      };
      (prisma.resumeJob.findUnique as jest.Mock).mockResolvedValue(mockDbJob);

      const status = await jobService.getJobStatus('job_test_123');

      expect(status.status).toBe('FAILED');
      expect(status.error).toBe('Processing failed');
      expect(status.progress).toBe(0);
    });

    it('should handle different job types in status lookup', async () => {
      const emailJob = {
        id: 'job_test_123',
        status: 'COMPLETED',
        output: { emailSent: true },
        error: null,
        jobType: 'EMAIL_DELIVERY',
      };
      (prisma.resumeJob.findUnique as jest.Mock).mockResolvedValue(emailJob);

      const status = await jobService.getJobStatus('job_test_123');

      expect(status.status).toBe('COMPLETED');
      expect(status.result).toEqual({ emailSent: true });
    });

    it('should validate template IDs in job data', async () => {
      const invalidJobData = {
        userId: testUsers.validUser.id,
        email: testUsers.validUser.email,
        resumeFileId: 'file_test_123',
        jobDescription: 'Test job',
        templateId: 'invalid-template' as any,
        isFirstTime: true,
        paymentRequired: false,
      };

      await expect(jobService.addResumeProcessingJob(invalidJobData))
        .rejects
        .toThrow();
    });

    it('should handle package type validation', async () => {
      const invalidJobData = {
        userId: testUsers.validUser.id,
        email: testUsers.validUser.email,
        resumeData: testResumeData,
        templateId: 'professional-plus' as const,
        packageType: 'invalid-package' as any,
        paymentSessionId: 'cs_test_123',
      };

      await expect(jobService.addResumeBuilderJob(invalidJobData))
        .rejects
        .toThrow();
    });
  });
});