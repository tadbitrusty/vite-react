/**
 * PDF Generation Utility (JavaScript version)
 * Converts HTML resume templates to PDF format
 */

class PDFGenerator {
  static async generatePDF(options) {
    const { html, filename, format = 'A4', margin = { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' } } = options;

    // TODO: Implement actual PDF generation with puppeteer in production
    // For now, return HTML as buffer for basic functionality
    
    const pdfPlaceholder = `
<!DOCTYPE html>
<html>
<head>
    <title>Resume - ${filename}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0.5in; line-height: 1.4; }
        .pdf-notice { background: #f0f0f0; padding: 20px; border: 1px solid #ccc; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="pdf-notice">
        <h3>PDF Generation Notice</h3>
        <p>This is a temporary HTML version of your resume. PDF generation will be implemented in the next iteration.</p>
        <p>To convert to PDF: Save this page as PDF using your browser's print function (Ctrl+P or Cmd+P, then "Save as PDF")</p>
    </div>
    ${html}
</body>
</html>`;

    return Buffer.from(pdfPlaceholder, 'utf-8');
  }

  static async generateFromTemplate(templateHtml, data, filename) {
    // Process template with data
    const processedHtml = this.processTemplateData(templateHtml, data);
    
    return this.generatePDF({
      html: processedHtml,
      filename,
      format: 'A4'
    });
  }

  static processTemplateData(template, data) {
    // Simple template processing - replace placeholders with data
    let processed = template;
    
    // Replace personal info
    if (data.personalInfo) {
      processed = processed.replace(/\{\{fullName\}\}/g, data.personalInfo.name || '');
      processed = processed.replace(/\{\{email\}\}/g, data.personalInfo.email || '');
      processed = processed.replace(/\{\{phone\}\}/g, data.personalInfo.phone || '');
      processed = processed.replace(/\{\{location\}\}/g, data.personalInfo.location || '');
      processed = processed.replace(/\{\{linkedin\}\}/g, data.personalInfo.linkedin || '');
    }

    // Replace processed content
    if (data.processedContent) {
      processed = processed.replace(/\{\{summary\}\}/g, data.processedContent.summary || '');
      processed = processed.replace(/\{\{experience\}\}/g, data.processedContent.experience || '');
      processed = processed.replace(/\{\{education\}\}/g, data.processedContent.education || '');
      processed = processed.replace(/\{\{skills\}\}/g, data.processedContent.skills || '');
      processed = processed.replace(/\{\{certifications\}\}/g, data.processedContent.certifications || '');
    }

    return processed;
  }
}

// Utility function for API endpoints
async function generateResumePDF(resumeData, templateType = 'entry-clean') {
  // Load template (this would typically read from file system)
  const template = getResumeTemplate(templateType);
  
  const filename = `${resumeData.personalInfo?.name || 'Resume'}_${templateType}`;
  
  return PDFGenerator.generateFromTemplate(template, resumeData, filename);
}

// Template getter (placeholder - would read actual template files)
function getResumeTemplate(templateType) {
  // This would read from the templates directory
  // For now, return a basic template
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Professional Resume</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            line-height: 1.5;
            margin: 0;
            padding: 40px;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: bold;
        }
        .header .contact-info {
            font-size: 12px;
            color: #666;
        }
        .section {
            margin-bottom: 25px;
        }
        .section h2 {
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        .content {
            font-size: 12px;
            line-height: 1.6;
            white-space: pre-line;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{fullName}}</h1>
        <div class="contact-info">
            {{email}} • {{phone}} • {{location}}<br>
            {{linkedin}}
        </div>
    </div>

    <div class="section">
        <h2>Professional Summary</h2>
        <div class="content">{{summary}}</div>
    </div>

    <div class="section">
        <h2>Professional Experience</h2>
        <div class="content">{{experience}}</div>
    </div>

    <div class="section">
        <h2>Education</h2>
        <div class="content">{{education}}</div>
    </div>

    <div class="section">
        <h2>Skills</h2>
        <div class="content">{{skills}}</div>
    </div>

    <div class="section">
        <h2>Certifications</h2>
        <div class="content">{{certifications}}</div>
    </div>
</body>
</html>
  `;
}

module.exports = {
  PDFGenerator,
  generateResumePDF
};