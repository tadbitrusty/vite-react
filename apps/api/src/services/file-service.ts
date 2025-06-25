import { config } from '@resume-vita/config';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { aiService } from './ai-service';

// File validation schemas
const FileUploadSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileData: z.string().min(1, 'File data is required'), // base64 encoded
  mimeType: z.string().refine(
    (mime) => config.uploads.allowedMimeTypes.includes(mime),
    'Unsupported file type'
  ),
  fileSize: z.number().max(config.uploads.maxSize, 'File too large'),
});

type FileUploadInput = z.infer<typeof FileUploadSchema>;

// File processing results
interface FileProcessingResult {
  fileId: string;
  extractedText: string;
  parsedData: any;
  contentHash: string;
  processingStatus: 'success' | 'partial' | 'failed';
  confidence: number;
  warnings: string[];
}

interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    size: number;
    type: string;
    extension: string;
  };
}

class FileService {
  /**
   * Validate uploaded file before processing
   */
  validateFile(file: FileUploadInput): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate with schema
      FileUploadSchema.parse(file);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(e => e.message));
      }
    }

    // Additional validation
    const extension = this.getFileExtension(file.fileName);
    if (!config.uploads.allowedTypes.includes(extension)) {
      errors.push(`File extension ${extension} is not allowed`);
    }

    // Check for suspicious content
    if (this.containsSuspiciousContent(file.fileName)) {
      errors.push('File name contains suspicious characters');
    }

    // Validate base64 encoding
    if (!this.isValidBase64(file.fileData)) {
      errors.push('Invalid file encoding');
    }

    // Calculate actual size from base64
    const actualSize = this.getBase64Size(file.fileData);
    if (actualSize > config.uploads.maxSize) {
      errors.push(`File size ${actualSize} exceeds maximum ${config.uploads.maxSize}`);
    }

    // Warnings for large files
    if (actualSize > 5 * 1024 * 1024) { // 5MB
      warnings.push('Large file may take longer to process');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fileInfo: {
        size: actualSize,
        type: file.mimeType,
        extension,
      },
    };
  }

  /**
   * Process uploaded resume file
   */
  async processResumeFile(
    file: FileUploadInput,
    userId: string
  ): Promise<FileProcessingResult> {
    // Validate file first
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      // Generate content hash for deduplication
      const contentHash = this.generateContentHash(file.fileData);

      // Check if file already exists
      const existingFile = await prisma.resume.findFirst({
        where: {
          userId,
          contentHash,
        },
      });

      if (existingFile && existingFile.extractedText) {
        return {
          fileId: existingFile.id,
          extractedText: existingFile.extractedText,
          parsedData: existingFile.parsedData as any,
          contentHash,
          processingStatus: 'success',
          confidence: 0.95,
          warnings: ['File already processed previously'],
        };
      }

      // Extract text from file
      const extractedText = await this.extractTextFromFile(file);
      
      // Parse resume content with AI
      const parsedData = await aiService.parseResumeContent(extractedText);

      // Save to database
      const resume = await prisma.resume.create({
        data: {
          userId,
          fileName: file.fileName,
          originalName: file.fileName,
          fileSize: validation.fileInfo.size,
          mimeType: file.mimeType,
          contentHash,
          extractedText,
          parsedData: parsedData as any,
          status: 'COMPLETED',
          processedAt: new Date(),
        },
      });

      return {
        fileId: resume.id,
        extractedText,
        parsedData,
        contentHash,
        processingStatus: 'success',
        confidence: parsedData.confidence || 0.8,
        warnings: validation.warnings,
      };
    } catch (error) {
      console.error('File processing failed:', error);
      
      // Save failed attempt to database
      const contentHash = this.generateContentHash(file.fileData);
      await prisma.resume.create({
        data: {
          userId,
          fileName: file.fileName,
          originalName: file.fileName,
          fileSize: validation.fileInfo.size,
          mimeType: file.mimeType,
          contentHash,
          status: 'FAILED',
        },
      });

      throw new Error('Failed to process resume file');
    }
  }

  /**
   * Extract text content from different file types
   */
  private async extractTextFromFile(file: FileUploadInput): Promise<string> {
    const buffer = Buffer.from(file.fileData, 'base64');
    
    switch (file.mimeType) {
      case 'text/plain':
        return buffer.toString('utf-8');
        
      case 'application/pdf':
        return await this.extractTextFromPDF(buffer);
        
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await this.extractTextFromDoc(buffer);
        
      case 'application/rtf':
        return await this.extractTextFromRTF(buffer);
        
      default:
        throw new Error(`Unsupported file type: ${file.mimeType}`);
    }
  }

  /**
   * Extract text from PDF files
   */
  private async extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
      // Using pdf-parse library (would need to install)
      // For now, return a placeholder that indicates PDF processing
      const text = `[PDF Content Extracted]
      
This is a placeholder for PDF text extraction. In production, this would use:
- pdf-parse library for text extraction
- OCR for scanned PDFs
- Proper error handling for corrupted files

Buffer size: ${buffer.length} bytes
Processing timestamp: ${new Date().toISOString()}

Sample resume content would appear here...`;
      
      return text;
    } catch (error) {
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract text from DOC/DOCX files
   */
  private async extractTextFromDoc(buffer: Buffer): Promise<string> {
    try {
      // Using mammoth library for DOCX (would need to install)
      // For now, return a placeholder
      const text = `[DOC/DOCX Content Extracted]
      
This is a placeholder for DOC/DOCX text extraction. In production, this would use:
- mammoth library for DOCX files
- textract for DOC files
- Proper formatting preservation

Buffer size: ${buffer.length} bytes
Processing timestamp: ${new Date().toISOString()}

Sample resume content would appear here...`;
      
      return text;
    } catch (error) {
      throw new Error('Failed to extract text from DOC file');
    }
  }

  /**
   * Extract text from RTF files
   */
  private async extractTextFromRTF(buffer: Buffer): Promise<string> {
    try {
      // Basic RTF text extraction (simplified)
      let text = buffer.toString('utf-8');
      
      // Remove RTF control codes (basic implementation)
      text = text.replace(/\\[a-z]+\d*\s?/g, '');
      text = text.replace(/[{}]/g, '');
      text = text.replace(/\\\\/g, '\\');
      text = text.trim();
      
      return text || '[RTF Content Extracted - No readable text found]';
    } catch (error) {
      throw new Error('Failed to extract text from RTF');
    }
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop();
    return extension ? `.${extension}` : '';
  }

  /**
   * Check for suspicious content in filename
   */
  private containsSuspiciousContent(fileName: string): boolean {
    const suspiciousPatterns = [
      /[<>:"|?*]/,
      /\.\./,
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i,
      /\.(exe|bat|cmd|scr|vbs|js)$/i,
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(fileName));
  }

  /**
   * Validate base64 encoding
   */
  private isValidBase64(str: string): boolean {
    try {
      return Buffer.from(str, 'base64').toString('base64') === str;
    } catch {
      return false;
    }
  }

  /**
   * Calculate size of base64 encoded data
   */
  private getBase64Size(base64: string): number {
    return Math.floor(base64.length * 0.75);
  }

  /**
   * Generate content hash for deduplication
   */
  private generateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get file processing status
   */
  async getFileStatus(fileId: string, userId: string): Promise<{
    status: 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    progress: number;
    extractedText?: string;
    parsedData?: any;
  }> {
    const resume = await prisma.resume.findFirst({
      where: { id: fileId, userId },
      select: {
        status: true,
        extractedText: true,
        parsedData: true,
        processedAt: true,
      },
    });

    if (!resume) {
      throw new Error('File not found');
    }

    return {
      status: resume.status,
      progress: resume.status === 'COMPLETED' ? 100 : resume.status === 'PROCESSING' ? 50 : 0,
      extractedText: resume.extractedText || undefined,
      parsedData: resume.parsedData as any,
    };
  }

  /**
   * Clean up old files (called by background job)
   */
  async cleanupOldFiles(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.resume.updateMany({
      where: {
        createdAt: { lt: cutoffDate },
        status: { in: ['FAILED', 'EXPIRED'] },
      },
      data: {
        status: 'EXPIRED',
        extractedText: null,
        parsedData: null,
      },
    });

    return result.count;
  }

  /**
   * Get file usage statistics
   */
  async getFileStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    processingSuccessRate: number;
    averageProcessingTime: number;
  }> {
    const stats = await prisma.resume.aggregate({
      _count: { id: true },
      _sum: { fileSize: true },
      _avg: { fileSize: true },
    });

    const successCount = await prisma.resume.count({
      where: { status: 'COMPLETED' },
    });

    return {
      totalFiles: stats._count.id,
      totalSize: stats._sum.fileSize || 0,
      processingSuccessRate: stats._count.id > 0 ? (successCount / stats._count.id) * 100 : 0,
      averageProcessingTime: 2500, // Placeholder - would calculate from actual processing times
    };
  }
}

// Export singleton instance
export const fileService = new FileService();
export type { FileProcessingResult, FileValidationResult };