import { config } from '@resume-vita/config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/resume_vita_test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';

// Mock external services in test environment
jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Mock AI response' }],
      }),
    },
  })),
}));

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/test',
          expires_at: Math.floor(Date.now() / 1000) + 1800,
        }),
        retrieve: jest.fn().mockResolvedValue({
          id: 'cs_test_123',
          payment_status: 'paid',
          amount_total: 999,
          currency: 'usd',
          customer_details: { email: 'test@example.com' },
          metadata: { productId: 'test-product' },
        }),
      },
    },
    customers: {
      list: jest.fn().mockResolvedValue({ data: [] }),
      create: jest.fn().mockResolvedValue({
        id: 'cus_test_123',
        email: 'test@example.com',
      }),
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test_123' } },
      }),
    },
    balance: {
      retrieve: jest.fn().mockResolvedValue({ available: [{ amount: 1000 }] }),
    },
    refunds: {
      create: jest.fn().mockResolvedValue({
        id: 're_test_123',
        amount: 999,
      }),
    },
  }));
});

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({
        data: { id: 'email_test_123' },
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
        pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
        screenshot: jest.fn().mockResolvedValue(Buffer.from('mock-screenshot')),
        close: jest.fn(),
      }),
      close: jest.fn(),
    }),
  },
}));

// Global test timeout
jest.setTimeout(30000);

// Console override for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      args[0]?.includes?.('Warning:') ||
      args[0]?.includes?.('React does not recognize')
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

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidEmail(): R;
      toBeValidUUID(): R;
      toBeValidDate(): R;
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid email`
          : `Expected ${received} to be a valid email`,
    };
  },
  
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid UUID`
          : `Expected ${received} to be a valid UUID`,
    };
  },
  
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid Date`
          : `Expected ${received} to be a valid Date`,
    };
  },
});