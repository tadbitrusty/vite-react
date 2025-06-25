// Test data fixtures for consistent testing

export const testUsers = {
  validUser: {
    id: 'user_test_123',
    email: 'test@example.com',
    name: 'Test User',
    phone: '+1234567890',
    location: 'San Francisco, CA',
    isFirstTime: true,
    emailVerified: false,
    hasCompletedProfile: false,
  },
  
  returningUser: {
    id: 'user_test_456',
    email: 'returning@example.com',
    name: 'Returning User',
    phone: '+1987654321',
    location: 'New York, NY',
    isFirstTime: false,
    emailVerified: true,
    hasCompletedProfile: true,
  },
  
  blockedUser: {
    id: 'user_test_789',
    email: 'blocked@example.com',
    name: 'Blocked User',
    phone: '+1555666777',
    location: 'Los Angeles, CA',
    isFirstTime: false,
    emailVerified: false,
    hasCompletedProfile: false,
  },
};

export const testResumeData = {
  personalInfo: {
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '(555) 123-4567',
    location: 'San Francisco, CA',
    linkedin: 'https://linkedin.com/in/johndoe',
    portfolio: 'https://johndoe.dev',
  },
  
  professionalSummary: 'Experienced software engineer with 5+ years of experience in full-stack development. Proficient in React, Node.js, and cloud technologies.',
  
  workExperience: [
    {
      id: 'exp_1',
      company: 'Tech Corp',
      position: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      startDate: '2020-01',
      endDate: '2023-12',
      isCurrentRole: false,
      achievements: [
        'Led development of microservices architecture serving 1M+ users',
        'Reduced application load time by 40% through performance optimization',
        'Mentored 3 junior developers and conducted code reviews',
      ],
    },
    {
      id: 'exp_2',
      company: 'Startup Inc',
      position: 'Full Stack Developer',
      location: 'Remote',
      startDate: '2018-06',
      endDate: '2019-12',
      isCurrentRole: false,
      achievements: [
        'Built entire frontend application using React and TypeScript',
        'Implemented CI/CD pipeline reducing deployment time by 60%',
        'Collaborated with design team to improve user experience',
      ],
    },
  ],
  
  education: [
    {
      id: 'edu_1',
      institution: 'University of California, Berkeley',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      location: 'Berkeley, CA',
      graduationDate: '2018-05',
      gpa: '3.8',
      honors: 'Magna Cum Laude',
    },
  ],
  
  skills: [
    'JavaScript',
    'TypeScript',
    'React',
    'Node.js',
    'Python',
    'PostgreSQL',
    'AWS',
    'Docker',
    'Kubernetes',
  ],
  
  certifications: [
    'AWS Certified Solutions Architect',
    'Google Cloud Professional Developer',
  ],
};

export const testJobDescription = `
Software Engineer - Full Stack

We are looking for an experienced full-stack software engineer to join our growing team. 

Requirements:
- 3+ years of experience with React and Node.js
- Experience with TypeScript and modern JavaScript
- Knowledge of cloud platforms (AWS, GCP)
- Experience with databases (PostgreSQL, MongoDB)
- Understanding of microservices architecture
- Strong problem-solving skills
- Excellent communication skills

Responsibilities:
- Develop and maintain web applications
- Collaborate with cross-functional teams
- Write clean, maintainable code
- Participate in code reviews
- Optimize application performance
- Troubleshoot and debug issues

Technologies we use:
- React, TypeScript, Node.js
- PostgreSQL, Redis
- AWS, Docker, Kubernetes
- Git, Jest, CI/CD
`;

export const testFileData = {
  validPDF: {
    fileName: 'resume.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024 * 100, // 100KB
    fileData: Buffer.from('Mock PDF content').toString('base64'),
  },
  
  validDOCX: {
    fileName: 'resume.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSize: 1024 * 50, // 50KB
    fileData: Buffer.from('Mock DOCX content').toString('base64'),
  },
  
  oversizedFile: {
    fileName: 'large_resume.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024 * 1024 * 15, // 15MB (over limit)
    fileData: Buffer.from('Mock large PDF content').toString('base64'),
  },
  
  invalidFile: {
    fileName: 'malicious.exe',
    mimeType: 'application/octet-stream',
    fileSize: 1024,
    fileData: Buffer.from('Mock malicious content').toString('base64'),
  },
};

export const testPaymentData = {
  validCheckoutSession: {
    productType: 'template' as const,
    productId: 'tech-focus',
    amount: 999,
    currency: 'usd',
    customerEmail: 'test@example.com',
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
    metadata: {
      templateId: 'tech-focus',
      userId: 'user_test_123',
    },
  },
  
  resumeBuilderPayment: {
    productType: 'resume-builder' as const,
    productId: 'resume-builder-basic',
    amount: 4500,
    currency: 'usd',
    customerEmail: 'builder@example.com',
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
    metadata: {
      packageType: 'basic',
      userId: 'user_test_456',
    },
  },
};

export const testFraudData = {
  legitimateRequest: {
    email: 'legitimate@example.com',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    requestType: 'resume-upload' as const,
  },
  
  suspiciousRequest: {
    email: 'test123456@tempmail.org',
    ipAddress: '10.0.0.1',
    userAgent: 'curl/7.68.0',
    requestType: 'payment' as const,
    paymentAmount: 100, // Unusually small amount
  },
  
  blockedRequest: {
    email: 'fraud@example.com',
    ipAddress: '127.0.0.1',
    userAgent: 'bot/1.0',
    requestType: 'payment' as const,
    paymentAmount: 1000,
  },
};

export const testEmailTemplateData = {
  resumeOptimization: {
    userName: 'John Doe',
    templateName: 'Tech Focus',
    optimizationFeatures: [
      'ATS keyword optimization',
      'Technical skills highlighting',
      'Achievement quantification',
    ],
    atsScore: 85,
    keywordMatches: ['React', 'TypeScript', 'Node.js', 'AWS'],
    improvements: [
      'Added 15 relevant keywords',
      'Optimized section ordering',
      'Enhanced technical achievements',
    ],
    processingTime: '2 minutes',
  },
  
  resumeBuilder: {
    userName: 'Jane Smith',
    packageType: 'enhanced' as const,
    templateName: 'Professional Plus',
    features: [
      'Professional resume creation',
      'ATS optimization',
      'Custom design template',
      'Career guidance',
    ],
    nextSteps: [
      'Download your professional resume',
      'Review and customize if needed',
      'Start applying to target positions',
      'Update with new achievements regularly',
    ],
  },
  
  paymentConfirmation: {
    userName: 'Bob Johnson',
    transactionId: 'txn_test_123456',
    amount: '$9.99',
    productName: 'Tech Focus Template',
    features: [
      'Professional tech-focused resume template',
      'ATS optimization',
      'PDF download',
      'Email delivery',
    ],
  },
};

export const testApiResponses = {
  success: {
    success: true,
    message: 'Operation completed successfully',
    data: { id: 'test_123' },
    requestId: 'req_test_456',
    timestamp: new Date().toISOString(),
  },
  
  validationError: {
    success: false,
    error: 'Validation failed',
    errorCode: 'VALIDATION_ERROR',
    details: {
      field: 'email',
      message: 'Invalid email format',
    },
    requestId: 'req_test_789',
    timestamp: new Date().toISOString(),
  },
  
  fraudBlocked: {
    success: false,
    error: 'Request blocked by fraud detection',
    errorCode: 'FRAUD_DETECTION',
    requiresVerification: true,
    requestId: 'req_test_012',
    timestamp: new Date().toISOString(),
  },
};

export const testJobStatuses = {
  pending: {
    jobId: 'job_test_123',
    status: 'PENDING' as const,
    progress: 0,
    estimatedTime: 120,
  },
  
  processing: {
    jobId: 'job_test_456',
    status: 'PROCESSING' as const,
    progress: 50,
    currentStep: 'Optimizing resume content',
  },
  
  completed: {
    jobId: 'job_test_789',
    status: 'COMPLETED' as const,
    progress: 100,
    result: {
      downloadUrl: 'https://example.com/resume.pdf',
      emailSent: true,
    },
  },
  
  failed: {
    jobId: 'job_test_012',
    status: 'FAILED' as const,
    progress: 25,
    error: 'AI service temporarily unavailable',
  },
};

// Helper functions for test data
export const createTestUser = (overrides: Partial<typeof testUsers.validUser> = {}) => ({
  ...testUsers.validUser,
  ...overrides,
});

export const createTestResumeData = (overrides: Partial<typeof testResumeData> = {}) => ({
  ...testResumeData,
  ...overrides,
});

export const createTestFile = (overrides: Partial<typeof testFileData.validPDF> = {}) => ({
  ...testFileData.validPDF,
  ...overrides,
});

export const generateRandomEmail = () => 
  `test${Math.random().toString(36).substring(7)}@example.com`;

export const generateRandomUUID = () => 
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });