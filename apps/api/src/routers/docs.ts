import { z } from 'zod';
import { publicProcedure, router } from '../lib/trpc';
import { openApiSpec } from '../docs/openapi';

export const docsRouter = router({
  // Get OpenAPI specification
  openapi: publicProcedure
    .query(async () => {
      return {
        spec: openApiSpec,
        version: openApiSpec.info.version,
        title: openApiSpec.info.title,
        description: openApiSpec.info.description,
      };
    }),

  // Get API endpoints summary
  endpoints: publicProcedure
    .query(async () => {
      const endpoints = Object.keys(openApiSpec.paths).map(path => {
        const methods = Object.keys(openApiSpec.paths[path as keyof typeof openApiSpec.paths]);
        const pathData = openApiSpec.paths[path as keyof typeof openApiSpec.paths];
        
        return {
          path,
          methods,
          summary: methods.map(method => {
            const methodData = pathData[method as keyof typeof pathData] as any;
            return {
              method: method.toUpperCase(),
              summary: methodData?.summary || '',
              tags: methodData?.tags || [],
            };
          }),
        };
      });

      return {
        totalEndpoints: endpoints.length,
        endpoints,
        tags: openApiSpec.tags,
      };
    }),

  // Get schema definitions
  schemas: publicProcedure
    .query(async () => {
      return {
        schemas: openApiSpec.components.schemas,
        responses: openApiSpec.components.responses,
        securitySchemes: openApiSpec.components.securitySchemes,
      };
    }),

  // Generate client SDK documentation
  clientSdk: publicProcedure
    .input(z.object({
      language: z.enum(['typescript', 'javascript', 'python', 'curl']).default('typescript'),
    }))
    .query(async ({ input }) => {
      const examples: Record<string, Record<string, string>> = {
        typescript: {
          installation: `npm install @resume-vita/api-client`,
          usage: `import { ResumeVitaClient } from '@resume-vita/api-client';

const client = new ResumeVitaClient({
  baseUrl: 'https://api.resume-vita.com',
  apiKey: 'your-api-key'
});

// Create a user
const user = await client.user.create({
  email: 'user@example.com',
  name: 'John Doe'
});

// Process a resume
const result = await client.resume.process({
  email: 'user@example.com',
  jobDescription: 'Software Engineer position...',
  templateId: 'tech-focus',
  fileData: 'base64-encoded-file-data',
  fileName: 'resume.pdf',
  fileSize: 1024000,
  mimeType: 'application/pdf'
});`,
          errorHandling: `try {
  const user = await client.user.create(userData);
} catch (error) {
  if (error.code === 'VALIDATION_ERROR') {
    console.error('Validation failed:', error.details);
  } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
    console.error('Rate limit exceeded, retry after:', error.retryAfter);
  } else {
    console.error('Unexpected error:', error.message);
  }
}`
        },
        javascript: {
          installation: `npm install @resume-vita/api-client`,
          usage: `const { ResumeVitaClient } = require('@resume-vita/api-client');

const client = new ResumeVitaClient({
  baseUrl: 'https://api.resume-vita.com',
  apiKey: 'your-api-key'
});

// Create a user
client.user.create({
  email: 'user@example.com',
  name: 'John Doe'
}).then(user => {
  console.log('User created:', user);
}).catch(error => {
  console.error('Error:', error);
});`
        },
        python: {
          installation: `pip install resume-vita-api`,
          usage: `from resume_vita import ResumeVitaClient

client = ResumeVitaClient(
    base_url='https://api.resume-vita.com',
    api_key='your-api-key'
)

# Create a user
user = client.user.create(
    email='user@example.com',
    name='John Doe'
)

# Process a resume
result = client.resume.process(
    email='user@example.com',
    job_description='Software Engineer position...',
    template_id='tech-focus',
    file_data='base64-encoded-file-data',
    file_name='resume.pdf',
    file_size=1024000,
    mime_type='application/pdf'
)`
        },
        curl: {
          usage: `# Create a user
curl -X POST https://api.resume-vita.com/trpc/user.create \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer your-jwt-token" \\
  -d '{
    "email": "user@example.com",
    "name": "John Doe"
  }'

# Get health status
curl -X GET https://api.resume-vita.com/trpc/health.status

# Process a resume
curl -X POST https://api.resume-vita.com/trpc/resume.process \\
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
  }'`
        }
      };

      return {
        language: input.language,
        examples: examples[input.language] || {},
        documentation: {
          gettingStarted: `# Getting Started with Resume Vita API

## Authentication
Include your JWT token in the Authorization header for all authenticated requests:
\`Authorization: Bearer your-jwt-token\`

## Error Handling
All errors follow a consistent format with error codes and detailed messages.

## Rate Limiting
Be aware of rate limits to avoid getting throttled.
`,
          bestPractices: [
            'Always handle errors appropriately',
            'Implement exponential backoff for retries',
            'Cache responses when possible',
            'Use pagination for large datasets',
            'Validate input data before sending requests',
            'Monitor your API usage to stay within limits'
          ]
        }
      };
    }),

  // Get changelog
  changelog: publicProcedure
    .query(async () => {
      return {
        version: '2.0.0',
        releaseDate: '2024-01-15',
        changes: [
          {
            version: '2.0.0',
            date: '2024-01-15',
            type: 'major',
            changes: [
              '🚀 Complete API redesign with tRPC',
              '✨ Added comprehensive metrics and monitoring',
              '⚡ Implemented Redis caching for improved performance',
              '🔒 Enhanced security with rate limiting and fraud detection',
              '📊 New payment processing with Stripe integration',
              '🎨 Updated resume templates with improved designs',
              '🧪 Added comprehensive testing suite (unit, integration, E2E)',
              '📚 Complete API documentation with OpenAPI spec'
            ],
            breaking: [
              'API endpoints now use tRPC format (/trpc/router.procedure)',
              'Authentication token format changed to JWT',
              'Response format standardized across all endpoints',
              'Some endpoint parameters have been renamed or restructured'
            ]
          },
          {
            version: '1.2.0',
            date: '2023-12-01',
            type: 'minor',
            changes: [
              '✨ Added new resume templates',
              '🐛 Fixed PDF generation issues',
              '⚡ Improved processing speed',
              '📧 Enhanced email notifications'
            ]
          },
          {
            version: '1.1.0',
            date: '2023-11-15',
            type: 'minor',
            changes: [
              '🔄 Added job status tracking',
              '💳 Implemented payment processing',
              '🎯 Improved AI resume optimization',
              '📱 Better mobile API support'
            ]
          },
          {
            version: '1.0.0',
            date: '2023-10-01',
            type: 'major',
            changes: [
              '🎉 Initial API release',
              '📄 Resume processing and optimization',
              '👤 User management system',
              '🏥 Health check endpoints',
              '📋 Basic template management'
            ]
          }
        ]
      };
    }),

  // Get API statistics
  stats: publicProcedure
    .query(async () => {
      const endpoints = Object.keys(openApiSpec.paths);
      const schemas = Object.keys(openApiSpec.components.schemas);
      const tags = openApiSpec.tags;

      return {
        overview: {
          totalEndpoints: endpoints.length,
          totalSchemas: schemas.length,
          totalTags: tags.length,
          version: openApiSpec.info.version,
          lastUpdated: new Date().toISOString(),
        },
        endpoints: {
          byTag: tags.map(tag => ({
            name: tag.name,
            description: tag.description,
            count: endpoints.filter(path => {
              const pathData = openApiSpec.paths[path as keyof typeof openApiSpec.paths];
              const methods = Object.values(pathData);
              return methods.some((method: any) => method.tags?.includes(tag.name));
            }).length
          })),
          byMethod: {
            GET: endpoints.filter(path => {
              const pathData = openApiSpec.paths[path as keyof typeof openApiSpec.paths];
              return 'get' in pathData;
            }).length,
            POST: endpoints.filter(path => {
              const pathData = openApiSpec.paths[path as keyof typeof openApiSpec.paths];
              return 'post' in pathData;
            }).length,
            PUT: endpoints.filter(path => {
              const pathData = openApiSpec.paths[path as keyof typeof openApiSpec.paths];
              return 'put' in pathData;
            }).length,
            DELETE: endpoints.filter(path => {
              const pathData = openApiSpec.paths[path as keyof typeof openApiSpec.paths];
              return 'delete' in pathData;
            }).length,
          }
        },
        schemas: {
          models: schemas.filter(name => !name.includes('Response') && !name.includes('Error')),
          responses: schemas.filter(name => name.includes('Response')),
          errors: schemas.filter(name => name.includes('Error')),
        }
      };
    }),
});