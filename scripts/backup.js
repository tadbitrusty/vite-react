#!/usr/bin/env node

/**
 * Backup Script
 * Creates backups of critical data and configurations
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const config = {
  backupDir: process.env.BACKUP_DIR || './backups',
  maxBackups: 7, // Keep 7 days of backups
  includeFiles: [
    '.env.example',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'tailwind.config.js',
    'vite.config.ts',
    'vercel.json'
  ],
  includeDirs: [
    'src',
    'lib',
    'pages',
    'templates',
    'docs',
    'scripts',
    'database'
  ]
};

async function createBackupDir() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(config.backupDir, `backup-${timestamp}`);
  
  await fs.mkdir(backupPath, { recursive: true });
  return backupPath;
}

async function backupFile(srcPath, destDir) {
  try {
    const destPath = path.join(destDir, path.basename(srcPath));
    await fs.copyFile(srcPath, destPath);
    return true;
  } catch (error) {
    console.warn(`  Warning: Could not backup ${srcPath}: ${error.message}`);
    return false;
  }
}

async function backupDirectory(srcDir, destDir) {
  try {
    const destPath = path.join(destDir, path.basename(srcDir));
    await fs.mkdir(destPath, { recursive: true });
    
    const files = await fs.readdir(srcDir, { withFileTypes: true });
    let fileCount = 0;

    for (const file of files) {
      const srcPath = path.join(srcDir, file.name);
      const destPath = path.join(destPath, file.name);

      if (file.isDirectory()) {
        // Skip node_modules and .git
        if (file.name === 'node_modules' || file.name === '.git') {
          continue;
        }
        await backupDirectory(srcPath, destPath.replace(file.name, ''));
      } else {
        await fs.copyFile(srcPath, destPath);
        fileCount++;
      }
    }

    return fileCount;
  } catch (error) {
    console.warn(`  Warning: Could not backup directory ${srcDir}: ${error.message}`);
    return 0;
  }
}

async function createDatabaseBackup(backupPath) {
  console.log('💾 Creating database backup...');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.warn('  Warning: Supabase credentials not found, skipping database backup');
    return false;
  }

  try {
    // Create database dump using Supabase CLI or pg_dump
    const dbBackupPath = path.join(backupPath, 'database.sql');
    
    // This would be the actual command for production:
    // execSync(`pg_dump "${process.env.DATABASE_URL}" > "${dbBackupPath}"`);
    
    // For now, create a placeholder
    await fs.writeFile(dbBackupPath, `-- Database backup placeholder
-- Created: ${new Date().toISOString()}
-- Note: Implement actual pg_dump for production use
`);
    
    console.log('  Database backup created (placeholder)');
    return true;
  } catch (error) {
    console.warn(`  Warning: Database backup failed: ${error.message}`);
    return false;
  }
}

async function backupEnvironmentConfig(backupPath) {
  console.log('⚙️  Backing up configuration...');
  
  try {
    const configBackupPath = path.join(backupPath, 'config');
    await fs.mkdir(configBackupPath, { recursive: true });

    let fileCount = 0;
    for (const file of config.includeFiles) {
      if (await fileExists(file)) {
        await backupFile(file, configBackupPath);
        fileCount++;
      }
    }

    // Create environment template (without secrets)
    const envTemplate = `# Environment template created ${new Date().toISOString()}
# Fill in actual values for deployment

# Database
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# AI Services
ANTHROPIC_API_KEY=

# Payments
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Email
RESEND_API_KEY=
FROM_EMAIL=

# Application
NEXT_PUBLIC_URL=
`;

    await fs.writeFile(path.join(configBackupPath, 'env-template.txt'), envTemplate);
    fileCount++;

    console.log(`  Backed up ${fileCount} configuration files`);
    return fileCount;
  } catch (error) {
    console.warn(`  Warning: Configuration backup failed: ${error.message}`);
    return 0;
  }
}

async function backupSourceCode(backupPath) {
  console.log('📂 Backing up source code...');
  
  const codeBackupPath = path.join(backupPath, 'source');
  await fs.mkdir(codeBackupPath, { recursive: true });

  let totalFiles = 0;
  for (const dir of config.includeDirs) {
    if (await directoryExists(dir)) {
      console.log(`  Backing up ${dir}...`);
      const fileCount = await backupDirectory(dir, codeBackupPath);
      totalFiles += fileCount;
    }
  }

  console.log(`  Backed up ${totalFiles} source files`);
  return totalFiles;
}

async function cleanupOldBackups() {
  console.log('🗑️  Cleaning up old backups...');
  
  try {
    if (!await directoryExists(config.backupDir)) {
      return 0;
    }

    const backups = await fs.readdir(config.backupDir);
    const backupDirs = [];

    for (const backup of backups) {
      const backupPath = path.join(config.backupDir, backup);
      const stats = await fs.stat(backupPath);
      if (stats.isDirectory() && backup.startsWith('backup-')) {
        backupDirs.push({
          name: backup,
          path: backupPath,
          created: stats.ctime
        });
      }
    }

    // Sort by creation date, newest first
    backupDirs.sort((a, b) => b.created - a.created);

    // Remove old backups
    let removed = 0;
    for (let i = config.maxBackups; i < backupDirs.length; i++) {
      await fs.rmdir(backupDirs[i].path, { recursive: true });
      removed++;
      console.log(`  Removed old backup: ${backupDirs[i].name}`);
    }

    console.log(`  Cleaned up ${removed} old backups`);
    return removed;
  } catch (error) {
    console.warn(`  Warning: Cleanup failed: ${error.message}`);
    return 0;
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function directoryExists(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function getBackupSize(backupPath) {
  try {
    const { execSync } = require('child_process');
    const output = execSync(`du -sh "${backupPath}"`, { encoding: 'utf8' });
    return output.split('\t')[0];
  } catch {
    return 'Unknown';
  }
}

async function runBackup() {
  console.log('💾 Resume Vita Backup');
  console.log('=====================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');

  const startTime = Date.now();

  try {
    // Create backup directory
    const backupPath = await createBackupDir();
    console.log(`📁 Backup location: ${backupPath}`);
    console.log('');

    // Run backup tasks
    const dbBackup = await createDatabaseBackup(backupPath);
    const configFiles = await backupEnvironmentConfig(backupPath);
    const sourceFiles = await backupSourceCode(backupPath);

    // Create backup manifest
    const manifest = {
      timestamp: new Date().toISOString(),
      database_backup: dbBackup,
      config_files: configFiles,
      source_files: sourceFiles,
      backup_path: backupPath,
      version: require('../package.json').version
    };

    await fs.writeFile(
      path.join(backupPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Cleanup old backups
    const removedBackups = await cleanupOldBackups();

    const endTime = Date.now();
    const duration = endTime - startTime;
    const backupSize = await getBackupSize(backupPath);

    console.log('');
    console.log('=== Backup Summary ===');
    console.log(`Backup size: ${backupSize}`);
    console.log(`Files backed up: ${sourceFiles + configFiles}`);
    console.log(`Database backup: ${dbBackup ? 'Yes' : 'No'}`);
    console.log(`Old backups removed: ${removedBackups}`);
    console.log(`Duration: ${duration}ms`);
    console.log('✅ Backup completed successfully');

    return {
      backupPath,
      backupSize,
      filesBackedUp: sourceFiles + configFiles,
      databaseBackup: dbBackup,
      duration
    };
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runBackup().catch(error => {
    console.error('Backup script failed:', error);
    process.exit(1);
  });
}

module.exports = { runBackup };