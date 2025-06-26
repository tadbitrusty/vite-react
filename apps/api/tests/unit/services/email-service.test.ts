import { emailService } from '../../../src/services/email-service';
import { testEmailTemplateData } from '../../fixtures/test-data';

// Mock Resend
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({
        data: { id: 'email_test_123' },
      }),
    },
  })),
}));

describe('Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should send resume optimization email successfully', async () => {
      const emailInput = {
        to: 'test@example.com',
        templateType: 'resume-optimization' as const,
        templateData: testEmailTemplateData.resumeOptimization,
      };

      const result = await emailService.sendEmail(emailInput);

      expect(result).toMatchObject({
        messageId: 'email_test_123',
        success: true,
        deliveredAt: expect.any(Date),
        recipientEmail: 'test@example.com',
        templateUsed: 'resume-optimization',
      });
    });

    it('should send resume builder email successfully', async () => {
      const emailInput = {
        to: 'test@example.com',
        templateType: 'resume-builder' as const,
        templateData: testEmailTemplateData.resumeBuilder,
      };

      const result = await emailService.sendEmail(emailInput);

      expect(result).toMatchObject({
        messageId: 'email_test_123',
        success: true,
        deliveredAt: expect.any(Date),
        recipientEmail: 'test@example.com',
        templateUsed: 'resume-builder',
      });
    });

    it('should send payment confirmation email successfully', async () => {
      const emailInput = {
        to: 'test@example.com',
        templateType: 'payment-confirmation' as const,
        templateData: testEmailTemplateData.paymentConfirmation,
      };

      const result = await emailService.sendEmail(emailInput);

      expect(result).toMatchObject({
        messageId: 'email_test_123',
        success: true,
        deliveredAt: expect.any(Date),
        recipientEmail: 'test@example.com',
        templateUsed: 'payment-confirmation',
      });
    });

    it('should handle email with attachments', async () => {
      const pdfBuffer = Buffer.from('mock-pdf-content');
      const emailInput = {
        to: 'test@example.com',
        templateType: 'resume-optimization' as const,
        templateData: testEmailTemplateData.resumeOptimization,
        attachments: [
          {
            filename: 'resume.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      };

      const result = await emailService.sendEmail(emailInput);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email_test_123');
    });

    it('should validate email address format', async () => {
      const invalidEmailInput = {
        to: 'invalid-email',
        templateType: 'resume-optimization' as const,
        templateData: testEmailTemplateData.resumeOptimization,
      };

      await expect(emailService.sendEmail(invalidEmailInput))
        .rejects
        .toThrow();
    });

    it('should validate template type', async () => {
      const invalidTemplateInput = {
        to: 'test@example.com',
        templateType: 'invalid-template' as any,
        templateData: {},
      };

      await expect(emailService.sendEmail(invalidTemplateInput))
        .rejects
        .toThrow();
    });

    it('should handle Resend API errors', async () => {
      const mockError = new Error('Resend API error');
      jest.spyOn(require('resend').Resend.prototype.emails, 'send')
        .mockRejectedValueOnce(mockError);

      const emailInput = {
        to: 'test@example.com',
        templateType: 'resume-optimization' as const,
        templateData: testEmailTemplateData.resumeOptimization,
      };

      const result = await emailService.sendEmail(emailInput);

      expect(result).toMatchObject({
        messageId: '',
        success: false,
        deliveredAt: expect.any(Date),
        recipientEmail: 'test@example.com',
        templateUsed: 'resume-optimization',
        errorMessage: 'Resend API error',
      });
    });

    it('should handle missing message ID from Resend', async () => {
      jest.spyOn(require('resend').Resend.prototype.emails, 'send')
        .mockResolvedValueOnce({ data: null });

      const emailInput = {
        to: 'test@example.com',
        templateType: 'resume-optimization' as const,
        templateData: testEmailTemplateData.resumeOptimization,
      };

      const result = await emailService.sendEmail(emailInput);

      expect(result.messageId).toBe('unknown');
      expect(result.success).toBe(true);
    });
  });

  describe('email template generation', () => {
    describe('resume optimization template', () => {
      it('should generate proper HTML content', async () => {
        const emailInput = {
          to: 'test@example.com',
          templateType: 'resume-optimization' as const,
          templateData: testEmailTemplateData.resumeOptimization,
        };

        await emailService.sendEmail(emailInput);

        const resendCall = require('resend').Resend.prototype.emails.send.mock.calls[0][0];
        
        expect(resendCall.subject).toContain('Tech Focus');
        expect(resendCall.subject).toContain('Resume is Ready');
        expect(resendCall.html).toContain('John Doe');
        expect(resendCall.html).toContain('85%'); // ATS Score
        expect(resendCall.html).toContain('React'); // Keywords
        expect(resendCall.text).toContain('John Doe');
        expect(resendCall.text).toContain('85%');
      });

      it('should include all optimization features', async () => {
        const emailInput = {
          to: 'test@example.com',
          templateType: 'resume-optimization' as const,
          templateData: testEmailTemplateData.resumeOptimization,
        };

        await emailService.sendEmail(emailInput);

        const resendCall = require('resend').Resend.prototype.emails.send.mock.calls[0][0];
        
        testEmailTemplateData.resumeOptimization.optimizationFeatures.forEach(feature => {
          expect(resendCall.html).toContain(feature);
        });
      });

      it('should include all improvements', async () => {
        const emailInput = {
          to: 'test@example.com',
          templateType: 'resume-optimization' as const,
          templateData: testEmailTemplateData.resumeOptimization,
        };

        await emailService.sendEmail(emailInput);

        const resendCall = require('resend').Resend.prototype.emails.send.mock.calls[0][0];
        
        testEmailTemplateData.resumeOptimization.improvements.forEach(improvement => {
          expect(resendCall.html).toContain(improvement);
        });
      });

      it('should include keyword matches', async () => {
        const emailInput = {
          to: 'test@example.com',
          templateType: 'resume-optimization' as const,
          templateData: testEmailTemplateData.resumeOptimization,
        };

        await emailService.sendEmail(emailInput);

        const resendCall = require('resend').Resend.prototype.emails.send.mock.calls[0][0];
        
        testEmailTemplateData.resumeOptimization.keywordMatches.forEach(keyword => {
          expect(resendCall.html).toContain(keyword);
        });
      });
    });

    describe('resume builder template', () => {
      it('should generate proper HTML content', async () => {
        const emailInput = {
          to: 'test@example.com',
          templateType: 'resume-builder' as const,
          templateData: testEmailTemplateData.resumeBuilder,
        };

        await emailService.sendEmail(emailInput);

        const resendCall = require('resend').Resend.prototype.emails.send.mock.calls[0][0];
        
        expect(resendCall.subject).toContain('Enhanced Resume Package');
        expect(resendCall.html).toContain('Jane Smith');
        expect(resendCall.html).toContain('Professional Plus');
        expect(resendCall.html).toContain('enhanced');
        expect(resendCall.text).toContain('Jane Smith');
      });

      it('should include package features', async () => {
        const emailInput = {
          to: 'test@example.com',
          templateType: 'resume-builder' as const,
          templateData: testEmailTemplateData.resumeBuilder,
        };

        await emailService.sendEmail(emailInput);

        const resendCall = require('resend').Resend.prototype.emails.send.mock.calls[0][0];
        
        testEmailTemplateData.resumeBuilder.features.forEach(feature => {
          expect(resendCall.html).toContain(feature);
        });
      });

      it('should include next steps', async () => {
        const emailInput = {
          to: 'test@example.com',
          templateType: 'resume-builder' as const,
          templateData: testEmailTemplateData.resumeBuilder,
        };

        await emailService.sendEmail(emailInput);

        const resendCall = require('resend').Resend.prototype.emails.send.mock.calls[0][0];
        
        testEmailTemplateData.resumeBuilder.nextSteps.forEach(step => {
          expect(resendCall.html).toContain(step);
        });
      });

      it('should handle basic package type', async () => {
        const basicData = {
          ...testEmailTemplateData.resumeBuilder,
          packageType: 'basic' as const,
        };

        const emailInput = {
          to: 'test@example.com',
          templateType: 'resume-builder' as const,
          templateData: basicData,
        };

        await emailService.sendEmail(emailInput);

        const resendCall = require('resend').Resend.prototype.emails.send.mock.calls[0][0];
        
        expect(resendCall.subject).toContain('Basic Resume Package');
        expect(resendCall.html).toContain('basic');
      });
    });

    describe('payment confirmation template', () => {
      it('should generate proper HTML content', async () => {
        const emailInput = {
          to: 'test@example.com',
          templateType: 'payment-confirmation' as const,
          templateData: testEmailTemplateData.paymentConfirmation,
        };

        await emailService.sendEmail(emailInput);

        const resendCall = require('resend').Resend.prototype.emails.send.mock.calls[0][0];
        
        expect(resendCall.subject).toContain('Payment Confirmed');
        expect(resendCall.subject).toContain('Tech Focus Template');
        expect(resendCall.html).toContain('Bob Johnson');
        expect(resendCall.html).toContain('txn_test_123456');
        expect(resendCall.html).toContain('$9.99');
        expect(resendCall.text).toContain('Bob Johnson');
      });

      it('should include transaction details', async () => {
        const emailInput = {
          to: 'test@example.com',
          templateType: 'payment-confirmation' as const,
          templateData: testEmailTemplateData.paymentConfirmation,
        };

        await emailService.sendEmail(emailInput);

        const resendCall = require('resend').Resend.prototype.emails.send.mock.calls[0][0];
        
        expect(resendCall.html).toContain('txn_test_123456');
        expect(resendCall.html).toContain('Tech Focus Template');
        expect(resendCall.html).toContain('$9.99');
        expect(resendCall.html).toContain(new Date().toLocaleDateString());
      });

      it('should include product features', async () => {
        const emailInput = {
          to: 'test@example.com',
          templateType: 'payment-confirmation' as const,
          templateData: testEmailTemplateData.paymentConfirmation,
        };

        await emailService.sendEmail(emailInput);

        const resendCall = require('resend').Resend.prototype.emails.send.mock.calls[0][0];
        
        testEmailTemplateData.paymentConfirmation.features.forEach(feature => {
          expect(resendCall.html).toContain(feature);
        });
      });
    });

    it('should throw error for unknown template type', async () => {
      const emailInput = {
        to: 'test@example.com',
        templateType: 'unknown-template' as any,
        templateData: {},
      };

      await expect(emailService.sendEmail(emailInput))
        .rejects
        .toThrow('Unknown email template: unknown-template');
    });
  });

  describe('sendBulkEmails', () => {
    it('should send multiple emails in batches', async () => {
      const emails = Array.from({ length: 25 }, (_, i) => ({
        to: `user${i}@example.com`,
        templateType: 'resume-optimization' as const,
        templateData: testEmailTemplateData.resumeOptimization,
      }));

      const results = await emailService.sendBulkEmails(emails);

      expect(results).toHaveLength(25);
      expect(results.every(result => result.success)).toBe(true);
      expect(require('resend').Resend.prototype.emails.send).toHaveBeenCalledTimes(25);
    });

    it('should handle mixed success and failure in bulk emails', async () => {
      const emails = [
        {
          to: 'success@example.com',
          templateType: 'resume-optimization' as const,
          templateData: testEmailTemplateData.resumeOptimization,
        },
        {
          to: 'failure@example.com',
          templateType: 'resume-optimization' as const,
          templateData: testEmailTemplateData.resumeOptimization,
        },
      ];

      // Mock first call to succeed, second to fail
      jest.spyOn(require('resend').Resend.prototype.emails, 'send')
        .mockResolvedValueOnce({ data: { id: 'email_success_123' } })
        .mockRejectedValueOnce(new Error('Send failed'));

      const results = await emailService.sendBulkEmails(emails);

      expect(results).toHaveLength(2);
      expect(results[0]!.success).toBe(true);
      expect(results[0]!.messageId).toBe('email_success_123');
      expect(results[1]!.success).toBe(false);
      expect(results[1]!.errorMessage).toContain('Send failed');
    });

    it('should process emails in batches of 10', async () => {
      const emails = Array.from({ length: 15 }, (_, i) => ({
        to: `user${i}@example.com`,
        templateType: 'resume-optimization' as const,
        templateData: testEmailTemplateData.resumeOptimization,
      }));

      // Mock setTimeout to test batching delay
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return 1 as any;
      });

      await emailService.sendBulkEmails(emails);

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
      setTimeoutSpy.mockRestore();
    });

    it('should handle empty email array', async () => {
      const results = await emailService.sendBulkEmails([]);

      expect(results).toHaveLength(0);
      expect(require('resend').Resend.prototype.emails.send).not.toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when service is accessible', async () => {
      const result = await emailService.healthCheck();

      expect(result).toMatchObject({
        status: 'healthy',
        latency: expect.any(Number),
      });

      expect(result.latency).toBeGreaterThan(0);
    });

    it('should return healthy status even with test email rejection', async () => {
      const testEmailError = new Error('Email to test@example.com rejected');
      jest.spyOn(require('resend').Resend.prototype.emails, 'send')
        .mockRejectedValueOnce(testEmailError);

      const result = await emailService.healthCheck();

      expect(result).toMatchObject({
        status: 'healthy',
        latency: expect.any(Number),
      });
    });

    it('should return unhealthy status for API failures', async () => {
      const apiError = new Error('API key invalid');
      jest.spyOn(require('resend').Resend.prototype.emails, 'send')
        .mockRejectedValueOnce(apiError);

      const result = await emailService.healthCheck();

      expect(result).toMatchObject({
        status: 'unhealthy',
        latency: expect.any(Number),
      });
    });

    it('should measure latency correctly', async () => {
      // Mock a delayed response
      jest.spyOn(require('resend').Resend.prototype.emails, 'send')
        .mockImplementation(() => new Promise(resolve => {
          setTimeout(() => resolve({ data: { id: 'test' } }), 100);
        }));

      const result = await emailService.healthCheck();

      expect(result.latency).toBeGreaterThan(90); // Should be around 100ms
    });
  });

  describe('email content validation', () => {
    it('should generate consistent HTML structure', async () => {
      const emailInput = {
        to: 'test@example.com',
        templateType: 'resume-optimization' as const,
        templateData: testEmailTemplateData.resumeOptimization,
      };

      await emailService.sendEmail(emailInput);

      const resendCall = require('resend').Resend.prototype.emails.send.mock.calls[0][0];
      
      // Check for proper HTML structure
      expect(resendCall.html).toContain('<!DOCTYPE html>');
      expect(resendCall.html).toContain('<html lang="en">');
      expect(resendCall.html).toContain('<head>');
      expect(resendCall.html).toContain('<body>');
      expect(resendCall.html).toContain('<style>');
      
      // Check for CSS classes
      expect(resendCall.html).toContain('class="header"');
      expect(resendCall.html).toContain('class="content"');
      expect(resendCall.html).toContain('class="footer"');
    });

    it('should include required email headers', async () => {
      const emailInput = {
        to: 'test@example.com',
        templateType: 'resume-optimization' as const,
        templateData: testEmailTemplateData.resumeOptimization,
      };

      await emailService.sendEmail(emailInput);

      const resendCall = require('resend').Resend.prototype.emails.send.mock.calls[0][0];
      
      expect(resendCall.from).toBeDefined();
      expect(resendCall.to).toBe('test@example.com');
      expect(resendCall.subject).toBeDefined();
      expect(resendCall.html).toBeDefined();
      expect(resendCall.text).toBeDefined();
      expect(resendCall.replyTo).toBeDefined();
    });

    it('should generate accessible text versions', async () => {
      const emailInput = {
        to: 'test@example.com',
        templateType: 'resume-optimization' as const,
        templateData: testEmailTemplateData.resumeOptimization,
      };

      await emailService.sendEmail(emailInput);

      const resendCall = require('resend').Resend.prototype.emails.send.mock.calls[0][0];
      
      // Text version should contain key information without HTML
      expect(resendCall.text).toContain('John Doe');
      expect(resendCall.text).toContain('85%');
      expect(resendCall.text).not.toContain('<html>');
      expect(resendCall.text).not.toContain('<div');
      expect(resendCall.text).not.toContain('<style>');
    });
  });

  describe('input sanitization and security', () => {
    it('should handle special characters in user data', async () => {
      const dataWithSpecialChars = {
        ...testEmailTemplateData.resumeOptimization,
        userName: 'John <script>alert("xss")</script> Doe',
        improvements: ['Fixed <img src=x onerror=alert("xss")> formatting'],
      };

      const emailInput = {
        to: 'test@example.com',
        templateType: 'resume-optimization' as const,
        templateData: dataWithSpecialChars,
      };

      const result = await emailService.sendEmail(emailInput);

      expect(result.success).toBe(true);
      
      const resendCall = require('resend').Resend.prototype.emails.send.mock.calls[0][0];
      
      // Content should be included (basic escaping is handled by the template)
      expect(resendCall.html).toContain('John');
      expect(resendCall.html).toContain('Doe');
    });

    it('should handle empty template data gracefully', async () => {
      const emptyData = {
        userName: '',
        templateName: '',
        optimizationFeatures: [],
        atsScore: 0,
        keywordMatches: [],
        improvements: [],
        processingTime: '',
      };

      const emailInput = {
        to: 'test@example.com',
        templateType: 'resume-optimization' as const,
        templateData: emptyData,
      };

      const result = await emailService.sendEmail(emailInput);

      expect(result.success).toBe(true);
    });

    it('should validate attachment content types', async () => {
      const emailInput = {
        to: 'test@example.com',
        templateType: 'resume-optimization' as const,
        templateData: testEmailTemplateData.resumeOptimization,
        attachments: [
          {
            filename: 'resume.pdf',
            content: Buffer.from('pdf-content'),
            contentType: 'application/pdf',
          },
          {
            filename: 'cover.docx',
            content: Buffer.from('docx-content'),
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
        ],
      };

      const result = await emailService.sendEmail(emailInput);

      expect(result.success).toBe(true);
      
      const resendCall = require('resend').Resend.prototype.emails.send.mock.calls[0][0];
      expect(resendCall.attachments).toHaveLength(2);
      expect(resendCall.attachments[0].contentType).toBe('application/pdf');
      expect(resendCall.attachments[1].contentType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });
  });

  describe('error handling', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      jest.spyOn(require('resend').Resend.prototype.emails, 'send')
        .mockRejectedValueOnce(timeoutError);

      const emailInput = {
        to: 'test@example.com',
        templateType: 'resume-optimization' as const,
        templateData: testEmailTemplateData.resumeOptimization,
      };

      const result = await emailService.sendEmail(emailInput);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Request timeout');
    });

    it('should handle invalid API responses', async () => {
      jest.spyOn(require('resend').Resend.prototype.emails, 'send')
        .mockResolvedValueOnce(null); // Invalid response

      const emailInput = {
        to: 'test@example.com',
        templateType: 'resume-optimization' as const,
        templateData: testEmailTemplateData.resumeOptimization,
      };

      const result = await emailService.sendEmail(emailInput);

      expect(result.messageId).toBe('unknown');
      expect(result.success).toBe(true);
    });

    it('should handle undefined errors gracefully', async () => {
      jest.spyOn(require('resend').Resend.prototype.emails, 'send')
        .mockRejectedValueOnce(undefined);

      const emailInput = {
        to: 'test@example.com',
        templateType: 'resume-optimization' as const,
        templateData: testEmailTemplateData.resumeOptimization,
      };

      const result = await emailService.sendEmail(emailInput);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Unknown error');
    });
  });
});