import puppeteer, { Browser, Page } from 'puppeteer';
import { config } from '@resume-vita/config';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

// PDF generation schemas
const PDFGenerationInputSchema = z.object({
  templateId: z.enum(['ats-optimized', 'entry-clean', 'tech-focus', 'professional-plus', 'executive-format']),
  resumeContent: z.string().min(100, 'Resume content must be substantial'),
  personalInfo: z.object({
    fullName: z.string(),
    email: z.string().email(),
    phone: z.string(),
    location: z.string(),
    linkedin: z.string().optional(),
    portfolio: z.string().optional(),
  }),
  fileName: z.string().optional(),
});

type PDFGenerationInput = z.infer<typeof PDFGenerationInputSchema>;

// PDF generation result
interface PDFGenerationResult {
  pdfBuffer: Buffer;
  fileName: string;
  fileSize: number;
  generatedAt: Date;
  templateUsed: string;
  processingTime: number;
}

// Template-specific styles and configurations
const TEMPLATE_CONFIGS = {
  'ats-optimized': {
    name: 'ATS Optimized',
    styles: {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11pt',
      lineHeight: '1.4',
      color: '#000000',
      backgroundColor: '#ffffff',
      margins: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' },
    },
    features: ['simple-layout', 'ats-friendly', 'clean-sections'],
  },
  'entry-clean': {
    name: 'Premium Classic',
    styles: {
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      fontSize: '10.5pt',
      lineHeight: '1.5',
      color: '#2c3e50',
      backgroundColor: '#ffffff',
      accentColor: '#3498db',
      margins: { top: '0.75in', bottom: '0.75in', left: '0.75in', right: '0.75in' },
    },
    features: ['gradient-header', 'enhanced-styling', 'professional-layout'],
  },
  'tech-focus': {
    name: 'Tech Focus',
    styles: {
      fontFamily: 'Consolas, Monaco, Courier New, monospace, sans-serif',
      fontSize: '10pt',
      lineHeight: '1.4',
      color: '#0f0f23',
      backgroundColor: '#ffffff',
      accentColor: '#00d4ff',
      margins: { top: '0.5in', bottom: '0.5in', left: '0.75in', right: '0.75in' },
    },
    features: ['tech-gradient', 'monospace-code', 'technical-sections'],
  },
  'professional-plus': {
    name: 'Professional Plus',
    styles: {
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: '11pt',
      lineHeight: '1.5',
      color: '#1a1a1a',
      backgroundColor: '#ffffff',
      accentColor: '#8b4513',
      margins: { top: '1in', bottom: '1in', left: '0.75in', right: '0.75in' },
    },
    features: ['executive-header', 'decorative-elements', 'enhanced-achievements'],
  },
  'executive-format': {
    name: 'Executive Format',
    styles: {
      fontFamily: 'Times New Roman, Georgia, serif',
      fontSize: '11pt',
      lineHeight: '1.5',
      color: '#000000',
      backgroundColor: '#ffffff',
      accentColor: '#2c3e50',
      margins: { top: '1in', bottom: '1in', left: '1in', right: '1in' },
    },
    features: ['premium-header', 'leadership-focus', 'board-positions'],
  },
} as const;

class PDFService {
  private browser: Browser | null = null;

  /**
   * Initialize browser instance (singleton pattern)
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080',
        ],
        defaultViewport: {
          width: 1920,
          height: 1080,
        },
      });
    }
    return this.browser;
  }

  /**
   * Generate PDF from resume content
   */
  async generatePDF(input: PDFGenerationInput): Promise<PDFGenerationResult> {
    const startTime = Date.now();
    
    // Validate input
    const validatedInput = PDFGenerationInputSchema.parse(input);
    
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // Generate HTML content for the specific template
      const htmlContent = await this.generateTemplateHTML(validatedInput);
      
      // Set content and wait for it to load
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Configure PDF options based on template
      const templateConfig = TEMPLATE_CONFIGS[validatedInput.templateId];
      const pdfOptions: Parameters<Page['pdf']>[0] = {
        format: 'a4',
        printBackground: true,
        margin: templateConfig.styles.margins,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
      };

      // Generate PDF
      const pdfBuffer = await page.pdf(pdfOptions);
      
      // Generate filename
      const fileName = validatedInput.fileName || 
        `${validatedInput.personalInfo.fullName.replace(/\s+/g, '_')}_${validatedInput.templateId}.pdf`;

      const processingTime = Date.now() - startTime;

      return {
        pdfBuffer: Buffer.from(pdfBuffer),
        fileName,
        fileSize: pdfBuffer.byteLength,
        generatedAt: new Date(),
        templateUsed: validatedInput.templateId,
        processingTime,
      };
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error('Failed to generate PDF');
    } finally {
      await page.close();
    }
  }

  /**
   * Generate HTML content for specific template
   */
  private async generateTemplateHTML(input: PDFGenerationInput): Promise<string> {
    const templateConfig = TEMPLATE_CONFIGS[input.templateId];
    
    // Base HTML structure
    const baseHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${input.personalInfo.fullName} - Resume</title>
      <style>
        ${await this.generateTemplateCSS(input.templateId)}
      </style>
    </head>
    <body>
      <div class="resume-container">
        ${await this.generateTemplateBody(input)}
      </div>
    </body>
    </html>`;

    return baseHTML;
  }

  /**
   * Generate CSS styles for specific template
   */
  private async generateTemplateCSS(templateId: PDFGenerationInput['templateId']): Promise<string> {
    const config = TEMPLATE_CONFIGS[templateId];
    
    const baseCSS = `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      body {
        font-family: ${config.styles.fontFamily};
        font-size: ${config.styles.fontSize};
        line-height: ${config.styles.lineHeight};
        color: ${config.styles.color};
        background-color: ${config.styles.backgroundColor};
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .resume-container {
        max-width: 8.5in;
        margin: 0 auto;
        padding: 0;
        background-color: white;
      }
      
      .header {
        text-align: center;
        margin-bottom: 20px;
        padding: 20px 0;
      }
      
      .name {
        font-size: 24pt;
        font-weight: bold;
        margin-bottom: 10px;
      }
      
      .contact-info {
        font-size: 10pt;
        margin-bottom: 5px;
      }
      
      .section {
        margin-bottom: 20px;
      }
      
      .section-title {
        font-size: 14pt;
        font-weight: bold;
        margin-bottom: 10px;
        text-transform: uppercase;
        border-bottom: 2px solid ${config.styles.accentColor || '#000000'};
        padding-bottom: 5px;
      }
      
      .content {
        margin-bottom: 15px;
      }
      
      .job-entry, .education-entry {
        margin-bottom: 15px;
      }
      
      .job-title, .degree {
        font-weight: bold;
        font-size: 12pt;
      }
      
      .company, .school {
        font-style: italic;
        margin-bottom: 5px;
      }
      
      .date-location {
        font-size: 9pt;
        color: #666;
        margin-bottom: 8px;
      }
      
      .achievement, .course {
        margin-bottom: 5px;
        padding-left: 15px;
        position: relative;
      }
      
      .achievement:before {
        content: "•";
        position: absolute;
        left: 0;
        color: ${config.styles.accentColor || '#000000'};
        font-weight: bold;
      }
      
      .skills-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 10px;
      }
      
      .skill-category {
        margin-bottom: 10px;
      }
      
      .skill-category-title {
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      @page {
        size: A4;
        margin: ${config.styles.margins.top} ${config.styles.margins.right} ${config.styles.margins.bottom} ${config.styles.margins.left};
      }
    `;

    // Add template-specific styles
    const templateSpecificCSS = await this.getTemplateSpecificCSS(templateId);
    
    return baseCSS + templateSpecificCSS;
  }

  /**
   * Get template-specific CSS
   */
  private async getTemplateSpecificCSS(templateId: PDFGenerationInput['templateId']): Promise<string> {
    switch (templateId) {
      case 'ats-optimized':
        return `
          .header { border-bottom: 3px solid #000; }
          .section-title { border-bottom: 1px solid #000; }
        `;
        
      case 'entry-clean':
        return `
          .header {
            background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
            border-radius: 10px;
            padding: 25px;
          }
          .name { color: #3498db; }
          .section-title { color: #3498db; }
        `;
        
      case 'tech-focus':
        return `
          .header {
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
            color: white;
            border-radius: 8px;
            padding: 25px;
          }
          .name {
            background: linear-gradient(90deg, #00d4ff, #5a67d8, #ed64a6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .code { font-family: monospace; background: #f5f5f5; padding: 2px 4px; }
        `;
        
      case 'professional-plus':
        return `
          .header { border: 3px double #8b4513; padding: 25px; }
          .name { color: #8b4513; }
          .section-title { position: relative; }
          .section-title:before { content: "♦"; margin-right: 10px; color: #8b4513; }
        `;
        
      case 'executive-format':
        return `
          .header { 
            border: 2px solid #2c3e50; 
            border-radius: 5px;
            padding: 30px;
            margin-bottom: 30px;
          }
          .name { color: #2c3e50; }
          .section-title:after { content: " ★"; color: #2c3e50; }
          .achievement:before { content: "★"; }
        `;
        
      default:
        return '';
    }
  }

  /**
   * Generate HTML body content for template
   */
  private async generateTemplateBody(input: PDFGenerationInput): Promise<string> {
    const { personalInfo, resumeContent } = input;
    
    // Parse resume content (this would be enhanced based on the structured data)
    const sections = this.parseResumeContent(resumeContent);
    
    return `
      <div class="header">
        <div class="name">${personalInfo.fullName}</div>
        <div class="contact-info">${personalInfo.email}</div>
        <div class="contact-info">${personalInfo.phone}</div>
        <div class="contact-info">${personalInfo.location}</div>
        ${personalInfo.linkedin ? `<div class="contact-info">${personalInfo.linkedin}</div>` : ''}
        ${personalInfo.portfolio ? `<div class="contact-info">${personalInfo.portfolio}</div>` : ''}
      </div>
      
      ${sections.summary ? `
        <div class="section">
          <div class="section-title">Professional Summary</div>
          <div class="content">${sections.summary}</div>
        </div>
      ` : ''}
      
      ${sections.experience ? `
        <div class="section">
          <div class="section-title">Professional Experience</div>
          ${sections.experience}
        </div>
      ` : ''}
      
      ${sections.education ? `
        <div class="section">
          <div class="section-title">Education</div>
          ${sections.education}
        </div>
      ` : ''}
      
      ${sections.skills ? `
        <div class="section">
          <div class="section-title">Skills</div>
          <div class="skills-grid">${sections.skills}</div>
        </div>
      ` : ''}
      
      ${sections.certifications ? `
        <div class="section">
          <div class="section-title">Certifications</div>
          ${sections.certifications}
        </div>
      ` : ''}
    `;
  }

  /**
   * Parse resume content into sections (simplified implementation)
   */
  private parseResumeContent(content: string): {
    summary?: string;
    experience?: string;
    education?: string;
    skills?: string;
    certifications?: string;
  } {
    // This is a simplified parser - in production, this would use the AI-parsed structured data
    const sections: any = {};
    
    // Extract sections using basic regex patterns
    const summaryMatch = content.match(/(?:SUMMARY|PROFILE|OBJECTIVE)(.*?)(?=\n\n|\n[A-Z]|$)/is);
    if (summaryMatch) {
      sections.summary = summaryMatch[1].trim();
    }
    
    const experienceMatch = content.match(/(?:EXPERIENCE|EMPLOYMENT|WORK HISTORY)(.*?)(?=\n\n[A-Z]|\nEDUCATION|\nSKILLS|$)/is);
    if (experienceMatch) {
      sections.experience = this.formatExperienceSection(experienceMatch[1].trim());
    }
    
    const educationMatch = content.match(/(?:EDUCATION|ACADEMIC)(.*?)(?=\n\n[A-Z]|\nSKILLS|\nCERTIFICATIONS|$)/is);
    if (educationMatch) {
      sections.education = this.formatEducationSection(educationMatch[1].trim());
    }
    
    const skillsMatch = content.match(/(?:SKILLS|TECHNICAL SKILLS|COMPETENCIES)(.*?)(?=\n\n[A-Z]|\nCERTIFICATIONS|$)/is);
    if (skillsMatch) {
      sections.skills = this.formatSkillsSection(skillsMatch[1].trim());
    }
    
    return sections;
  }

  private formatExperienceSection(content: string): string {
    return content.split('\n\n').map(job => `
      <div class="job-entry">
        <div class="job-title">${job.split('\n')[0]}</div>
        <div class="company">${job.split('\n')[1] || ''}</div>
        <div class="date-location">${job.split('\n')[2] || ''}</div>
        ${job.split('\n').slice(3).map(achievement => 
          achievement.trim() ? `<div class="achievement">${achievement.trim()}</div>` : ''
        ).join('')}
      </div>
    `).join('');
  }

  private formatEducationSection(content: string): string {
    return content.split('\n\n').map(edu => `
      <div class="education-entry">
        <div class="degree">${edu.split('\n')[0]}</div>
        <div class="school">${edu.split('\n')[1] || ''}</div>
        <div class="date-location">${edu.split('\n')[2] || ''}</div>
      </div>
    `).join('');
  }

  private formatSkillsSection(content: string): string {
    return content.split(',').map(skill => 
      `<div class="skill-item">${skill.trim()}</div>`
    ).join('');
  }

  /**
   * Generate preview image of PDF (for thumbnails)
   */
  async generatePreviewImage(input: PDFGenerationInput): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      const htmlContent = await this.generateTemplateHTML(input);
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      // Set viewport for preview
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

      // Take screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 0, width: 794, height: 1123 },
      });

      return Buffer.from(screenshot);
    } finally {
      await page.close();
    }
  }

  /**
   * Close browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Health check for PDF service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const start = Date.now();
    
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      await page.setContent('<html><body><h1>Health Check</h1></body></html>');
      await page.close();
      
      return {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } catch (error) {
      console.error('PDF service health check failed:', error);
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
      };
    }
  }
}

// Export singleton instance
export const pdfService = new PDFService();
export type { PDFGenerationResult, PDFGenerationInput };