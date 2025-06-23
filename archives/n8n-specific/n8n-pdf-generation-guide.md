# N8N PDF Generation Implementation Guide

## Overview
This guide shows how to integrate the template system with PDF generation in your N8N workflow.

## Required N8N Nodes

### 1. Template Router (Function Node)
- **Name**: "Template Selection Router"
- **Code**: Use the content from `n8n-template-router.js`
- **Position**: After whitelist authorization, before AI processing

### 2. Template Loader (HTTP Request Node)
- **Name**: "Load HTML Template" 
- **Method**: GET
- **URL**: `https://your-domain.com/templates/{{$json.templateFile}}`
- **Alternative**: Use local file system if templates are stored locally

### 3. Content Replacement (Function Node)
- **Name**: "Insert Resume Data"
- **Purpose**: Replace template variables with actual resume content
- **Input**: HTML template + optimized resume data
- **Output**: Complete HTML with all data populated

### 4. PDF Generator (Puppeteer/HTML to PDF)
Options:
- **HTML/CSS to PDF Node** (if available in your N8N instance)
- **Puppeteer Node** (custom implementation)
- **External API** (like PDFShift, HTMLCSStoImage, etc.)

## Template Variable Replacement

### Standard Variables
All templates support these variables:
```javascript
// Personal Information
{{FULL_NAME}}
{{EMAIL}}
{{PHONE}}
{{LOCATION}}
{{LINKEDIN}}
{{WEBSITE}}
{{GITHUB}} // For technical template

// Content Sections
{{SUMMARY}}
{{EXPERIENCE}} // Array of job objects
{{EDUCATION}} // Array of education objects
{{SKILLS}} // Array of skill categories
{{CERTIFICATIONS}} // Array of certifications

// Template-Specific Variables
{{EXECUTIVE_TITLE}} // Executive template only
{{LEADERSHIP_HIGHLIGHTS}} // Executive template only
{{PROJECTS}} // Technical template only
{{BOARD_POSITIONS}} // Executive template only
```

### Experience Object Structure
```javascript
{
  title: "Job Title",
  company: "Company Name", 
  location: "City, State",
  dates: "Jan 2020 - Present",
  bullets: ["Achievement 1", "Achievement 2"],
  description: "Alternative to bullets"
}
```

## N8N Workflow Integration Steps

### Step 1: Add Template Router
1. Insert Function node after authorization gateway
2. Copy code from `n8n-template-router.js`
3. Connect to receive template selection from frontend

### Step 2: Modify AI Processing
Update your Claude prompt to include template information:
```javascript
const prompt = `
Optimize this resume for the job description.
Template selected: {{$json.templateName}}
Focus: {{$json.templateDescription}}

Resume: {{$json.resumeContent}}
Job Description: {{$json.jobDescription}}

Return structured JSON with these fields:
- FULL_NAME
- EMAIL  
- PHONE
- LOCATION
- SUMMARY
- EXPERIENCE (array)
- EDUCATION (array)
- SKILLS (array)
- CERTIFICATIONS (array)
`;
```

### Step 3: Load Template File
Add HTTP Request node to load the selected template:
```javascript
// URL construction
const templateUrl = `https://your-domain.com/templates/${$json.templateFile}`;
```

### Step 4: Content Replacement Function
```javascript
// Function node to replace template variables
let htmlTemplate = $input.first().binary.data.toString();
const resumeData = $input.first().json;

// Replace all template variables
htmlTemplate = htmlTemplate.replace(/\{\{FULL_NAME\}\}/g, resumeData.FULL_NAME || '');
htmlTemplate = htmlTemplate.replace(/\{\{EMAIL\}\}/g, resumeData.EMAIL || '');
// ... continue for all variables

// Handle arrays (experience, education, skills)
if (resumeData.EXPERIENCE) {
  let experienceHtml = '';
  resumeData.EXPERIENCE.forEach(job => {
    experienceHtml += `
      <div class="job-entry">
        <div class="job-title">${job.title}</div>
        <div class="company-name">${job.company}</div>
        <!-- Add other job fields -->
      </div>
    `;
  });
  htmlTemplate = htmlTemplate.replace(/\{\{#each EXPERIENCE\}\}.*?\{\{\#\/each\}\}/gs, experienceHtml);
}

return [{
  json: { ...resumeData },
  binary: {
    data: Buffer.from(htmlTemplate)
  }
}];
```

### Step 5: PDF Generation
Choose one of these options:

#### Option A: Puppeteer Node
```javascript
// Puppeteer configuration
{
  "format": "A4",
  "margin": {
    "top": "0.5in",
    "bottom": "0.5in", 
    "left": "0.5in",
    "right": "0.5in"
  },
  "printBackground": true
}
```

#### Option B: External PDF API
```javascript
// HTTP Request to PDF service
{
  "method": "POST",
  "url": "https://api.pdfshift.io/v3/convert/pdf",
  "headers": {
    "Authorization": "Basic YOUR_API_KEY"
  },
  "body": {
    "source": htmlTemplate,
    "format": "A4",
    "margin": "0.5in"
  }
}
```

### Step 6: Email Delivery Update
Modify your email node to attach the PDF:
```javascript
// Email configuration
{
  "to": "{{$json.email}}",
  "subject": "Your Optimized Resume - {{$json.templateName}}",
  "text": "Your resume has been optimized using the {{$json.templateName}} template.",
  "attachments": [{
    "filename": "optimized_resume.pdf",
    "content": "{{$binary.data}}"
  }]
}
```

## Error Handling

### Template Selection Validation
```javascript
// In Template Router function
const validTemplates = ['classic-chronological', 'enhanced-professional', 'executive-senior', 'technical-focused', 'clean-modern'];
const selectedTemplate = $input.first().json.template;

if (!validTemplates.includes(selectedTemplate)) {
  // Log error and default to classic
  console.warn(`Invalid template: ${selectedTemplate}, defaulting to classic-chronological`);
  selectedTemplate = 'classic-chronological';
}
```

### PDF Generation Fallback
```javascript
// If PDF generation fails, send HTML instead
try {
  // PDF generation code
} catch (error) {
  console.error('PDF generation failed:', error);
  return [{
    json: { 
      ...resumeData,
      error: 'PDF generation failed, sending HTML version',
      fileType: 'html'
    },
    binary: { data: htmlTemplate }
  }];
}
```

## Testing Checklist

1. **Template Selection**: Verify all 5 templates load correctly
2. **Variable Replacement**: Test with sample data for each template
3. **PDF Generation**: Ensure PDF output matches template design
4. **Email Delivery**: Confirm PDF attachments work
5. **Error Handling**: Test invalid template selections
6. **Performance**: Monitor PDF generation time (target <30 seconds)

## Performance Optimization

1. **Template Caching**: Store templates in memory/cache
2. **Async Processing**: Generate PDF in parallel with other operations
3. **CDN Delivery**: Host templates on CDN for faster loading
4. **Compression**: Optimize PDF file size

## File Structure
```
/templates/
  ├── classic-chronological.html
  ├── enhanced-professional.html  
  ├── executive-senior.html
  ├── technical-focused.html
  └── clean-modern.html

/n8n-functions/
  ├── template-router.js
  ├── content-replacement.js
  └── pdf-generator.js
```

This implementation maintains the manufacturing line philosophy while adding professional PDF output with customer choice.