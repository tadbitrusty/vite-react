import { test as base } from '@playwright/test';
import path from 'path';
import fs from 'fs';

export interface TestData {
  validUser: {
    email: string;
    name: string;
    phone: string;
    location: string;
  };
  sampleResume: {
    filePath: string;
    fileName: string;
    content: Buffer;
    base64: string;
  };
  jobDescription: string;
  templateIds: string[];
}

// Extend Playwright's base test with our test data fixture
export const test = base.extend<{ testData: TestData }>({
  testData: async ({}, use) => {
    // Create sample PDF content for testing
    const samplePdfContent = Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Sample Resume Content) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000136 00000 n 
0000000229 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
321
%%EOF`);

    const testData: TestData = {
      validUser: {
        email: 'playwright-test@example.com',
        name: 'Playwright Test User',
        phone: '+1-555-0123',
        location: 'Test City, TC 12345'
      },
      sampleResume: {
        filePath: path.join(__dirname, 'sample-resume.pdf'),
        fileName: 'sample-resume.pdf',
        content: samplePdfContent,
        base64: samplePdfContent.toString('base64')
      },
      jobDescription: 'Software Engineer position requiring 3+ years of experience in React, Node.js, and TypeScript. Must have experience with REST APIs, database design, and agile development practices. Strong problem-solving skills and ability to work in a fast-paced environment required.',
      templateIds: ['ats-optimized', 'entry-clean', 'tech-focus', 'professional-plus', 'executive-format']
    };

    // Create temporary test file
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    fs.writeFileSync(testData.sampleResume.filePath, testData.sampleResume.content);

    await use(testData);

    // Cleanup
    try {
      if (fs.existsSync(testData.sampleResume.filePath)) {
        fs.unlinkSync(testData.sampleResume.filePath);
      }
    } catch (error) {
      console.warn('Failed to cleanup test file:', error);
    }
  },
});

export { expect } from '@playwright/test';