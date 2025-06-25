/** @type {import('jest').Config} */
module.exports = {
  displayName: 'Resume Vita API Integration Tests',
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test file patterns for integration tests
  testMatch: [
    '<rootDir>/tests/integration/**/*.integration.test.{ts,js}',
  ],
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@resume-vita/(.*)$': '<rootDir>/../../packages/$1/src',
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
  
  // Coverage configuration for integration tests
  collectCoverage: true,
  collectCoverageFrom: [
    'src/routers/**/*.{ts,js}',
    'src/lib/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage-integration',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Test timeout for integration tests (longer than unit tests)
  testTimeout: 60000,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  
  // Global variables
  globals: {
    'ts-jest': {
      useESM: false,
    },
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/coverage-integration/',
    '<rootDir>/tests/unit/',
    '<rootDir>/tests/e2e/',
  ],
  
  // Verbose output
  verbose: true,
  
  // Handle ESM modules
  extensionsToTreatAsEsm: ['.ts'],
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Maximum worker processes for integration tests
  maxWorkers: 1, // Sequential execution for database operations
  
  // Fail fast on first test failure (optional)
  bail: false,
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage-integration',
        filename: 'integration-test-report.html',
        expand: true,
      },
    ],
  ],
};