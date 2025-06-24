#!/usr/bin/env node

/**
 * API Testing Script for ResumeSniper
 * Tests all API endpoints with various scenarios
 */

import fs from 'fs';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

const TEST_DATA = {
  validResume: `John Smith
john.smith@email.com
(555) 123-4567
New York, NY
linkedin.com/in/johnsmith

PROFESSIONAL SUMMARY
Experienced software engineer with 5 years of experience in full-stack development.

EXPERIENCE
Senior Software Engineer - Tech Corp (2020-2025)
• Developed web applications using React and Node.js
• Led team of 3 developers
• Improved application performance by 40%

Software Engineer - StartupCo (2018-2020)
• Built REST APIs using Express.js
• Implemented automated testing frameworks
• Collaborated with cross-functional teams

EDUCATION
Bachelor of Science in Computer Science - State University (2014-2018)
GPA: 3.8/4.0

SKILLS
Programming Languages: JavaScript, Python, Java
Frameworks: React, Node.js, Express, Django
Databases: PostgreSQL, MongoDB, Redis`,

  validJobDescription: `We are seeking a Senior Full-Stack Developer to join our engineering team. 

Requirements:
- 5+ years of experience in web development
- Proficiency in React, Node.js, and modern JavaScript
- Experience with REST APIs and database design
- Strong problem-solving skills
- Bachelor's degree in Computer Science or related field

Responsibilities:
- Design and develop scalable web applications
- Collaborate with product and design teams
- Mentor junior developers
- Participate in code reviews and architectural decisions

We offer competitive salary, equity, and comprehensive benefits.`,

  templates: [
    'ats-optimized',
    'entry-clean', 
    'tech-focus',
    'professional-plus',
    'executive-format'
  ]
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    const duration = Date.now() - startTime;
    
    return {
      status: response.status,
      data,
      duration,
      ok: response.ok
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      status: 0,
      error: error.message,
      duration,
      ok: false
    };
  }
}

async function testHealthEndpoint() {
  log('🏥 Testing health endpoint...');
  
  const result = await makeRequest('/api/health');
  
  if (result.ok && result.data.status === 'healthy') {
    log(`✓ Health check passed (${result.duration}ms)`, 'success');
    return true;
  } else {
    log(`✗ Health check failed: ${result.data?.error || result.error || 'Unknown error'}`, 'error');
    return false;
  }
}

async function testProcessResumeEndpoint() {
  log('📄 Testing process resume endpoint...');
  
  const tests = [
    {
      name: 'Valid first-time request (free template)',
      data: {
        email: `test-${Date.now()}@example.com`,
        resumeContent: TEST_DATA.validResume,
        jobDescription: TEST_DATA.validJobDescription,
        fileName: 'resume.pdf',
        template: 'ats-optimized',
        isFirstTimeFlow: true
      },
      expectedStatus: 200
    },
    {
      name: 'Returning user request (should require payment)',
      data: {
        email: 'existing@example.com',
        resumeContent: TEST_DATA.validResume,
        jobDescription: TEST_DATA.validJobDescription,
        fileName: 'resume.pdf',
        template: 'professional-plus',
        isFirstTimeFlow: false
      },
      expectedStatus: 200,
      shouldRequirePayment: true
    },
    {
      name: 'Invalid email format',
      data: {
        email: 'invalid-email',
        resumeContent: TEST_DATA.validResume,
        jobDescription: TEST_DATA.validJobDescription,
        fileName: 'resume.pdf',
        template: 'ats-optimized',
        isFirstTimeFlow: true
      },
      expectedStatus: 400
    },
    {
      name: 'Missing required fields',
      data: {
        email: 'test@example.com',
        template: 'ats-optimized',
        isFirstTimeFlow: true
      },
      expectedStatus: 400
    },
    {
      name: 'Invalid template',
      data: {
        email: 'test@example.com',
        resumeContent: TEST_DATA.validResume,
        jobDescription: TEST_DATA.validJobDescription,
        fileName: 'resume.pdf',
        template: 'invalid-template',
        isFirstTimeFlow: true
      },
      expectedStatus: 400
    },
    {
      name: 'Resume content too short',
      data: {
        email: 'test@example.com',
        resumeContent: 'Too short',
        jobDescription: TEST_DATA.validJobDescription,
        fileName: 'resume.pdf',
        template: 'ats-optimized',
        isFirstTimeFlow: true
      },
      expectedStatus: 400
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    log(`  Testing: ${test.name}`);
    
    const result = await makeRequest('/api/process-resume', {
      method: 'POST',
      body: JSON.stringify(test.data)
    });
    
    const statusMatches = result.status === test.expectedStatus;
    const paymentCheck = test.shouldRequirePayment ? 
      result.data?.requires_payment === true : true;
    
    if (statusMatches && paymentCheck) {
      log(`    ✓ Passed (${result.duration}ms)`, 'success');
      passed++;
    } else {
      log(`    ✗ Failed - Expected ${test.expectedStatus}, got ${result.status}`, 'error');
      if (result.data?.error_code) {
        log(`      Error: ${result.data.error_code} - ${result.data.message}`, 'warn');
      }
      failed++;
    }
  }
  
  log(`📊 Process Resume Tests: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

async function testRateLimiting() {
  log('⏱️ Testing rate limiting...');
  
  const testEmail = `ratetest-${Date.now()}@example.com`;
  const requests = [];
  
  // Make 6 requests quickly (should hit rate limit)
  for (let i = 0; i < 6; i++) {
    requests.push(makeRequest('/api/process-resume', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        resumeContent: TEST_DATA.validResume,
        jobDescription: TEST_DATA.validJobDescription,
        fileName: 'resume.pdf',
        template: 'ats-optimized',
        isFirstTimeFlow: true
      })
    }));
  }
  
  const results = await Promise.all(requests);
  const rateLimited = results.some(r => r.status === 429);
  
  if (rateLimited) {
    log('✓ Rate limiting working correctly', 'success');
    return true;
  } else {
    log('✗ Rate limiting not working', 'error');
    return false;
  }
}

async function testMethodValidation() {
  log('🔒 Testing method validation...');
  
  const tests = [
    { method: 'GET', endpoint: '/api/process-resume', expectedStatus: 405 },
    { method: 'PUT', endpoint: '/api/process-resume', expectedStatus: 405 },
    { method: 'DELETE', endpoint: '/api/process-resume', expectedStatus: 405 },
    { method: 'OPTIONS', endpoint: '/api/process-resume', expectedStatus: 200 },
    { method: 'POST', endpoint: '/api/health', expectedStatus: 405 }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await makeRequest(test.endpoint, {
      method: test.method
    });
    
    if (result.status === test.expectedStatus) {
      log(`  ✓ ${test.method} ${test.endpoint} correctly returned ${result.status}`, 'success');
      passed++;
    } else {
      log(`  ✗ ${test.method} ${test.endpoint} returned ${result.status}, expected ${test.expectedStatus}`, 'error');
      failed++;
    }
  }
  
  log(`🔒 Method validation: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

async function runAllTests() {
  log('🧪 Starting API tests...');
  log(`🎯 Testing against: ${BASE_URL}`);
  
  const results = {
    health: await testHealthEndpoint(),
    processResume: await testProcessResumeEndpoint(),
    rateLimiting: await testRateLimiting(),
    methodValidation: await testMethodValidation()
  };
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  log('📊 Test Summary:');
  Object.entries(results).forEach(([test, passed]) => {
    log(`  ${test}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  });
  
  log(`🎯 Overall: ${passedTests}/${totalTests} test suites passed`);
  
  if (passedTests === totalTests) {
    log('🎉 All tests passed!', 'success');
    process.exit(0);
  } else {
    log('💥 Some tests failed!', 'error');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  log(`💥 Test execution failed: ${error.message}`, 'error');
  process.exit(1);
});