# API Documentation

## Overview

Resume Vita provides RESTful APIs for resume optimization and building services. All APIs use JSON for request/response bodies and include comprehensive error handling.

## Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: `https://yourdomain.com/api`

## Authentication
- Most endpoints are public
- Internal services use API keys
- Payment webhooks use Stripe signature verification

## Rate Limiting
- **Default**: 100 requests per minute per IP
- **Authenticated**: 500 requests per minute
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Resume processed successfully",
  "data": {...},
  "timestamp": "2025-06-24T10:30:00Z",
  "request_id": "req_abc123"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "error_code": "VALIDATION_FAILED",
  "details": {...},
  "timestamp": "2025-06-24T10:30:00Z",
  "request_id": "req_abc123"
}
```

## Endpoints

### Resume Optimization

#### `POST /api/process-resume`
Optimizes an existing resume for a specific job description.

**Request Body:**
```json
{
  "email": "user@example.com",
  "resumeContent": "Resume text content...",
  "jobDescription": "Job description text...",
  "fileName": "resume.pdf",
  "template": "ats-optimized",
  "isFirstTimeFlow": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Resume processed and sent via email",
  "processing_time": 45000,
  "timestamp": "2025-06-24T10:30:00Z",
  "request_id": "req_abc123"
}
```

**Error Codes:**
- `VALIDATION_FAILED`: Invalid input data
- `PAYMENT_REQUIRED`: Premium template requires payment
- `AI_PROCESSING_FAILED`: AI service error
- `RATE_LIMITED`: Too many requests
- `EMAIL_BLOCKED`: Email address blocked

### Resume Building

#### `POST /api/build-resume`
Creates a new resume from form data.

**Request Body:**
```json
{
  "personalInfo": {
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "(555) 123-4567",
    "location": "City, State",
    "linkedin": "https://linkedin.com/in/johndoe"
  },
  "summary": "Professional summary...",
  "workExperience": [
    {
      "id": "1",
      "jobTitle": "Software Engineer",
      "company": "Tech Corp",
      "startDate": "2023-01",
      "endDate": "2025-06",
      "isCurrentJob": true,
      "responsibilities": "Key responsibilities..."
    }
  ],
  "education": [
    {
      "id": "1",
      "degree": "Bachelor of Computer Science",
      "school": "University Name",
      "graduationDate": "2023-05",
      "gpa": "3.8"
    }
  ],
  "skills": "JavaScript, React, Node.js...",
  "certifications": "AWS Certified...",
  "tier": "enhanced"
}
```

**Response:**
```json
{
  "success": false,
  "requires_payment": true,
  "payment_url": "https://checkout.stripe.com/...",
  "message": "Payment required for enhanced resume builder",
  "amount": 75,
  "tier": "enhanced",
  "timestamp": "2025-06-24T10:30:00Z",
  "request_id": "req_abc123"
}
```

### Health Check

#### `GET /api/health`
System health and status check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-06-24T10:30:00Z",
  "services": {
    "database": "connected",
    "ai": "available",
    "email": "available",
    "storage": "available"
  },
  "version": "1.0.0"
}
```

### Stripe Webhooks

#### `POST /api/stripe-webhook`
Handles Stripe payment confirmations and processing.

**Headers:**
- `stripe-signature`: Webhook signature for verification

**Webhook Events:**
- `checkout.session.completed`: Payment successful
- `payment_intent.succeeded`: Payment confirmed
- `invoice.payment_failed`: Payment failed

## Error Codes Reference

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_FAILED` | Invalid request data | 400 |
| `PAYMENT_REQUIRED` | Payment needed for service | 402 |
| `EMAIL_BLOCKED` | Email address blocked | 403 |
| `IP_BLOCKED` | IP address blocked | 403 |
| `CHARGEBACK_BANNED` | Account permanently banned | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `RATE_LIMITED` | Too many requests | 429 |
| `AI_PROCESSING_FAILED` | AI service error | 500 |
| `DATABASE_ERROR` | Database connection issue | 500 |
| `EMAIL_DELIVERY_FAILED` | Email sending failed | 500 |

## Security

### Input Validation
- All inputs validated with Zod schemas
- File type and size restrictions enforced
- SQL injection prevention
- XSS protection

### Rate Limiting
- IP-based rate limiting
- Exponential backoff for repeated violations
- Whitelist for trusted IPs

### Data Protection
- 48-hour automatic data deletion
- Encrypted data transmission
- PII handling compliance
- GDPR/CCPA compliant processing

## Testing

### Development Testing
```bash
# Health check
curl http://localhost:3000/api/health

# Resume processing (requires auth setup)
curl -X POST http://localhost:3000/api/process-resume \
  -H "Content-Type: application/json" \
  -d @test-data.json
```

### Load Testing
```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:3000/api/health

# Using Artillery
artillery quick --count 10 --num 100 http://localhost:3000/api/health
```

## Integration Examples

### JavaScript/TypeScript
```typescript
const response = await fetch('/api/process-resume', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    resumeContent: resumeText,
    jobDescription: jobText,
    fileName: 'resume.pdf',
    template: 'ats-optimized',
    isFirstTimeFlow: true
  })
});

const result = await response.json();
if (result.success) {
  console.log('Resume processed successfully');
} else if (result.requires_payment) {
  window.location.href = result.payment_url;
}
```

### Python
```python
import requests

response = requests.post('https://yourdomain.com/api/process-resume', 
  json={
    'email': 'user@example.com',
    'resumeContent': resume_text,
    'jobDescription': job_text,
    'fileName': 'resume.pdf',
    'template': 'ats-optimized',
    'isFirstTimeFlow': True
  }
)

result = response.json()
if result['success']:
    print('Resume processed successfully')
```

## Monitoring

### Metrics
- Request volume and response times
- Error rates by endpoint
- Payment conversion rates
- AI processing success rates

### Alerting
- API response time > 5 seconds
- Error rate > 5%
- Database connection failures
- Payment processing failures

### Logging
- Request/response logging
- Error tracking with stack traces
- Performance metrics
- Security events