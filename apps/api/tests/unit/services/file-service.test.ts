import { fileService } from '../../../src/services/file-service';
import { testFileData, testUsers, createTestFile } from '../../fixtures/test-data';
import { prisma } from '../../../src/lib/prisma';

// Mock Prisma
jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    resume: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  },
}));

// Mock AI service
jest.mock('../../../src/services/ai-service', () => ({
  aiService: {
    parseResumeContent: jest.fn().mockResolvedValue({
      personalInfo: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '555-123-4567',
        location: 'San Francisco, CA',
      },
      sections: {
        summary: 'Professional summary',
        experience: [],
        education: [],
        skills: [],
      },
      extractedText: 'Cleaned resume text',
      confidence: 0.95,
    }),
  },
}));

describe('File Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateFile', () => {
    it('should validate correct file data', () => {
      const result = fileService.validateFile(testFileData.validPDF);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.fileInfo.size).toBe(testFileData.validPDF.fileSize);
      expect(result.fileInfo.type).toBe(testFileData.validPDF.mimeType);
    });

    it('should reject oversized files', () => {
      const result = fileService.validateFile(testFileData.oversizedFile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('File size')
      );
    });

    it('should reject invalid file types', () => {
      const result = fileService.validateFile(testFileData.invalidFile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('File extension .exe is not allowed')
      );
    });

    it('should detect suspicious filenames', () => {
      const suspiciousFile = createTestFile({
        fileName: 'con.pdf', // Reserved Windows filename
      });

      const result = fileService.validateFile(suspiciousFile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('suspicious characters')
      );
    });

    it('should validate base64 encoding', () => {
      const invalidBase64File = createTestFile({
        fileData: 'invalid-base64-data!@#',
      });

      const result = fileService.validateFile(invalidBase64File);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid file encoding');
    });

    it('should warn about large files', () => {
      const largeFile = createTestFile({
        fileSize: 1024 * 1024 * 6, // 6MB
        fileData: Buffer.alloc(1024 * 1024 * 6).toString('base64'),
      });

      const result = fileService.validateFile(largeFile);

      expect(result.warnings).toContain(
        expect.stringContaining('Large file may take longer')
      );
    });

    it('should validate MIME types', () => {
      const validMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/rtf',
      ];

      validMimeTypes.forEach(mimeType => {
        const file = createTestFile({ mimeType });
        const result = fileService.validateFile(file);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('processResumeFile', () => {
    const mockResume = {
      id: 'resume_test_123',
      userId: testUsers.validUser.id,
      fileName: 'test.pdf',
      extractedText: 'Sample resume text',
      parsedData: { personalInfo: {} },
      contentHash: 'hash123',
    };

    beforeEach(() => {
      (prisma.resume.create as jest.Mock).mockResolvedValue(mockResume);
      (prisma.resume.findFirst as jest.Mock).mockResolvedValue(null);
    });

    it('should process valid file successfully', async () => {
      const result = await fileService.processResumeFile(
        testFileData.validPDF,
        testUsers.validUser.id
      );

      expect(result.processingStatus).toBe('success');
      expect(result.fileId).toBe(mockResume.id);
      expect(result.extractedText).toBeDefined();
      expect(result.parsedData).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should detect duplicate files', async () => {
      // Mock existing file
      (prisma.resume.findFirst as jest.Mock).mockResolvedValue(mockResume);

      const result = await fileService.processResumeFile(
        testFileData.validPDF,
        testUsers.validUser.id
      );

      expect(result.warnings).toContain('File already processed previously');
      expect(result.fileId).toBe(mockResume.id);
    });

    it('should handle invalid files', async () => {
      await expect(
        fileService.processResumeFile(testFileData.invalidFile, testUsers.validUser.id)
      ).rejects.toThrow('File validation failed');
    });

    it('should handle processing errors', async () => {
      // Mock database error
      (prisma.resume.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        fileService.processResumeFile(testFileData.validPDF, testUsers.validUser.id)
      ).rejects.toThrow('Failed to process resume file');
    });

    it('should generate content hash for deduplication', async () => {
      await fileService.processResumeFile(
        testFileData.validPDF,
        testUsers.validUser.id
      );

      expect(prisma.resume.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contentHash: expect.any(String),
          }),
        })
      );
    });
  });

  describe('getFileStatus', () => {
    const mockFileStatus = {
      status: 'COMPLETED' as const,
      extractedText: 'Sample text',
      parsedData: { personalInfo: {} },
      processedAt: new Date(),
    };

    beforeEach(() => {
      (prisma.resume.findFirst as jest.Mock).mockResolvedValue(mockFileStatus);
    });

    it('should return file processing status', async () => {
      const result = await fileService.getFileStatus('file_123', 'user_123');

      expect(result.status).toBe('COMPLETED');
      expect(result.progress).toBe(100);
      expect(result.extractedText).toBe(mockFileStatus.extractedText);
    });

    it('should handle non-existent files', async () => {
      (prisma.resume.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        fileService.getFileStatus('nonexistent', 'user_123')
      ).rejects.toThrow('File not found');
    });

    it('should calculate progress correctly', async () => {
      const testCases = [
        { status: 'UPLOADED', expectedProgress: 0 },
        { status: 'PROCESSING', expectedProgress: 50 },
        { status: 'COMPLETED', expectedProgress: 100 },
        { status: 'FAILED', expectedProgress: 0 },
      ];

      for (const testCase of testCases) {
        (prisma.resume.findFirst as jest.Mock).mockResolvedValue({
          ...mockFileStatus,
          status: testCase.status,
        });

        const result = await fileService.getFileStatus('file_123', 'user_123');
        expect(result.progress).toBe(testCase.expectedProgress);
      }
    });
  });

  describe('cleanupOldFiles', () => {
    beforeEach(() => {
      (prisma.resume.updateMany as jest.Mock).mockResolvedValue({ count: 5 });
    });

    it('should clean up old files', async () => {
      const result = await fileService.cleanupOldFiles(30);

      expect(result).toBe(5);
      expect(prisma.resume.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              lt: expect.any(Date),
            }),
            status: { in: ['FAILED', 'EXPIRED'] },
          }),
          data: {
            status: 'EXPIRED',
            extractedText: null,
            parsedData: null,
          },
        })
      );
    });

    it('should use default cleanup period', async () => {
      await fileService.cleanupOldFiles();

      const callArgs = (prisma.resume.updateMany as jest.Mock).mock.calls[0][0];
      const cutoffDate = callArgs.where.createdAt.lt;
      const daysDiff = Math.floor((Date.now() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(daysDiff).toBe(30);
    });
  });

  describe('getFileStats', () => {
    const mockStats = {
      _count: { id: 100 },
      _sum: { fileSize: 1024 * 1024 * 500 }, // 500MB total
      _avg: { fileSize: 1024 * 1024 * 5 }, // 5MB average
    };

    beforeEach(() => {
      (prisma.resume.aggregate as jest.Mock).mockResolvedValue(mockStats);
      (prisma.resume.count as jest.Mock).mockResolvedValue(85); // 85 successful out of 100
    });

    it('should return file statistics', async () => {
      const result = await fileService.getFileStats();

      expect(result).toMatchObject({
        totalFiles: 100,
        totalSize: 1024 * 1024 * 500,
        processingSuccessRate: 85,
        averageProcessingTime: expect.any(Number),
      });
    });

    it('should handle zero files', async () => {
      (prisma.resume.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 0 },
        _sum: { fileSize: null },
        _avg: { fileSize: null },
      });
      (prisma.resume.count as jest.Mock).mockResolvedValue(0);

      const result = await fileService.getFileStats();

      expect(result.totalFiles).toBe(0);
      expect(result.totalSize).toBe(0);
      expect(result.processingSuccessRate).toBe(0);
    });
  });

  describe('file extension detection', () => {
    it('should detect file extensions correctly', () => {
      const testCases = [
        { fileName: 'resume.pdf', expected: '.pdf' },
        { fileName: 'document.DOCX', expected: '.docx' },
        { fileName: 'file.txt', expected: '.txt' },
        { fileName: 'noextension', expected: '' },
        { fileName: 'multiple.dots.pdf', expected: '.pdf' },
      ];

      testCases.forEach(({ fileName, expected }) => {
        const file = createTestFile({ fileName });
        const result = fileService.validateFile(file);
        expect(result.fileInfo.extension).toBe(expected);
      });
    });
  });

  describe('content hash generation', () => {
    it('should generate consistent hashes for same content', async () => {
      const file1 = createTestFile({ fileData: 'same-content' });
      const file2 = createTestFile({ 
        fileName: 'different-name.pdf',
        fileData: 'same-content' 
      });

      await fileService.processResumeFile(file1, testUsers.validUser.id);
      await fileService.processResumeFile(file2, testUsers.validUser.id);

      const calls = (prisma.resume.create as jest.Mock).mock.calls;
      expect(calls[0][0].data.contentHash).toBe(calls[1][0].data.contentHash);
    });

    it('should generate different hashes for different content', async () => {
      const file1 = createTestFile({ fileData: 'content-one' });
      const file2 = createTestFile({ fileData: 'content-two' });

      await fileService.processResumeFile(file1, testUsers.validUser.id);
      await fileService.processResumeFile(file2, testUsers.validUser.id);

      const calls = (prisma.resume.create as jest.Mock).mock.calls;
      expect(calls[0][0].data.contentHash).not.toBe(calls[1][0].data.contentHash);
    });
  });
});