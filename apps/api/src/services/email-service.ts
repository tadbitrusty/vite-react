import { Resend } from 'resend';
import { config } from '@resume-vita/config';
import { z } from 'zod';

// Email service configuration
const resend = new Resend(config.env.RESEND_API_KEY);

// Email validation schemas
const EmailDeliveryInputSchema = z.object({
  to: z.string().email('Valid email address required'),
  templateType: z.enum(['resume-optimization', 'resume-builder', 'payment-confirmation']),
  templateData: z.record(z.any()),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.instanceof(Buffer),
    contentType: z.string(),
  })).optional(),
});

type EmailDeliveryInput = z.infer<typeof EmailDeliveryInputSchema>;

// Email template data interfaces
interface ResumeOptimizationEmailData {
  userName: string;
  templateName: string;
  optimizationFeatures: string[];
  atsScore: number;
  keywordMatches: string[];
  improvements: string[];
  processingTime: string;
}

interface ResumeBuilderEmailData {
  userName: string;
  packageType: 'basic' | 'enhanced';
  templateName: string;
  features: string[];
  nextSteps: string[];
}

interface PaymentConfirmationEmailData {
  userName: string;
  transactionId: string;
  amount: string;
  productName: string;
  features: string[];
}

// Email delivery result
interface EmailDeliveryResult {
  messageId: string;
  success: boolean;
  deliveredAt: Date;
  recipientEmail: string;
  templateUsed: string;
  errorMessage?: string;
}

class EmailService {
  /**
   * Send email with template and attachments
   */
  async sendEmail(input: EmailDeliveryInput): Promise<EmailDeliveryResult> {
    // Validate input
    const validatedInput = EmailDeliveryInputSchema.parse(input);
    
    try {
      // Generate email content based on template
      const emailContent = await this.generateEmailContent(
        validatedInput.templateType,
        validatedInput.templateData
      );

      // Prepare attachments
      const attachments = validatedInput.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      }));

      // Send email via Resend
      const result = await resend.emails.send({
        from: config.email.from,
        to: validatedInput.to,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        attachments,
        replyTo: config.email.replyTo,
      });

      return {
        messageId: result.data?.id || 'unknown',
        success: true,
        deliveredAt: new Date(),
        recipientEmail: validatedInput.to,
        templateUsed: validatedInput.templateType,
      };
    } catch (error) {
      console.error('Email delivery failed:', error);
      
      return {
        messageId: '',
        success: false,
        deliveredAt: new Date(),
        recipientEmail: validatedInput.to,
        templateUsed: validatedInput.templateType,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate email content based on template type
   */
  private async generateEmailContent(
    templateType: EmailDeliveryInput['templateType'],
    data: any
  ): Promise<{ subject: string; html: string; text: string }> {
    switch (templateType) {
      case 'resume-optimization':
        return this.generateResumeOptimizationEmail(data as ResumeOptimizationEmailData);
      case 'resume-builder':
        return this.generateResumeBuilderEmail(data as ResumeBuilderEmailData);
      case 'payment-confirmation':
        return this.generatePaymentConfirmationEmail(data as PaymentConfirmationEmailData);
      default:
        throw new Error(`Unknown email template: ${templateType}`);
    }
  }

  /**
   * Generate resume optimization completion email
   */
  private async generateResumeOptimizationEmail(
    data: ResumeOptimizationEmailData
  ): Promise<{ subject: string; html: string; text: string }> {
    const subject = `Your ${data.templateName} Resume is Ready - Resume Vita`;
    
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
        }
        .header { 
          background: linear-gradient(135deg, #4a90a4 0%, #2d3748 100%); 
          color: white; 
          padding: 30px; 
          text-align: center; 
          border-radius: 10px 10px 0 0; 
        }
        .content { 
          background: #ffffff; 
          padding: 30px; 
          border: 1px solid #e0e0e0; 
        }
        .footer { 
          background: #f8f9fa; 
          padding: 20px; 
          text-align: center; 
          border-radius: 0 0 10px 10px; 
          font-size: 14px; 
          color: #666; 
        }
        .highlight { 
          background: #e3f2fd; 
          padding: 15px; 
          border-left: 4px solid #4a90a4; 
          margin: 20px 0; 
        }
        .features-list { 
          background: #f8f9fa; 
          padding: 20px; 
          border-radius: 8px; 
          margin: 20px 0; 
        }
        .btn { 
          display: inline-block; 
          background: #4a90a4; 
          color: white; 
          padding: 12px 25px; 
          text-decoration: none; 
          border-radius: 6px; 
          margin: 10px 0; 
        }
        .stats { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
          gap: 15px; 
          margin: 20px 0; 
        }
        .stat-item { 
          text-align: center; 
          padding: 15px; 
          background: #e3f2fd; 
          border-radius: 8px; 
        }
        .stat-number { 
          font-size: 24px; 
          font-weight: bold; 
          color: #4a90a4; 
        }
        ul { 
          padding-left: 20px; 
        }
        li { 
          margin: 8px 0; 
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 Your Resume is Ready!</h1>
        <p>Your ${data.templateName} resume has been optimized and is attached to this email.</p>
      </div>
      
      <div class="content">
        <p>Hi ${data.userName},</p>
        
        <p>Great news! Your resume has been successfully optimized using our advanced AI technology. Your professionally crafted ${data.templateName} resume is now ready to help you land your dream job.</p>
        
        <div class="stats">
          <div class="stat-item">
            <div class="stat-number">${data.atsScore}%</div>
            <div>ATS Score</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${data.keywordMatches.length}</div>
            <div>Keywords Matched</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${data.processingTime}</div>
            <div>Processing Time</div>
          </div>
        </div>
        
        <div class="highlight">
          <h3>🚀 What We've Optimized</h3>
          <ul>
            ${data.improvements.map(improvement => `<li>${improvement}</li>`).join('')}
          </ul>
        </div>
        
        <div class="features-list">
          <h3>✨ ${data.templateName} Features</h3>
          <ul>
            ${data.optimizationFeatures.map(feature => `<li>${feature}</li>`).join('')}
          </ul>
        </div>
        
        <div class="highlight">
          <h3>🎯 Matched Keywords</h3>
          <p><strong>Your resume now includes these important keywords:</strong> ${data.keywordMatches.join(', ')}</p>
        </div>
        
        <h3>📋 Next Steps</h3>
        <ol>
          <li><strong>Download your resume</strong> - The optimized PDF is attached to this email</li>
          <li><strong>Review and customize</strong> - Make any personal adjustments you feel are necessary</li>
          <li><strong>Start applying</strong> - Your resume is now ATS-friendly and ready for job applications</li>
          <li><strong>Save multiple versions</strong> - Keep a master copy and customize for specific roles</li>
        </ol>
        
        <p style="margin-top: 30px;">
          <a href="mailto:support@resumevita.com" class="btn">Need Help? Contact Support</a>
        </p>
        
        <p><strong>Pro Tip:</strong> Customize your resume for each application by adjusting the keywords and experience descriptions to match specific job postings.</p>
      </div>
      
      <div class="footer">
        <p>© 2024 Resume Vita. Transforming careers through AI-powered resume optimization.</p>
        <p>Questions? Reply to this email or contact us at support@resumevita.com</p>
      </div>
    </body>
    </html>`;

    const text = `
Your ${data.templateName} Resume is Ready - Resume Vita

Hi ${data.userName},

Great news! Your resume has been successfully optimized using our advanced AI technology.

ATS Score: ${data.atsScore}%
Keywords Matched: ${data.keywordMatches.length}
Processing Time: ${data.processingTime}

What We've Optimized:
${data.improvements.map(improvement => `• ${improvement}`).join('\n')}

Matched Keywords: ${data.keywordMatches.join(', ')}

Next Steps:
1. Download your resume - The optimized PDF is attached to this email
2. Review and customize - Make any personal adjustments
3. Start applying - Your resume is now ATS-friendly
4. Save multiple versions - Keep a master copy

Questions? Contact us at support@resumevita.com

© 2024 Resume Vita
`;

    return { subject, html, text };
  }

  /**
   * Generate resume builder completion email
   */
  private async generateResumeBuilderEmail(
    data: ResumeBuilderEmailData
  ): Promise<{ subject: string; html: string; text: string }> {
    const subject = `Your ${data.packageType.charAt(0).toUpperCase() + data.packageType.slice(1)} Resume Package is Ready - Resume Vita`;
    
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
        }
        .header { 
          background: linear-gradient(135deg, #4a90a4 0%, #2d3748 100%); 
          color: white; 
          padding: 30px; 
          text-align: center; 
          border-radius: 10px 10px 0 0; 
        }
        .content { 
          background: #ffffff; 
          padding: 30px; 
          border: 1px solid #e0e0e0; 
        }
        .footer { 
          background: #f8f9fa; 
          padding: 20px; 
          text-align: center; 
          border-radius: 0 0 10px 10px; 
          font-size: 14px; 
          color: #666; 
        }
        .package-features { 
          background: #e8f5e8; 
          padding: 20px; 
          border-radius: 8px; 
          margin: 20px 0; 
          border-left: 4px solid #4a90a4; 
        }
        .btn { 
          display: inline-block; 
          background: #4a90a4; 
          color: white; 
          padding: 12px 25px; 
          text-decoration: none; 
          border-radius: 6px; 
          margin: 10px 0; 
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📄 Your Resume Package is Complete!</h1>
        <p>Your professionally built ${data.templateName} resume is attached and ready to use.</p>
      </div>
      
      <div class="content">
        <p>Hi ${data.userName},</p>
        
        <p>Congratulations! Your ${data.packageType} resume package has been completed successfully. Our expert AI has crafted a professional resume that showcases your unique skills and experience.</p>
        
        <div class="package-features">
          <h3>📦 Your ${data.packageType.charAt(0).toUpperCase() + data.packageType.slice(1)} Package Includes:</h3>
          <ul>
            ${data.features.map(feature => `<li>${feature}</li>`).join('')}
          </ul>
        </div>
        
        <h3>🎯 What Makes Your Resume Special</h3>
        <ul>
          <li><strong>ATS-Optimized Format:</strong> Designed to pass through applicant tracking systems</li>
          <li><strong>Professional Styling:</strong> Clean, modern design that impresses hiring managers</li>
          <li><strong>Industry-Relevant Keywords:</strong> Strategically placed to match job requirements</li>
          <li><strong>Achievement-Focused:</strong> Highlights your accomplishments with impact metrics</li>
        </ul>
        
        <h3>📋 Next Steps</h3>
        <ol>
          ${data.nextSteps.map(step => `<li>${step}</li>`).join('')}
        </ol>
        
        <p style="margin-top: 30px;">
          <a href="mailto:support@resumevita.com" class="btn">Get Resume Tips & Support</a>
        </p>
        
        <p><strong>Bonus Tip:</strong> Keep your resume updated with new achievements and skills as you grow in your career!</p>
      </div>
      
      <div class="footer">
        <p>© 2024 Resume Vita. Building careers one resume at a time.</p>
        <p>Need assistance? Contact us at support@resumevita.com</p>
      </div>
    </body>
    </html>`;

    const text = `
Your ${data.packageType.charAt(0).toUpperCase() + data.packageType.slice(1)} Resume Package is Complete!

Hi ${data.userName},

Your ${data.packageType} resume package has been completed successfully.

Your Package Includes:
${data.features.map(feature => `• ${feature}`).join('\n')}

Next Steps:
${data.nextSteps.map(step => `• ${step}`).join('\n')}

Contact us at support@resumevita.com for assistance.

© 2024 Resume Vita
`;

    return { subject, html, text };
  }

  /**
   * Generate payment confirmation email
   */
  private async generatePaymentConfirmationEmail(
    data: PaymentConfirmationEmailData
  ): Promise<{ subject: string; html: string; text: string }> {
    const subject = `Payment Confirmed - Your ${data.productName} is Being Processed`;
    
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
        }
        .header { 
          background: linear-gradient(135deg, #4a90a4 0%, #2d3748 100%); 
          color: white; 
          padding: 30px; 
          text-align: center; 
          border-radius: 10px 10px 0 0; 
        }
        .content { 
          background: #ffffff; 
          padding: 30px; 
          border: 1px solid #e0e0e0; 
        }
        .footer { 
          background: #f8f9fa; 
          padding: 20px; 
          text-align: center; 
          border-radius: 0 0 10px 10px; 
          font-size: 14px; 
          color: #666; 
        }
        .payment-details { 
          background: #f0f8ff; 
          padding: 20px; 
          border-radius: 8px; 
          margin: 20px 0; 
          border: 1px solid #4a90a4; 
        }
        .processing-status { 
          background: #fff3cd; 
          border: 1px solid #ffc107; 
          padding: 15px; 
          border-radius: 8px; 
          margin: 20px 0; 
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>✅ Payment Confirmed</h1>
        <p>Thank you for your purchase! We're processing your order now.</p>
      </div>
      
      <div class="content">
        <p>Hi ${data.userName},</p>
        
        <p>Great news! Your payment has been successfully processed and your order is now being prepared.</p>
        
        <div class="payment-details">
          <h3>💳 Payment Details</h3>
          <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
          <p><strong>Product:</strong> ${data.productName}</p>
          <p><strong>Amount:</strong> ${data.amount}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="processing-status">
          <h3>⚙️ Processing Status</h3>
          <p>🔄 <strong>Processing:</strong> Your resume is being optimized and formatted</p>
          <p>📧 <strong>Next:</strong> You'll receive your completed resume via email within 2-3 minutes</p>
        </div>
        
        <h3>📦 What You'll Receive</h3>
        <ul>
          ${data.features.map(feature => `<li>${feature}</li>`).join('')}
        </ul>
        
        <p><strong>Estimated Delivery:</strong> Your completed resume will be delivered to this email address within the next few minutes.</p>
        
        <p style="margin-top: 30px;"><em>Thank you for choosing Resume Vita for your career advancement needs!</em></p>
      </div>
      
      <div class="footer">
        <p>© 2024 Resume Vita. Your trusted career partner.</p>
        <p>Questions about your order? Contact us at support@resumevita.com</p>
      </div>
    </body>
    </html>`;

    const text = `
Payment Confirmed - Your ${data.productName} is Being Processed

Hi ${data.userName},

Your payment has been successfully processed!

Payment Details:
Transaction ID: ${data.transactionId}
Product: ${data.productName}
Amount: ${data.amount}
Date: ${new Date().toLocaleDateString()}

What You'll Receive:
${data.features.map(feature => `• ${feature}`).join('\n')}

Your completed resume will be delivered within 2-3 minutes.

Questions? Contact us at support@resumevita.com

© 2024 Resume Vita
`;

    return { subject, html, text };
  }

  /**
   * Send bulk emails (for marketing/notifications)
   */
  async sendBulkEmails(emails: EmailDeliveryInput[]): Promise<EmailDeliveryResult[]> {
    const results: EmailDeliveryResult[] = [];
    
    // Process emails in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchPromises = batch.map(email => this.sendEmail(email));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            messageId: '',
            success: false,
            deliveredAt: new Date(),
            recipientEmail: batch[index]!.to,
            templateUsed: batch[index]!.templateType,
            errorMessage: result.reason,
          });
        }
      });
      
      // Small delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  /**
   * Health check for email service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const start = Date.now();
    
    try {
      // Test API connectivity (Resend doesn't have a specific health endpoint)
      // We'll use a dry-run approach or check API key validity
      const testResult = await resend.emails.send({
        from: config.email.from,
        to: 'test@example.com', // This won't actually send due to test domain
        subject: 'Health Check',
        html: '<p>Health check test</p>',
      });
      
      return {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } catch (error) {
      // If it's just the test email rejection, service is still healthy
      if (error instanceof Error && error.message.includes('test@example.com')) {
        return {
          status: 'healthy',
          latency: Date.now() - start,
        };
      }
      
      console.error('Email service health check failed:', error);
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
      };
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
export type { 
  EmailDeliveryResult, 
  EmailDeliveryInput,
  ResumeOptimizationEmailData,
  ResumeBuilderEmailData,
  PaymentConfirmationEmailData 
};