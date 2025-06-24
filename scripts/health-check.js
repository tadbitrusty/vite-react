#!/usr/bin/env node

/**
 * Health Check Script
 * Monitors application health and reports issues
 */

const https = require('https');
const http = require('http');

const config = {
  baseUrl: process.env.HEALTH_CHECK_URL || 'http://localhost:3000',
  timeout: 10000,
  endpoints: [
    '/api/health',
    '/api/health?check=db',
    '/'
  ]
};

async function checkEndpoint(path) {
  return new Promise((resolve) => {
    const url = `${config.baseUrl}${path}`;
    const client = url.startsWith('https') ? https : http;
    
    const startTime = Date.now();
    const req = client.get(url, { timeout: config.timeout }, (res) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode,
          responseTime,
          success: res.statusCode >= 200 && res.statusCode < 300,
          data: data ? JSON.parse(data) : null
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        path,
        status: 0,
        responseTime: Date.now() - startTime,
        success: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        path,
        status: 0,
        responseTime: config.timeout,
        success: false,
        error: 'Request timeout'
      });
    });
  });
}

async function runHealthCheck() {
  console.log('🏥 Resume Vita Health Check');
  console.log('============================');
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');

  const results = [];
  let allHealthy = true;

  for (const endpoint of config.endpoints) {
    const result = await checkEndpoint(endpoint);
    results.push(result);

    const status = result.success ? '✅' : '❌';
    const responseTime = `${result.responseTime}ms`;
    
    console.log(`${status} ${endpoint} - ${result.status} (${responseTime})`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    if (!result.success) {
      allHealthy = false;
    }
  }

  console.log('');
  console.log('=== Summary ===');
  console.log(`Overall Status: ${allHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
  console.log(`Checked: ${results.length} endpoints`);
  console.log(`Passed: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  
  const avgResponseTime = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.responseTime, 0) / results.filter(r => r.success).length;
  
  if (avgResponseTime) {
    console.log(`Avg Response Time: ${Math.round(avgResponseTime)}ms`);
  }

  // Exit with error code if unhealthy
  process.exit(allHealthy ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  runHealthCheck().catch(error => {
    console.error('Health check failed:', error);
    process.exit(1);
  });
}

module.exports = { runHealthCheck, checkEndpoint };