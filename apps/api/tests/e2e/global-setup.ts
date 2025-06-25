import { chromium, FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Starting E2E test global setup...');
  
  try {
    // Setup test database
    console.log('📊 Setting up test database...');
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'file:./test.db';
    
    // Run database migrations for test environment
    execSync('npx prisma db push --force-reset', {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
    
    // Seed test data if needed
    console.log('🌱 Seeding test data...');
    execSync('npx tsx src/scripts/seed.ts', {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });

    // Warmup: Create a browser instance to download browser binaries
    console.log('🌐 Warming up browser instances...');
    const browser = await chromium.launch();
    await browser.close();

    console.log('✅ E2E test global setup completed successfully');
  } catch (error) {
    console.error('❌ E2E test global setup failed:', error);
    throw error;
  }
}

export default globalSetup;