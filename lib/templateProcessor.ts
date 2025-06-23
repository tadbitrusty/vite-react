/**
 * Template Processing System for ResumeSniper
 * Handles variable replacement and conditional sections in HTML templates
 */

import fs from 'fs/promises';
import path from 'path';

// Template variable interfaces
export interface ResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    github?: string;
  };
  processedContent: {
    summary?: string;
    experience: string;
    education: string;
    skills?: string;
    certifications?: string;
    projects?: string;
  };
  executiveInfo?: {
    title?: string;
    highlights?: string;
    boardPositions?: string;
  };
}

// Template variable mapping
export function createTemplateVariables(data: ResumeData): Record<string, string> {
  return {
    // Personal Information
    '{{FULL_NAME}}': data.personalInfo.name,
    '{{EMAIL}}': data.personalInfo.email,
    '{{PHONE}}': data.personalInfo.phone,
    '{{LOCATION}}': data.personalInfo.location,
    '{{LINKEDIN}}': data.personalInfo.linkedin || '',
    '{{GITHUB}}': data.personalInfo.github || '',
    
    // Content Sections
    '{{SUMMARY}}': data.processedContent.summary || '',
    '{{EXPERIENCE}}': data.processedContent.experience,
    '{{EDUCATION}}': data.processedContent.education,
    '{{SKILLS}}': data.processedContent.skills || '',
    '{{CERTIFICATIONS}}': data.processedContent.certifications || '',
    '{{PROJECTS}}': data.processedContent.projects || '',
    
    // Executive-Specific
    '{{EXECUTIVE_TITLE}}': data.executiveInfo?.title || '',
    '{{LEADERSHIP_HIGHLIGHTS}}': data.executiveInfo?.highlights || '',
    '{{BOARD_POSITIONS}}': data.executiveInfo?.boardPositions || '',
  };
}

// Process conditional sections in templates
export function processConditionalSections(template: string, data: ResumeData): string {
  let processed = template;
  
  // Handle {{#if VARIABLE}} ... {{/if}} blocks
  const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  
  processed = processed.replace(conditionalRegex, (match, variable, content) => {
    const variableMap = createTemplateVariables(data);
    const key = `{{${variable}}}`;
    const value = variableMap[key];
    
    // Include content if variable has a value
    return value && value.trim() ? content : '';
  });
  
  // Handle {{#if VARIABLE}} ... {{else}} ... {{/if}} blocks
  const conditionalElseRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g;
  
  processed = processed.replace(conditionalElseRegex, (match, variable, ifContent, elseContent) => {
    const variableMap = createTemplateVariables(data);
    const key = `{{${variable}}}`;
    const value = variableMap[key];
    
    return value && value.trim() ? ifContent : elseContent;
  });
  
  return processed;
}

// Format experience content for HTML
export function formatExperienceForTemplate(experience: string): string {
  // Split by job entries (assuming Claude returns structured text)
  const jobs = experience.split('\n\n').filter(job => job.trim());
  
  return jobs.map(job => {
    const lines = job.split('\n').filter(line => line.trim());
    if (lines.length === 0) return '';
    
    // Extract job title, company, dates (basic parsing)
    const titleLine = lines[0];
    const companyLine = lines[1] || '';
    const bullets = lines.slice(2);
    
    // Try to extract dates from title line
    const dateMatch = titleLine.match(/(\d{4}\s*-\s*(?:\d{4}|Present))/i);
    const dates = dateMatch ? dateMatch[1] : '';
    const title = titleLine.replace(dateMatch?.[0] || '', '').trim();
    
    let html = `
      <div class="job-entry clearfix">
        <div class="job-header">
          <div class="job-title">${title} <span class="job-dates">${dates}</span></div>
          <div class="company-info">${companyLine}</div>
        </div>
        <div class="job-description">
    `;
    
    if (bullets.length > 0) {
      html += '<ul>';
      bullets.forEach(bullet => {
        const cleanBullet = bullet.replace(/^[\s\-\*\•]+/, '').trim();
        if (cleanBullet) {
          html += `<li>${cleanBullet}</li>`;
        }
      });
      html += '</ul>';
    }
    
    html += '</div></div>';
    return html;
  }).join('\n');
}

// Format education content for HTML
export function formatEducationForTemplate(education: string): string {
  const entries = education.split('\n\n').filter(entry => entry.trim());
  
  return entries.map(entry => {
    const lines = entry.split('\n').filter(line => line.trim());
    if (lines.length === 0) return '';
    
    const degreeLine = lines[0];
    const schoolLine = lines[1] || '';
    const additionalInfo = lines.slice(2).join('<br>');
    
    // Try to extract dates
    const dateMatch = degreeLine.match(/(\d{4}\s*-\s*(?:\d{4}|Present))/i);
    const dates = dateMatch ? dateMatch[1] : '';
    const degree = degreeLine.replace(dateMatch?.[0] || '', '').trim();
    
    return `
      <div class="education-entry">
        <div class="degree-info">${degree} <span class="education-dates">${dates}</span></div>
        <div class="school-info">${schoolLine}</div>
        ${additionalInfo ? `<div class="additional-info">${additionalInfo}</div>` : ''}
      </div>
    `;
  }).join('\n');
}

// Format skills content for HTML
export function formatSkillsForTemplate(skills: string): string {
  // Try to detect if skills are categorized
  const lines = skills.split('\n').filter(line => line.trim());
  
  if (lines.some(line => line.includes(':'))) {
    // Categorized skills
    const categories: Array<{title: string, skills: string}> = [];
    let currentCategory = '';
    let currentSkills: string[] = [];
    
    lines.forEach(line => {
      if (line.includes(':')) {
        // Save previous category
        if (currentCategory) {
          categories.push({
            title: currentCategory,
            skills: currentSkills.join(', ')
          });
        }
        // Start new category
        const parts = line.split(':');
        currentCategory = parts[0].trim();
        currentSkills = parts[1] ? [parts[1].trim()] : [];
      } else {
        currentSkills.push(line.trim());
      }
    });
    
    // Save last category
    if (currentCategory) {
      categories.push({
        title: currentCategory,
        skills: currentSkills.join(', ')
      });
    }
    
    return categories.map(cat => `
      <div class="skill-category">
        <div class="skill-category-title">${cat.title}</div>
        <div class="skill-list">${cat.skills}</div>
      </div>
    `).join('\n');
  } else {
    // Simple skills list
    return `
      <div class="skill-category">
        <div class="skill-category-title">Technical Skills</div>
        <div class="skill-list">${lines.join(', ')}</div>
      </div>
    `;
  }
}

// Format certifications content for HTML
export function formatCertificationsForTemplate(certifications: string): string {
  const entries = certifications.split('\n').filter(entry => entry.trim());
  
  return entries.map(entry => {
    const cleanEntry = entry.replace(/^[\s\-\*\•]+/, '').trim();
    return `<div class="certification-entry">${cleanEntry}</div>`;
  }).join('\n');
}

// Main template processing function
export async function processTemplate(templateId: string, resumeData: ResumeData): Promise<string> {
  try {
    // Load template file
    const templatePath = path.join(process.cwd(), 'templates', `${templateId}.html`);
    let template = await fs.readFile(templatePath, 'utf8');
    
    // Format content sections for HTML
    const formattedData: ResumeData = {
      ...resumeData,
      processedContent: {
        ...resumeData.processedContent,
        experience: formatExperienceForTemplate(resumeData.processedContent.experience),
        education: formatEducationForTemplate(resumeData.processedContent.education),
        skills: resumeData.processedContent.skills ? 
          formatSkillsForTemplate(resumeData.processedContent.skills) : '',
        certifications: resumeData.processedContent.certifications ? 
          formatCertificationsForTemplate(resumeData.processedContent.certifications) : '',
      }
    };
    
    // Process conditional sections first
    template = processConditionalSections(template, formattedData);
    
    // Replace variables
    const variables = createTemplateVariables(formattedData);
    Object.entries(variables).forEach(([placeholder, value]) => {
      // Use global regex to replace all instances
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      template = template.replace(regex, value || '');
    });
    
    // Clean up any remaining empty conditional blocks
    template = template.replace(/\{\{#if\s+\w+\}\}\s*\{\{\/if\}\}/g, '');
    template = template.replace(/\{\{#if\s+\w+\}\}\s*\{\{else\}\}\s*\{\{\/if\}\}/g, '');
    
    return template;
    
  } catch (error) {
    console.error(`Error processing template ${templateId}:`, error);
    throw new Error(`Failed to process template: ${templateId}`);
  }
}

// Get template target description for AI prompting
export function getTemplateTarget(templateType: string): string {
  const targets = {
    'ats-optimized': 'general ATS compliance and broad industry appeal',
    'entry-clean': 'entry-level positions with clean, modern presentation',
    'tech-focus': 'technical roles with emphasis on skills and projects',
    'professional-plus': 'career advancement with enhanced formatting',
    'executive-format': 'senior leadership roles with executive presence'
  };
  return targets[templateType as keyof typeof targets] || targets['ats-optimized'];
}

// Template-specific AI prompting enhancements
export function getTemplatePromptEnhancements(templateType: string): string {
  const enhancements = {
    'ats-optimized': 'Focus on clean, simple formatting that ATS systems can easily parse. Use standard section headers and bullet points.',
    'entry-clean': 'Emphasize potential and learning ability. Use modern, professional language that appeals to entry-level positions.',
    'tech-focus': 'Prioritize technical skills and projects. Use technical terminology appropriately and highlight relevant technologies.',
    'professional-plus': 'Focus on career progression and achievements. Use strong action verbs and quantifiable results.',
    'executive-format': 'Emphasize leadership, strategic thinking, and high-level accomplishments. Use authoritative language and focus on business impact.'
  };
  return enhancements[templateType as keyof typeof enhancements] || enhancements['ats-optimized'];
}