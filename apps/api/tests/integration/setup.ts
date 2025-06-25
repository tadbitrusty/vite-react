import { config } from '@resume-vita/config';
import { prisma } from '../../src/lib/prisma';
import { createTRPCContext } from '../../src/lib/trpc';
import { appRouter } from '../../src/routers';
import type { NextRequest } from 'next/server';

// Integration test environment setup
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/resume_vita_integration_test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/2';

// Mock external services for integration tests
jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            optimizedContent: 'Optimized resume content for integration test',
            improvements: ['Improved keyword density', 'Enhanced formatting'],
            atsScore: 88,
            keywordMatches: ['React', 'TypeScript', 'Node.js'],
            recommendations: ['Add more quantified achievements'],
            estimatedImpact: 'High'
          })
        }],
      }),
    },
  })),
}));

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_integration_test_123',
          url: 'https://checkout.stripe.com/integration-test',
          expires_at: Math.floor(Date.now() / 1000) + 1800,
        }),
        retrieve: jest.fn().mockResolvedValue({
          id: 'cs_integration_test_123',
          payment_status: 'paid',
          amount_total: 999,
          currency: 'usd',
          customer_details: { email: 'integration@test.com' },
          metadata: { productId: 'tech-focus' },
        }),
      },
    },
    customers: {
      list: jest.fn().mockResolvedValue({ data: [] }),
      create: jest.fn().mockResolvedValue({
        id: 'cus_integration_test_123',
        email: 'integration@test.com',
      }),
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_integration_test_123' } },
      }),
    },
  }));
});

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({
        data: { id: 'email_integration_test_123' },
      }),
    },
  })),
}));

jest.mock('puppeteer', () => ({
  default: {
    launch: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        setContent: jest.fn(),
        setViewport: jest.fn(),
        pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content-integration')),
        screenshot: jest.fn().mockResolvedValue(Buffer.from('mock-screenshot-integration')),
        close: jest.fn(),
      }),
      close: jest.fn(),
    }),
  },
}));

// Test database utilities
export class TestDatabase {
  static async cleanup(): Promise<void> {
    // Clean up test data in reverse dependency order
    await prisma.resumeJob.deleteMany();
    await prisma.paymentRecord.deleteMany();
    await prisma.resume.deleteMany();
    await prisma.badEmail.deleteMany();
    await prisma.ipTracking.deleteMany();
    await prisma.chargebackBlacklist.deleteMany();
    await prisma.processingAnalytics.deleteMany();
    await prisma.user.deleteMany();
  }

  static async seed(): Promise<{
    testUser: any;
    testUserReturning: any;
  }> {
    // Create test users
    const testUser = await prisma.user.create({
      data: {
        email: 'integration.test@example.com',
        name: 'Integration Test User',
        phone: '+1234567890',
        location: 'Test City, TS',
        isFirstTime: true,
        emailVerified: false,
      },
    });

    const testUserReturning = await prisma.user.create({
      data: {
        email: 'returning.integration@example.com',
        name: 'Returning Integration User',
        phone: '+1987654321',
        location: 'Test City, TS',
        isFirstTime: false,
        emailVerified: true,
      },
    });

    return { testUser, testUserReturning };
  }
}

// tRPC test client factory
export function createTestContext(user?: any) {
  const mockReq = {
    url: 'http://localhost:3000/api/trpc',
    method: 'POST',
    headers: new Headers(),
  } as NextRequest;

  return createTRPCContext({ req: mockReq });
}

export function createTestCaller(context?: any) {
  const ctx = context || createTestContext();
  return appRouter.createCaller(ctx);
}

// Test utilities
export const integrationTestHelpers = {
  createMockFile: (overrides: Partial<{
    fileName: string;
    fileSize: number;
    mimeType: string;
    content: string;
  }> = {}) => ({
    fileName: 'test-resume.pdf',
    fileSize: 1024 * 100, // 100KB
    mimeType: 'application/pdf',
    content: Buffer.from('Mock PDF content for integration test').toString('base64'),
    ...overrides,
  }),

  createMockResumeData: () => ({
    personalInfo: {
      fullName: 'Integration Test User',
      email: 'integration@test.com',
      phone: '(555) 123-4567',
      location: 'Test City, TS',
      linkedin: 'https://linkedin.com/in/integrationtest',
      portfolio: 'https://integrationtest.dev',
    },
    professionalSummary: 'Experienced software engineer with expertise in testing and integration.',
    workExperience: [
      {
        id: 'exp_1',
        company: 'Test Corp',
        position: 'Senior Software Engineer',
        location: 'Test City, TS',
        startDate: '2020-01',
        endDate: '2023-12',
        isCurrentRole: false,
        achievements: [
          'Led development of integration testing framework',
          'Improved test coverage by 40%',
          'Mentored junior developers in testing best practices',
        ],
      },
    ],
    education: [
      {
        id: 'edu_1',
        institution: 'Test University',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        location: 'Test City, TS',
        graduationDate: '2020-05',
        gpa: '3.8',
        honors: 'Magna Cum Laude',
      },
    ],
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Testing', 'Integration'],
    certifications: ['AWS Certified Developer', 'Jest Testing Certification'],
  }),

  waitForAsync: (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  expectValidResponse: (response: any, expectedProperties: string[] = ['success']) => {
    expect(response).toBeDefined();
    expectedProperties.forEach(prop => {
      expect(response).toHaveProperty(prop);
    });
  },

  expectValidError: (error: any, expectedCode?: string) => {
    expect(error).toBeDefined();
    expect(error.code).toBeDefined();
    if (expectedCode) {
      expect(error.code).toBe(expectedCode);
    }
  },
};

// Setup and teardown helpers
beforeAll(async () => {
  // Ensure database connection
  await prisma.$connect();
});

afterAll(async () => {
  // Cleanup and disconnect
  await TestDatabase.cleanup();
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean up before each test
  await TestDatabase.cleanup();
});

// Increase timeout for integration tests
jest.setTimeout(60000);

// Console override for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    // Filter out known test warnings
    if (
      args[0]?.includes?.('Warning:') ||
      args[0]?.includes?.('deprecation') ||
      args[0]?.includes?.('ExperimentalWarning')
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };
  
  console.warn = (...args: any[]) => {
    if (args[0]?.includes?.('Warning:')) {
      return;
    }
    originalConsoleWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

export { prisma };