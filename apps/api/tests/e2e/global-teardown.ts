import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test global teardown...');
  
  try {
    // Clean up test database
    console.log('🗑️ Cleaning up test database...');
    const testDbPath = path.join(process.cwd(), 'test.db');
    
    try {
      await fs.unlink(testDbPath);
      console.log('📊 Test database removed');
    } catch (error) {
      // Database file might not exist, which is fine
      console.log('ℹ️ Test database file not found (already clean)');
    }

    // Clean up any temporary files
    console.log('🧽 Cleaning up temporary files...');
    const tempDirs = ['temp', 'uploads/temp', 'downloads/temp'];
    
    for (const dir of tempDirs) {
      const fullPath = path.join(process.cwd(), dir);
      try {
        await fs.rmdir(fullPath, { recursive: true });
        console.log(`📁 Cleaned up ${dir}`);
      } catch (error) {
        // Directory might not exist, which is fine
        console.log(`ℹ️ Directory ${dir} not found (already clean)`);
      }
    }

    console.log('✅ E2E test global teardown completed successfully');
  } catch (error) {
    console.error('❌ E2E test global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown;