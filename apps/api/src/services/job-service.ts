import Bull, { Job, Queue } from 'bull';
import { config } from '@resume-vita/config';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { aiService } from './ai-service';
import { fileService } from './file-service';
import { pdfService } from './pdf-service';
import { emailService } from './email-service';

// Job type definitions
const ResumeProcessingJobSchema = z.object({
  type: z.literal('resume-processing'),
  data: z.object({
    userId: z.string(),
    email: z.string().email(),
    resumeFileId: z.string(),
    jobDescription: z.string(),
    templateId: z.enum(['ats-optimized', 'entry-clean', 'tech-focus', 'professional-plus', 'executive-format']),
    isFirstTime: z.boolean(),
    paymentRequired: z.boolean(),
    paymentSessionId: z.string().optional(),
  }),
});

const ResumeBuilderJobSchema = z.object({
  type: z.literal('resume-builder'),
  data: z.object({
    userId: z.string(),
    email: z.string().email(),
    resumeData: z.any(), // ResumeBuilderData type
    templateId: z.enum(['ats-optimized', 'entry-clean', 'tech-focus', 'professional-plus', 'executive-format']),
    packageType: z.enum(['basic', 'enhanced']),
    paymentSessionId: z.string(),
  }),
});

const EmailDeliveryJobSchema = z.object({
  type: z.literal('email-delivery'),
  data: z.object({
    to: z.string().email(),
    templateType: z.enum(['resume-optimization', 'resume-builder', 'payment-confirmation']),
    templateData: z.any(),
    attachments: z.array(z.object({
      filename: z.string(),
      content: z.string(), // base64 encoded
      contentType: z.string(),
    })).optional(),
  }),
});

const CleanupJobSchema = z.object({
  type: z.literal('cleanup'),
  data: z.object({
    operation: z.enum(['old-files', 'expired-sessions', 'failed-jobs']),
    olderThanDays: z.number().optional(),
  }),
});

type JobData = 
  | z.infer<typeof ResumeProcessingJobSchema>
  | z.infer<typeof ResumeBuilderJobSchema>
  | z.infer<typeof EmailDeliveryJobSchema>
  | z.infer<typeof CleanupJobSchema>;

// Job queue configuration
const QUEUE_CONFIG = {
  redis: {
    host: config.env.REDIS_URL ? new URL(config.env.REDIS_URL).hostname : 'localhost',
    port: config.env.REDIS_URL ? parseInt(new URL(config.env.REDIS_URL).port) : 6379,
    password: config.env.REDIS_URL ? new URL(config.env.REDIS_URL).password : undefined,
  },
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
  },
};

class JobService {
  private queues: Map<string, Queue> = new Map();

  constructor() {
    this.initializeQueues();
  }

  /**
   * Initialize job queues
   */
  private initializeQueues(): void {
    // Main processing queue
    const mainQueue = new Bull('resume-processing', {
      redis: QUEUE_CONFIG.redis,
      defaultJobOptions: QUEUE_CONFIG.defaultJobOptions,
    });

    // Email delivery queue
    const emailQueue = new Bull('email-delivery', {
      redis: QUEUE_CONFIG.redis,
      defaultJobOptions: {
        ...QUEUE_CONFIG.defaultJobOptions,
        attempts: 5, // More retries for email
      },
    });

    // Cleanup queue
    const cleanupQueue = new Bull('cleanup', {
      redis: QUEUE_CONFIG.redis,
      defaultJobOptions: {
        ...QUEUE_CONFIG.defaultJobOptions,
        attempts: 1, // Don't retry cleanup jobs
      },
    });

    this.queues.set('main', mainQueue);
    this.queues.set('email', emailQueue);
    this.queues.set('cleanup', cleanupQueue);

    // Set up job processors
    this.setupJobProcessors();
  }

  /**
   * Setup job processors for each queue
   */
  private setupJobProcessors(): void {
    const mainQueue = this.queues.get('main')!;
    const emailQueue = this.queues.get('email')!;
    const cleanupQueue = this.queues.get('cleanup')!;

    // Main processing queue handlers
    mainQueue.process('resume-processing', 5, this.processResumeJob.bind(this));
    mainQueue.process('resume-builder', 3, this.processResumeBuilderJob.bind(this));

    // Email queue handler
    emailQueue.process('email-delivery', 10, this.processEmailJob.bind(this));

    // Cleanup queue handler
    cleanupQueue.process('cleanup', 1, this.processCleanupJob.bind(this));

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for monitoring
   */
  private setupEventListeners(): void {
    for (const [name, queue] of this.queues) {
      queue.on('completed', (job) => {
        console.log(`[${name}] Job ${job.id} completed successfully`);
      });

      queue.on('failed', (job, err) => {
        console.error(`[${name}] Job ${job.id} failed:`, err);
      });

      queue.on('stalled', (job) => {
        console.warn(`[${name}] Job ${job.id} stalled`);
      });
    }
  }

  /**
   * Add resume processing job
   */
  async addResumeProcessingJob(data: z.infer<typeof ResumeProcessingJobSchema>['data']): Promise<string> {
    const mainQueue = this.queues.get('main')!;
    
    const job = await mainQueue.add('resume-processing', data, {
      priority: data.paymentRequired ? 1 : 5, // Paid jobs get higher priority
      delay: 0,
    });

    // Update database with job tracking
    await prisma.resumeJob.create({
      data: {
        id: job.id!.toString(),
        resumeId: data.resumeFileId,
        jobType: 'RESUME_OPTIMIZATION',
        templateId: data.templateId,
        jobDescription: data.jobDescription,
        input: data as any,
        status: 'PENDING',
        priority: data.paymentRequired ? 1 : 5,
      },
    });

    return job.id!.toString();
  }

  /**
   * Add resume builder job
   */
  async addResumeBuilderJob(data: z.infer<typeof ResumeBuilderJobSchema>['data']): Promise<string> {
    const mainQueue = this.queues.get('main')!;
    
    const job = await mainQueue.add('resume-builder', data, {
      priority: data.packageType === 'enhanced' ? 1 : 3,
      delay: 0,
    });

    // Create resume record first
    const resume = await prisma.resume.create({
      data: {
        userId: data.userId,
        fileName: `${data.resumeData.personalInfo.fullName}_${data.templateId}.pdf`,
        originalName: `${data.resumeData.personalInfo.fullName}_resume_builder.json`,
        fileSize: JSON.stringify(data.resumeData).length,
        mimeType: 'application/json',
        contentHash: Buffer.from(JSON.stringify(data.resumeData)).toString('hex'),
        extractedText: JSON.stringify(data.resumeData),
        parsedData: data.resumeData,
        status: 'PROCESSING',
      },
    });

    await prisma.resumeJob.create({
      data: {
        id: job.id!.toString(),
        resumeId: resume.id,
        jobType: 'TEMPLATE_GENERATION',
        templateId: data.templateId,
        input: data as any,
        status: 'PENDING',
        priority: data.packageType === 'enhanced' ? 1 : 3,
      },
    });

    return job.id!.toString();
  }

  /**
   * Add email delivery job
   */
  async addEmailJob(data: z.infer<typeof EmailDeliveryJobSchema>['data']): Promise<string> {
    const emailQueue = this.queues.get('email')!;
    
    const job = await emailQueue.add('email-delivery', data, {
      priority: 1,
      delay: 0,
    });

    return job.id!.toString();
  }

  /**
   * Process resume optimization job
   */
  private async processResumeJob(job: Job): Promise<any> {
    const data = ResumeProcessingJobSchema.parse({ type: 'resume-processing', data: job.data }).data;
    
    try {
      // Update job status
      await this.updateJobStatus(job.id.toString(), 'PROCESSING');
      
      // Get file content
      const fileStatus = await fileService.getFileStatus(data.resumeFileId, data.userId);
      if (!fileStatus.extractedText) {
        throw new Error('Resume file not processed yet');
      }

      // Optimize resume with AI
      job.progress(25);
      const optimization = await aiService.optimizeResume({
        resumeText: fileStatus.extractedText,
        jobDescription: data.jobDescription,
        templateType: data.templateId,
      });

      // Generate PDF
      job.progress(50);
      const pdfResult = await pdfService.generatePDF({
        templateId: data.templateId,
        resumeContent: optimization.optimizedContent,
        personalInfo: fileStatus.parsedData?.personalInfo || {
          fullName: 'Resume User',
          email: data.email,
          phone: '',
          location: '',
        },
        fileName: `optimized_${data.templateId}_resume.pdf`,
      });

      // Send email with attachment
      job.progress(75);
      await this.addEmailJob({
        to: data.email,
        templateType: 'resume-optimization',
        templateData: {
          userName: fileStatus.parsedData?.personalInfo?.fullName || 'User',
          templateName: data.templateId,
          optimizationFeatures: optimization.improvements,
          atsScore: optimization.atsScore,
          keywordMatches: optimization.keywordMatches,
          improvements: optimization.improvements,
          processingTime: '2-3 minutes',
        },
        attachments: [{
          filename: pdfResult.fileName,
          content: pdfResult.pdfBuffer.toString('base64'),
          contentType: 'application/pdf',
        }],
      });

      // Complete job
      job.progress(100);
      await this.updateJobStatus(job.id.toString(), 'COMPLETED', {
        optimizationResults: optimization,
        pdfGenerated: true,
        emailSent: true,
      });

      return {
        success: true,
        optimizedResume: optimization,
        pdfGenerated: true,
        emailSent: true,
      };
    } catch (error) {
      console.error('Resume processing job failed:', error);
      await this.updateJobStatus(job.id.toString(), 'FAILED', null, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Process resume builder job
   */
  private async processResumeBuilderJob(job: Job): Promise<any> {
    const data = ResumeBuilderJobSchema.parse({ type: 'resume-builder', data: job.data }).data;
    
    try {
      // Update job status
      await this.updateJobStatus(job.id.toString(), 'PROCESSING');
      
      // Build resume with AI
      job.progress(25);
      const resumeResult = await aiService.buildResume({
        personalInfo: data.resumeData.personalInfo,
        professionalSummary: data.resumeData.professionalSummary,
        workExperience: data.resumeData.workExperience,
        education: data.resumeData.education,
        skills: data.resumeData.skills,
        certifications: data.resumeData.certifications,
        templateType: data.templateId,
      });

      // Generate PDF
      job.progress(50);
      const pdfResult = await pdfService.generatePDF({
        templateId: data.templateId,
        resumeContent: resumeResult.formattedResume,
        personalInfo: data.resumeData.personalInfo,
        fileName: `${data.resumeData.personalInfo.fullName}_${data.templateId}.pdf`,
      });

      // Send email with attachment
      job.progress(75);
      await this.addEmailJob({
        to: data.email,
        templateType: 'resume-builder',
        templateData: {
          userName: data.resumeData.personalInfo.fullName,
          packageType: data.packageType,
          templateName: data.templateId,
          features: data.packageType === 'enhanced' 
            ? ['Professional Resume', 'ATS Optimization', 'Custom Design', 'Career Guidance']
            : ['Professional Resume', 'ATS Optimization'],
          nextSteps: [
            'Download your professionally crafted resume',
            'Review and make any personal adjustments',
            'Start applying to your target positions',
            'Keep your resume updated with new achievements',
          ],
        },
        attachments: [{
          filename: pdfResult.fileName,
          content: pdfResult.pdfBuffer.toString('base64'),
          contentType: 'application/pdf',
        }],
      });

      // Complete job
      job.progress(100);
      await this.updateJobStatus(job.id.toString(), 'COMPLETED', {
        resumeBuilt: true,
        pdfGenerated: true,
        emailSent: true,
      });

      return {
        success: true,
        resumeBuilt: true,
        pdfGenerated: true,
        emailSent: true,
      };
    } catch (error) {
      console.error('Resume builder job failed:', error);
      await this.updateJobStatus(job.id.toString(), 'FAILED', null, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Process email delivery job
   */
  private async processEmailJob(job: Job): Promise<any> {
    const data = EmailDeliveryJobSchema.parse({ type: 'email-delivery', data: job.data }).data;
    
    try {
      // Convert base64 attachments to buffers
      const attachments = data.attachments?.map(att => ({
        filename: att.filename,
        content: Buffer.from(att.content, 'base64'),
        contentType: att.contentType,
      }));

      const result = await emailService.sendEmail({
        to: data.to,
        templateType: data.templateType,
        templateData: data.templateData,
        attachments,
      });

      if (!result.success) {
        throw new Error(result.errorMessage || 'Email delivery failed');
      }

      return result;
    } catch (error) {
      console.error('Email delivery job failed:', error);
      throw error;
    }
  }

  /**
   * Process cleanup job
   */
  private async processCleanupJob(job: Job): Promise<any> {
    const data = CleanupJobSchema.parse({ type: 'cleanup', data: job.data }).data;
    
    try {
      switch (data.operation) {
        case 'old-files':
          const cleaned = await fileService.cleanupOldFiles(data.olderThanDays || 30);
          return { filesRemoved: cleaned };
          
        case 'expired-sessions':
          // Clean up expired Stripe sessions and failed jobs
          const expiredJobs = await prisma.resumeJob.updateMany({
            where: {
              status: 'PENDING',
              createdAt: {
                lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours old
              },
            },
            data: { status: 'CANCELLED' },
          });
          return { expiredJobs: expiredJobs.count };
          
        case 'failed-jobs':
          // Clean up old failed jobs
          const failedJobs = await prisma.resumeJob.deleteMany({
            where: {
              status: 'FAILED',
              createdAt: {
                lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days old
              },
            },
          });
          return { failedJobsRemoved: failedJobs.count };
          
        default:
          throw new Error(`Unknown cleanup operation: ${data.operation}`);
      }
    } catch (error) {
      console.error('Cleanup job failed:', error);
      throw error;
    }
  }

  /**
   * Update job status in database
   */
  private async updateJobStatus(
    jobId: string,
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
    output?: any,
    error?: string
  ): Promise<void> {
    const updateData: any = { status };
    
    if (status === 'PROCESSING') {
      updateData.startedAt = new Date();
    } else if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
      updateData.output = output;
    } else if (status === 'FAILED') {
      updateData.failedAt = new Date();
      updateData.error = error;
    }

    await prisma.resumeJob.update({
      where: { id: jobId },
      data: updateData,
    });
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    status: string;
    progress: number;
    result?: any;
    error?: string;
  }> {
    // Get from database
    const dbJob = await prisma.resumeJob.findUnique({
      where: { id: jobId },
    });

    if (!dbJob) {
      throw new Error('Job not found');
    }

    // Get from queue if still active
    const queueName = dbJob.jobType === 'EMAIL_DELIVERY' ? 'email' : 'main';
    const queue = this.queues.get(queueName);
    
    if (queue) {
      const job = await queue.getJob(jobId);
      if (job) {
        return {
          status: dbJob.status,
          progress: job.progress(),
          result: dbJob.output,
          error: dbJob.error,
        };
      }
    }

    return {
      status: dbJob.status,
      progress: dbJob.status === 'COMPLETED' ? 100 : 0,
      result: dbJob.output,
      error: dbJob.error,
    };
  }

  /**
   * Schedule recurring cleanup jobs
   */
  async scheduleCleanupJobs(): Promise<void> {
    const cleanupQueue = this.queues.get('cleanup')!;
    
    // Daily file cleanup
    await cleanupQueue.add('cleanup', {
      operation: 'old-files',
      olderThanDays: 30,
    }, {
      repeat: { cron: '0 2 * * *' }, // 2 AM daily
      jobId: 'daily-file-cleanup',
    });

    // Hourly session cleanup
    await cleanupQueue.add('cleanup', {
      operation: 'expired-sessions',
    }, {
      repeat: { cron: '0 * * * *' }, // Every hour
      jobId: 'hourly-session-cleanup',
    });

    // Weekly failed job cleanup
    await cleanupQueue.add('cleanup', {
      operation: 'failed-jobs',
    }, {
      repeat: { cron: '0 3 * * 0' }, // 3 AM every Sunday
      jobId: 'weekly-failed-job-cleanup',
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    [queueName: string]: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
  }> {
    const stats: any = {};
    
    for (const [name, queue] of this.queues) {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();
      const delayed = await queue.getDelayed();
      
      stats[name] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      };
    }
    
    return stats;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    for (const [name, queue] of this.queues) {
      console.log(`Closing queue: ${name}`);
      await queue.close();
    }
  }
}

// Export singleton instance
export const jobService = new JobService();
export type { JobData };