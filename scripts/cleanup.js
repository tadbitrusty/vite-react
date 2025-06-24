#!/usr/bin/env node

/**
 * Cleanup Script
 * Removes temporary files and cleans up old data
 */

const fs = require('fs').promises;
const path = require('path');

const config = {
  tempDirs: [
    'tmp',
    '.temp',
    'uploads'
  ],
  logDirs: [
    'logs'
  ],
  maxLogAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxTempAge: 24 * 60 * 60 * 1000, // 24 hours
};

async function cleanDirectory(dirPath, maxAge) {
  try {
    const files = await fs.readdir(dirPath);
    const now = Date.now();
    let cleaned = 0;

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        await fs.unlink(filePath);
        cleaned++;
        console.log(`  Deleted: ${file}`);
      }
    }

    return cleaned;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`  Warning: Could not clean ${dirPath}: ${error.message}`);
    }
    return 0;
  }
}

async function cleanupNodeModules() {
  try {
    // Clean npm cache
    const { execSync } = require('child_process');
    execSync('npm cache clean --force', { stdio: 'inherit' });
    console.log('  NPM cache cleaned');
    return true;
  } catch (error) {
    console.warn(`  Warning: Could not clean npm cache: ${error.message}`);
    return false;
  }
}

async function cleanupLogs() {
  console.log('🧹 Cleaning log files...');
  let totalCleaned = 0;

  for (const logDir of config.logDirs) {
    if (await directoryExists(logDir)) {
      console.log(`  Cleaning ${logDir}...`);
      const cleaned = await cleanDirectory(logDir, config.maxLogAge);
      totalCleaned += cleaned;
    }
  }

  console.log(`  Cleaned ${totalCleaned} log files`);
  return totalCleaned;
}

async function cleanupTempFiles() {
  console.log('🗑️  Cleaning temporary files...');
  let totalCleaned = 0;

  for (const tempDir of config.tempDirs) {
    if (await directoryExists(tempDir)) {
      console.log(`  Cleaning ${tempDir}...`);
      const cleaned = await cleanDirectory(tempDir, config.maxTempAge);
      totalCleaned += cleaned;
    }
  }

  console.log(`  Cleaned ${totalCleaned} temporary files`);
  return totalCleaned;
}

async function directoryExists(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function getDirectorySize(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      totalSize += stats.size;
    }

    return totalSize;
  } catch {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function runCleanup() {
  console.log('🧽 Resume Vita Cleanup');
  console.log('======================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');

  const startTime = Date.now();

  // Calculate initial sizes
  let initialSize = 0;
  for (const dir of [...config.tempDirs, ...config.logDirs]) {
    if (await directoryExists(dir)) {
      initialSize += await getDirectorySize(dir);
    }
  }

  // Run cleanup tasks
  const tempCleaned = await cleanupTempFiles();
  const logsCleaned = await cleanupLogs();
  
  console.log('📦 Cleaning package cache...');
  const cacheCleaned = await cleanupNodeModules();

  // Calculate final sizes
  let finalSize = 0;
  for (const dir of [...config.tempDirs, ...config.logDirs]) {
    if (await directoryExists(dir)) {
      finalSize += await getDirectorySize(dir);
    }
  }

  const endTime = Date.now();
  const duration = endTime - startTime;
  const spaceSaved = initialSize - finalSize;

  console.log('');
  console.log('=== Cleanup Summary ===');
  console.log(`Files removed: ${tempCleaned + logsCleaned}`);
  console.log(`Space freed: ${formatBytes(spaceSaved)}`);
  console.log(`Cache cleaned: ${cacheCleaned ? 'Yes' : 'No'}`);
  console.log(`Duration: ${duration}ms`);
  console.log('✅ Cleanup completed');

  return {
    filesRemoved: tempCleaned + logsCleaned,
    spaceSaved,
    cacheCleaned,
    duration
  };
}

// Run if called directly
if (require.main === module) {
  runCleanup().catch(error => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });
}

module.exports = { runCleanup };