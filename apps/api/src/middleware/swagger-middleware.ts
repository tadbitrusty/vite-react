import { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from '../docs/openapi';

export function setupSwaggerDocs(app: Express): void {
  // Swagger UI options
  const swaggerOptions = {
    explorer: true,
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestHeaders: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
      requestInterceptor: (request: any) => {
        // Add default headers or modify requests if needed
        request.headers['Content-Type'] = 'application/json';
        return request;
      },
      responseInterceptor: (response: any) => {
        // Handle responses if needed
        return response;
      },
    },
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #3b82f6; }
      .swagger-ui .scheme-container { 
        background: #f8fafc; 
        border: 1px solid #e2e8f0;
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 1rem 0;
      }
      .swagger-ui .btn.authorize { 
        background-color: #3b82f6;
        border-color: #3b82f6;
      }
      .swagger-ui .btn.authorize:hover { 
        background-color: #2563eb;
        border-color: #2563eb;
      }
      .swagger-ui .highlight-code .microlight { 
        background: #1e293b !important;
        color: #e2e8f0 !important;
      }
      .swagger-ui .opblock.opblock-post { border-color: #10b981; }
      .swagger-ui .opblock.opblock-post .opblock-summary { border-color: #10b981; }
      .swagger-ui .opblock.opblock-get { border-color: #3b82f6; }
      .swagger-ui .opblock.opblock-get .opblock-summary { border-color: #3b82f6; }
      .swagger-ui .opblock.opblock-put { border-color: #f59e0b; }
      .swagger-ui .opblock.opblock-put .opblock-summary { border-color: #f59e0b; }
      .swagger-ui .opblock.opblock-delete { border-color: #ef4444; }
      .swagger-ui .opblock.opblock-delete .opblock-summary { border-color: #ef4444; }
    `,
    customSiteTitle: 'Resume Vita API Documentation',
    customfavIcon: '/favicon.ico',
  };

  // Serve Swagger UI
  app.use('/docs', swaggerUi.serve);
  app.get('/docs', swaggerUi.setup(openApiSpec, swaggerOptions));

  // Serve raw OpenAPI spec
  app.get('/docs/openapi.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(openApiSpec, null, 2));
  });

  // Serve OpenAPI spec in YAML format
  app.get('/docs/openapi.yaml', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/x-yaml');
    // Simple JSON to YAML conversion (for basic cases)
    const yamlContent = jsonToYaml(openApiSpec);
    res.send(yamlContent);
  });

  // API documentation landing page
  app.get('/docs/api', (req: Request, res: Response) => {
    const html = generateApiDocsPage();
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // Health check for docs
  app.get('/docs/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      docs: {
        swagger: '/docs',
        openapi: '/docs/openapi.json',
        yaml: '/docs/openapi.yaml',
        landing: '/docs/api',
      },
      timestamp: new Date().toISOString(),
    });
  });
}

function jsonToYaml(obj: any, indent = 0): string {
  const spaces = '  '.repeat(indent);
  let yaml = '';

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        yaml += jsonToYaml(value, indent + 1);
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            yaml += `${spaces}  -\n`;
            yaml += jsonToYaml(item, indent + 2);
          } else {
            yaml += `${spaces}  - ${item}\n`;
          }
        }
      } else {
        const formattedValue = typeof value === 'string' ? `"${value}"` : value;
        yaml += `${spaces}${key}: ${formattedValue}\n`;
      }
    }
  }

  return yaml;
}

function generateApiDocsPage(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resume Vita API Documentation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            background: #f8fafc;
        }
        .header {
            text-align: center;
            margin-bottom: 3rem;
            padding: 2rem;
            background: white;
            border-radius: 1rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header h1 {
            color: #3b82f6;
            margin: 0 0 1rem 0;
            font-size: 2.5rem;
        }
        .header p {
            color: #6b7280;
            font-size: 1.2rem;
            margin: 0;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 3rem;
        }
        .card {
            background: white;
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s;
        }
        .card:hover {
            transform: translateY(-2px);
        }
        .card h3 {
            color: #1f2937;
            margin: 0 0 1rem 0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .card p {
            color: #6b7280;
            margin: 0 0 1.5rem 0;
        }
        .btn {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 0.5rem;
            font-weight: 500;
            transition: background 0.2s;
        }
        .btn:hover {
            background: #2563eb;
        }
        .btn.secondary {
            background: #6b7280;
        }
        .btn.secondary:hover {
            background: #4b5563;
        }
        .features {
            background: white;
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .features h2 {
            color: #1f2937;
            margin: 0 0 1.5rem 0;
        }
        .features ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .features li {
            padding: 0.75rem 0;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        .features li:last-child {
            border-bottom: none;
        }
        .icon {
            width: 1.5rem;
            height: 1.5rem;
            background: #3b82f6;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.75rem;
        }
        .quick-start {
            background: #1e293b;
            color: #e2e8f0;
            padding: 2rem;
            border-radius: 1rem;
            margin-top: 2rem;
            overflow-x: auto;
        }
        .quick-start h2 {
            color: #60a5fa;
            margin: 0 0 1rem 0;
        }
        .quick-start pre {
            background: #0f172a;
            padding: 1rem;
            border-radius: 0.5rem;
            overflow-x: auto;
            margin: 1rem 0;
        }
        .quick-start code {
            color: #a78bfa;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Resume Vita API</h1>
        <p>Comprehensive resume processing and optimization platform</p>
    </div>

    <div class="grid">
        <div class="card">
            <h3>📚 Interactive Documentation</h3>
            <p>Explore our API with Swagger UI. Test endpoints, view schemas, and see live examples.</p>
            <a href="/docs" class="btn">Open Swagger UI</a>
        </div>

        <div class="card">
            <h3>📄 OpenAPI Specification</h3>
            <p>Download our complete OpenAPI spec for code generation and integration.</p>
            <a href="/docs/openapi.json" class="btn secondary">JSON Format</a>
            <a href="/docs/openapi.yaml" class="btn secondary" style="margin-left: 0.5rem;">YAML Format</a>
        </div>

        <div class="card">
            <h3>⚡ Quick Start</h3>
            <p>Get up and running with our API in minutes. Start with our simple examples.</p>
            <a href="#quick-start" class="btn">View Examples</a>
        </div>

        <div class="card">
            <h3>📊 API Metrics</h3>
            <p>Monitor API performance, health status, and usage statistics in real-time.</p>
            <a href="/trpc/metrics.dashboard" class="btn secondary">View Metrics</a>
        </div>
    </div>

    <div class="features">
        <h2>✨ API Features</h2>
        <ul>
            <li><span class="icon">📄</span> Resume processing and parsing (PDF, DOC, DOCX)</li>
            <li><span class="icon">🤖</span> AI-powered resume optimization with Claude</li>
            <li><span class="icon">🎨</span> Professional resume templates</li>
            <li><span class="icon">💳</span> Secure payment processing with Stripe</li>
            <li><span class="icon">👤</span> Complete user management system</li>
            <li><span class="icon">📊</span> Real-time job tracking and status updates</li>
            <li><span class="icon">🔒</span> Enterprise-grade security and rate limiting</li>
            <li><span class="icon">⚡</span> High-performance caching with Redis</li>
            <li><span class="icon">📈</span> Comprehensive monitoring and metrics</li>
            <li><span class="icon">🧪</span> Fraud detection and prevention</li>
        </ul>
    </div>

    <div class="quick-start" id="quick-start">
        <h2>🚀 Quick Start Guide</h2>
        
        <h3>1. Check API Health</h3>
        <pre><code>curl -X GET https://api.resume-vita.com/trpc/health.status</code></pre>
        
        <h3>2. Create a User</h3>
        <pre><code>curl -X POST https://api.resume-vita.com/trpc/user.create \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "name": "John Doe"
  }'</code></pre>
        
        <h3>3. Get Resume Templates</h3>
        <pre><code>curl -X GET https://api.resume-vita.com/trpc/resume.getTemplates</code></pre>
        
        <h3>4. Process a Resume</h3>
        <pre><code>curl -X POST https://api.resume-vita.com/trpc/resume.process \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer your-jwt-token" \\
  -d '{
    "email": "user@example.com",
    "jobDescription": "Software Engineer position...",
    "templateId": "tech-focus",
    "fileData": "base64-encoded-file-data",
    "fileName": "resume.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf"
  }'</code></pre>

        <h3>5. Track Job Status</h3>
        <pre><code>curl -X GET "https://api.resume-vita.com/trpc/resume.getJobStatus?input=%7B%22jobId%22%3A%22job_123%22%7D"</code></pre>
    </div>
</body>
</html>
  `;
}

export { openApiSpec };