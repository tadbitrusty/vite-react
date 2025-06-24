#!/usr/bin/env node

/**
 * Production Deployment Script for ResumeSniper
 * Handles pre-deployment checks, deployment, and post-deployment validation
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const REQUIRED_ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'FROM_EMAIL',
  'NEXT_PUBLIC_URL'
];

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function runCommand(command, description) {
  log(`Running: ${description}`);
  try {
    const output = execSync(command, { 
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    log(`✓ ${description} completed`, 'success');
    return output;
  } catch (error) {
    log(`✗ ${description} failed: ${error.message}`, 'error');
    throw error;
  }
}

function checkEnvironment() {
  log('🔍 Checking environment variables...');
  
  const missing = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    log(`Missing required environment variables: ${missing.join(', ')}`, 'error');
    throw new Error('Environment validation failed');
  }
  
  log('✓ All required environment variables are set', 'success');
}

function checkFiles() {
  log('📁 Checking required files...');
  
  const requiredFiles = [
    'pages/api/process-resume.js',
    'pages/api/stripe-webhook.js',
    'pages/api/health.js',
    'lib/database.ts',
    'lib/templateProcessor.ts',
    'lib/errorHandler.ts',
    'lib/security.ts',
    'lib/performance.ts',
    'templates/ats-optimized.html',
    'templates/entry-clean.html',
    'templates/tech-focus.html',
    'templates/professional-plus.html',
    'templates/executive-format.html'
  ];
  
  const missing = requiredFiles.filter(file => {
    const fullPath = path.join(process.cwd(), file);
    return !fs.existsSync(fullPath);
  });
  
  if (missing.length > 0) {
    log(`Missing required files: ${missing.join(', ')}`, 'error');
    throw new Error('File validation failed');
  }
  
  log('✓ All required files are present', 'success');
}

function runTests() {
  log('🧪 Running tests...');
  
  try {
    // Type checking
    runCommand('npm run type-check', 'TypeScript type checking');
    
    // Linting
    runCommand('npm run lint', 'ESLint validation');
    
    // Build test
    runCommand('npm run build', 'Production build test');
    
    log('✓ All tests passed', 'success');
  } catch (error) {
    log('✗ Tests failed', 'error');
    throw error;
  }
}

async function healthCheck(url) {
  log(`🏥 Running health check on ${url}...`);
  
  try {
    const response = await fetch(`${url}/api/health`);
    const data = await response.json();
    
    if (response.ok && data.status === 'healthy') {
      log('✓ Health check passed', 'success');
      return true;
    } else {
      log(`✗ Health check failed: ${data.status || 'unknown'}`, 'error');
      return false;
    }
  } catch (error) {
    log(`✗ Health check error: ${error.message}`, 'error');
    return false;
  }
}

async function deploy(environment = 'production') {
  log(`🚀 Starting deployment to ${environment}...`);
  
  try {
    // Pre-deployment checks
    checkEnvironment();
    checkFiles();
    runTests();
    
    // Deploy to Vercel
    const deployCommand = environment === 'production' 
      ? 'vercel --prod --yes' 
      : 'vercel --yes';
      
    const output = runCommand(deployCommand, `Vercel deployment to ${environment}`);
    
    // Extract deployment URL from output
    const urlMatch = output.match(/https:\/\/[^\s]+/);
    const deploymentUrl = urlMatch ? urlMatch[0] : null;
    
    if (!deploymentUrl) {
      throw new Error('Could not extract deployment URL');
    }
    
    log(`✓ Deployment completed: ${deploymentUrl}`, 'success');
    
    // Wait for deployment to be ready
    log('⏳ Waiting for deployment to be ready...');
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
    
    // Post-deployment health check
    const isHealthy = await healthCheck(deploymentUrl);
    
    if (isHealthy) {
      log(`🎉 Deployment to ${environment} successful!`, 'success');
      log(`📍 Live URL: ${deploymentUrl}`);
      
      // Log deployment info
      const deploymentInfo = {
        environment,
        url: deploymentUrl,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        commit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'
      };
      
      fs.writeFileSync(
        `deployment-${environment}-${Date.now()}.json`, 
        JSON.stringify(deploymentInfo, null, 2)
      );
      
    } else {
      throw new Error('Post-deployment health check failed');
    }
    
  } catch (error) {
    log(`💥 Deployment failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Main execution
const environment = process.argv[2] || 'production';

if (!['staging', 'production'].includes(environment)) {
  log('Invalid environment. Use "staging" or "production"', 'error');
  process.exit(1);
}

log(`🎯 Deploying ResumeSniper to ${environment}...`);
deploy(environment);