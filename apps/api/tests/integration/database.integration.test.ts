import { TestDatabase, integrationTestHelpers, prisma } from './setup';

describe('Database Integration Tests', () => {
  describe('user operations', () => {
    beforeEach(async () => {
      await TestDatabase.cleanup();
    });

    it('should create and retrieve users', async () => {
      const userData = {
        email: 'dbtest@example.com',
        name: 'Database Test User',
        phone: '+1234567890',
        location: 'Test City, TC',
      };

      const createdUser = await prisma.user.create({ data: userData });

      expect(createdUser).toHaveProperty('id');
      expect(createdUser.email).toBe(userData.email);
      expect(createdUser.name).toBe(userData.name);
      expect(createdUser.isFirstTime).toBe(true);
      expect(createdUser.emailVerified).toBe(false);
      expect(createdUser.createdAt).toBeInstanceOf(Date);
      expect(createdUser.updatedAt).toBeInstanceOf(Date);

      // Retrieve the user
      const retrievedUser = await prisma.user.findUnique({
        where: { id: createdUser.id },
      });

      expect(retrievedUser).toEqual(createdUser);
    });

    it('should handle unique email constraint', async () => {
      const userData = {
        email: 'unique@example.com',
        name: 'First User',
      };

      // Create first user
      await prisma.user.create({ data: userData });

      // Try to create second user with same email
      await expect(
        prisma.user.create({
          data: {
            email: 'unique@example.com',
            name: 'Second User',
          },
        })
      ).rejects.toThrow();
    });

    it('should update user information', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'update@example.com',
          name: 'Original Name',
          isFirstTime: true,
        },
      });

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: 'Updated Name',
          isFirstTime: false,
          emailVerified: true,
          lastLoginAt: new Date(),
        },
      });

      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.isFirstTime).toBe(false);
      expect(updatedUser.emailVerified).toBe(true);
      expect(updatedUser.lastLoginAt).toBeInstanceOf(Date);
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());
    });

    it('should handle user deletion', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'delete@example.com',
          name: 'Delete Me',
        },
      });

      await prisma.user.delete({
        where: { id: user.id },
      });

      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(deletedUser).toBeNull();
    });
  });

  describe('resume operations', () => {
    let testUser: any;

    beforeEach(async () => {
      await TestDatabase.cleanup();
      testUser = await prisma.user.create({
        data: {
          email: 'resumetest@example.com',
          name: 'Resume Test User',
        },
      });
    });

    it('should create and retrieve resumes', async () => {
      const resumeData = {
        userId: testUser.id,
        fileName: 'test-resume.pdf',
        originalName: 'My Resume.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        contentHash: 'abc123def456',
        extractedText: 'Sample resume text content',
        parsedData: {
          personalInfo: {
            name: 'Test User',
            email: 'test@example.com',
          },
          sections: {
            experience: [],
            education: [],
            skills: ['JavaScript', 'TypeScript'],
          },
        },
        status: 'COMPLETED' as const,
      };

      const createdResume = await prisma.resume.create({ data: resumeData });

      expect(createdResume).toHaveProperty('id');
      expect(createdResume.userId).toBe(testUser.id);
      expect(createdResume.fileName).toBe(resumeData.fileName);
      expect(createdResume.status).toBe('COMPLETED');
      expect(createdResume.parsedData).toEqual(resumeData.parsedData);
      expect(createdResume.createdAt).toBeInstanceOf(Date);

      // Retrieve with user relation
      const resumeWithUser = await prisma.resume.findUnique({
        where: { id: createdResume.id },
        include: { user: true },
      });

      expect(resumeWithUser?.user.email).toBe(testUser.email);
    });

    it('should handle resume status updates', async () => {
      const resume = await prisma.resume.create({
        data: {
          userId: testUser.id,
          fileName: 'status-test.pdf',
          originalName: 'status-test.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          contentHash: 'status123',
          status: 'UPLOADED',
        },
      });

      // Update to processing
      const processingResume = await prisma.resume.update({
        where: { id: resume.id },
        data: { status: 'PROCESSING' },
      });

      expect(processingResume.status).toBe('PROCESSING');

      // Update to completed with extracted text
      const completedResume = await prisma.resume.update({
        where: { id: resume.id },
        data: {
          status: 'COMPLETED',
          extractedText: 'Extracted content',
          parsedData: { test: 'data' },
        },
      });

      expect(completedResume.status).toBe('COMPLETED');
      expect(completedResume.extractedText).toBe('Extracted content');
    });

    it('should cascade delete resumes when user is deleted', async () => {
      const resume = await prisma.resume.create({
        data: {
          userId: testUser.id,
          fileName: 'cascade-test.pdf',
          originalName: 'cascade-test.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          contentHash: 'cascade123',
        },
      });

      // Delete user
      await prisma.user.delete({
        where: { id: testUser.id },
      });

      // Resume should be deleted due to cascade
      const deletedResume = await prisma.resume.findUnique({
        where: { id: resume.id },
      });

      expect(deletedResume).toBeNull();
    });

    it('should enforce unique content hash per user', async () => {
      const resumeData = {
        userId: testUser.id,
        fileName: 'unique-test.pdf',
        originalName: 'unique-test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        contentHash: 'unique123',
      };

      // Create first resume
      await prisma.resume.create({ data: resumeData });

      // Try to create second resume with same hash for same user
      await expect(
        prisma.resume.create({
          data: {
            ...resumeData,
            fileName: 'duplicate.pdf',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('payment operations', () => {
    let testUser: any;

    beforeEach(async () => {
      await TestDatabase.cleanup();
      testUser = await prisma.user.create({
        data: {
          email: 'paymenttest@example.com',
          name: 'Payment Test User',
        },
      });
    });

    it('should create and retrieve payment records', async () => {
      const paymentData = {
        userId: testUser.id,
        stripeSessionId: 'cs_test_123',
        amount: 999,
        currency: 'usd',
        status: 'PENDING' as const,
        productType: 'template',
        productId: 'tech-focus',
        description: 'Tech Focus Template',
      };

      const createdPayment = await prisma.paymentRecord.create({ data: paymentData });

      expect(createdPayment).toHaveProperty('id');
      expect(createdPayment.userId).toBe(testUser.id);
      expect(createdPayment.stripeSessionId).toBe(paymentData.stripeSessionId);
      expect(createdPayment.amount).toBe(paymentData.amount);
      expect(createdPayment.status).toBe('PENDING');

      // Retrieve with user relation
      const paymentWithUser = await prisma.paymentRecord.findUnique({
        where: { id: createdPayment.id },
        include: { user: true },
      });

      expect(paymentWithUser?.user.email).toBe(testUser.email);
    });

    it('should handle payment status transitions', async () => {
      const payment = await prisma.paymentRecord.create({
        data: {
          userId: testUser.id,
          stripeSessionId: 'cs_transition_test',
          amount: 999,
          currency: 'usd',
          status: 'PENDING',
          productType: 'template',
          productId: 'tech-focus',
        },
      });

      // Complete payment
      const completedPayment = await prisma.paymentRecord.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          stripePaymentIntentId: 'pi_test_123',
          stripeCustomerId: 'cus_test_123',
          paidAt: new Date(),
        },
      });

      expect(completedPayment.status).toBe('COMPLETED');
      expect(completedPayment.stripePaymentIntentId).toBe('pi_test_123');
      expect(completedPayment.paidAt).toBeInstanceOf(Date);
    });

    it('should aggregate payment statistics', async () => {
      // Create multiple payments
      const payments = [
        {
          userId: testUser.id,
          stripeSessionId: 'cs_stats_1',
          amount: 999,
          currency: 'usd',
          status: 'COMPLETED' as const,
          productType: 'template',
          productId: 'tech-focus',
        },
        {
          userId: testUser.id,
          stripeSessionId: 'cs_stats_2',
          amount: 799,
          currency: 'usd',
          status: 'COMPLETED' as const,
          productType: 'template',
          productId: 'professional-plus',
        },
        {
          userId: testUser.id,
          stripeSessionId: 'cs_stats_3',
          amount: 4500,
          currency: 'usd',
          status: 'FAILED' as const,
          productType: 'resume-builder',
          productId: 'basic',
        },
      ];

      for (const payment of payments) {
        await prisma.paymentRecord.create({ data: payment });
      }

      // Aggregate completed payments
      const stats = await prisma.paymentRecord.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
        _count: { id: true },
      });

      expect(stats._sum.amount).toBe(1798); // 999 + 799
      expect(stats._count.id).toBe(2);

      // Group by product
      const productStats = await prisma.paymentRecord.groupBy({
        by: ['productId'],
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
        _count: { id: true },
      });

      expect(productStats).toHaveLength(2);
      expect(productStats.find(p => p.productId === 'tech-focus')?._sum.amount).toBe(999);
      expect(productStats.find(p => p.productId === 'professional-plus')?._sum.amount).toBe(799);
    });
  });

  describe('job tracking operations', () => {
    let testUser: any;
    let testResume: any;

    beforeEach(async () => {
      await TestDatabase.cleanup();
      testUser = await prisma.user.create({
        data: {
          email: 'jobtest@example.com',
          name: 'Job Test User',
        },
      });

      testResume = await prisma.resume.create({
        data: {
          userId: testUser.id,
          fileName: 'job-test.pdf',
          originalName: 'job-test.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          contentHash: 'job123',
        },
      });
    });

    it('should create and track resume jobs', async () => {
      const jobData = {
        id: 'job_test_123',
        resumeId: testResume.id,
        jobType: 'RESUME_OPTIMIZATION' as const,
        templateId: 'tech-focus',
        jobDescription: 'Software Engineer position',
        input: { test: 'input' },
        status: 'PENDING' as const,
        priority: 1,
      };

      const createdJob = await prisma.resumeJob.create({ data: jobData });

      expect(createdJob.id).toBe(jobData.id);
      expect(createdJob.resumeId).toBe(testResume.id);
      expect(createdJob.jobType).toBe('RESUME_OPTIMIZATION');
      expect(createdJob.status).toBe('PENDING');
      expect(createdJob.createdAt).toBeInstanceOf(Date);

      // Retrieve with resume relation
      const jobWithResume = await prisma.resumeJob.findUnique({
        where: { id: createdJob.id },
        include: { resume: true },
      });

      expect(jobWithResume?.resume.fileName).toBe('job-test.pdf');
    });

    it('should handle job status progression', async () => {
      const job = await prisma.resumeJob.create({
        data: {
          id: 'job_progression_test',
          resumeId: testResume.id,
          jobType: 'RESUME_OPTIMIZATION',
          templateId: 'tech-focus',
          input: {},
          status: 'PENDING',
          priority: 1,
        },
      });

      // Start processing
      const processingJob = await prisma.resumeJob.update({
        where: { id: job.id },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
        },
      });

      expect(processingJob.status).toBe('PROCESSING');
      expect(processingJob.startedAt).toBeInstanceOf(Date);

      // Complete job
      const completedJob = await prisma.resumeJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          output: { success: true, pdfGenerated: true },
        },
      });

      expect(completedJob.status).toBe('COMPLETED');
      expect(completedJob.completedAt).toBeInstanceOf(Date);
      expect(completedJob.output).toEqual({ success: true, pdfGenerated: true });
    });

    it('should clean up old jobs', async () => {
      const oldDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      // Create old failed job
      await prisma.resumeJob.create({
        data: {
          id: 'old_failed_job',
          resumeId: testResume.id,
          jobType: 'RESUME_OPTIMIZATION',
          templateId: 'tech-focus',
          input: {},
          status: 'FAILED',
          priority: 1,
          createdAt: oldDate,
          failedAt: oldDate,
          error: 'Test error',
        },
      });

      // Create recent job
      await prisma.resumeJob.create({
        data: {
          id: 'recent_job',
          resumeId: testResume.id,
          jobType: 'RESUME_OPTIMIZATION',
          templateId: 'tech-focus',
          input: {},
          status: 'COMPLETED',
          priority: 1,
        },
      });

      // Clean up old failed jobs
      const deleteResult = await prisma.resumeJob.deleteMany({
        where: {
          status: 'FAILED',
          createdAt: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      });

      expect(deleteResult.count).toBe(1);

      // Recent job should still exist
      const remainingJobs = await prisma.resumeJob.findMany();
      expect(remainingJobs).toHaveLength(1);
      expect(remainingJobs[0].id).toBe('recent_job');
    });
  });

  describe('fraud detection data', () => {
    beforeEach(async () => {
      await TestDatabase.cleanup();
    });

    it('should track bad email patterns', async () => {
      const badEmailData = {
        email: 'bad@example.com',
        attempts: 1,
        reason: 'Suspicious activity',
        lastAttempt: new Date(),
      };

      const createdBadEmail = await prisma.badEmail.create({ data: badEmailData });

      expect(createdBadEmail.email).toBe(badEmailData.email);
      expect(createdBadEmail.attempts).toBe(1);
      expect(createdBadEmail.reason).toBe(badEmailData.reason);

      // Increment attempts
      const updatedBadEmail = await prisma.badEmail.update({
        where: { email: badEmailData.email },
        data: {
          attempts: { increment: 1 },
          lastAttempt: new Date(),
        },
      });

      expect(updatedBadEmail.attempts).toBe(2);
    });

    it('should track IP activities', async () => {
      const ipData = {
        ipAddress: '192.168.1.100',
        emailCount: 5,
        lastEmail: new Date(),
        isBlocked: false,
      };

      const createdIpTrack = await prisma.ipTracking.create({ data: ipData });

      expect(createdIpTrack.ipAddress).toBe(ipData.ipAddress);
      expect(createdIpTrack.emailCount).toBe(5);
      expect(createdIpTrack.isBlocked).toBe(false);

      // Block IP
      const blockedIp = await prisma.ipTracking.update({
        where: { ipAddress: ipData.ipAddress },
        data: {
          isBlocked: true,
          blockReason: 'Too many requests',
        },
      });

      expect(blockedIp.isBlocked).toBe(true);
      expect(blockedIp.blockReason).toBe('Too many requests');
    });

    it('should record processing analytics', async () => {
      const analyticsData = {
        requestId: crypto.randomUUID(),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
        templateType: 'tech-focus',
        processingTimeMs: 2500,
        success: true,
        isFirstTimeUser: true,
        paidRequest: true,
        revenue: 999,
      };

      const createdAnalytics = await prisma.processingAnalytics.create({ data: analyticsData });

      expect(createdAnalytics.requestId).toBe(analyticsData.requestId);
      expect(createdAnalytics.templateType).toBe('tech-focus');
      expect(createdAnalytics.processingTimeMs).toBe(2500);
      expect(createdAnalytics.success).toBe(true);
      expect(createdAnalytics.revenue).toBe(999);

      // Aggregate analytics
      const stats = await prisma.processingAnalytics.aggregate({
        _avg: { processingTimeMs: true },
        _count: { id: true },
        _sum: { revenue: true },
      });

      expect(stats._avg.processingTimeMs).toBe(2500);
      expect(stats._count.id).toBe(1);
      expect(stats._sum.revenue).toBe(999);
    });
  });

  describe('performance and concurrency', () => {
    beforeEach(async () => {
      await TestDatabase.cleanup();
    });

    it('should handle concurrent user creation with same email gracefully', async () => {
      const userData = {
        email: 'concurrent@example.com',
        name: 'Concurrent User',
      };

      // Create multiple concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        prisma.user.create({ data: userData }).catch(() => null) // Catch unique constraint errors
      );

      const results = await Promise.all(promises);
      const successfulCreations = results.filter(r => r !== null);

      // Only one should succeed
      expect(successfulCreations).toHaveLength(1);

      // Verify only one user exists
      const userCount = await prisma.user.count({
        where: { email: userData.email },
      });
      expect(userCount).toBe(1);
    });

    it('should handle large batch operations efficiently', async () => {
      const startTime = Date.now();

      // Create 50 users in a transaction
      const users = Array.from({ length: 50 }, (_, i) => ({
        email: `batch${i}@example.com`,
        name: `Batch User ${i}`,
      }));

      await prisma.$transaction(
        users.map(user => prisma.user.create({ data: user }))
      );

      const duration = Date.now() - startTime;

      // Verify all users were created
      const userCount = await prisma.user.count({
        where: { email: { startsWith: 'batch' } },
      });

      expect(userCount).toBe(50);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should maintain data consistency under concurrent operations', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'consistency@example.com',
          name: 'Consistency Test',
        },
      });

      // Create concurrent payment records
      const paymentPromises = Array.from({ length: 10 }, (_, i) =>
        prisma.paymentRecord.create({
          data: {
            userId: user.id,
            stripeSessionId: `cs_concurrent_${i}`,
            amount: 999,
            currency: 'usd',
            status: 'COMPLETED',
            productType: 'template',
            productId: 'tech-focus',
          },
        })
      );

      await Promise.all(paymentPromises);

      // Verify all payments were created
      const paymentCount = await prisma.paymentRecord.count({
        where: { userId: user.id },
      });

      expect(paymentCount).toBe(10);

      // Verify aggregation is correct
      const totalRevenue = await prisma.paymentRecord.aggregate({
        where: { userId: user.id },
        _sum: { amount: true },
      });

      expect(totalRevenue._sum.amount).toBe(9990); // 10 * 999
    });
  });

  describe('data integrity and constraints', () => {
    beforeEach(async () => {
      await TestDatabase.cleanup();
    });

    it('should enforce foreign key constraints', async () => {
      // Try to create resume without valid user
      await expect(
        prisma.resume.create({
          data: {
            userId: 'non-existent-user',
            fileName: 'test.pdf',
            originalName: 'test.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
            contentHash: 'test123',
          },
        })
      ).rejects.toThrow();
    });

    it('should handle transaction rollbacks on errors', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'transaction@example.com',
          name: 'Transaction Test',
        },
      });

      // Transaction that should fail
      await expect(
        prisma.$transaction([
          prisma.resume.create({
            data: {
              userId: user.id,
              fileName: 'valid.pdf',
              originalName: 'valid.pdf',
              fileSize: 1024,
              mimeType: 'application/pdf',
              contentHash: 'valid123',
            },
          }),
          prisma.resume.create({
            data: {
              userId: 'invalid-user-id', // This will fail
              fileName: 'invalid.pdf',
              originalName: 'invalid.pdf',
              fileSize: 1024,
              mimeType: 'application/pdf',
              contentHash: 'invalid123',
            },
          }),
        ])
      ).rejects.toThrow();

      // No resumes should be created due to rollback
      const resumeCount = await prisma.resume.count({
        where: { userId: user.id },
      });

      expect(resumeCount).toBe(0);
    });

    it('should handle date field validations', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'datetest@example.com',
          name: 'Date Test User',
          lastLoginAt: new Date(),
        },
      });

      expect(user.lastLoginAt).toBeInstanceOf(Date);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});