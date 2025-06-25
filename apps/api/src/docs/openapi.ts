export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Resume Vita API',
    description: `
# Resume Vita API Documentation

The Resume Vita API provides comprehensive resume processing, optimization, and template management services. This API enables users to upload resumes, apply for jobs with optimized resumes, and manage their professional profiles.

## Features

- **Resume Processing**: Upload and parse resume files (PDF, DOC, DOCX)
- **AI-Powered Optimization**: Enhance resumes using Claude AI for specific job descriptions
- **Template Management**: Access to professional resume templates
- **Payment Processing**: Secure payments via Stripe for premium features
- **User Management**: Complete user registration and profile management
- **Real-time Job Tracking**: Monitor resume processing status in real-time

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limiting

The API implements rate limiting to ensure fair usage:
- **Anonymous users**: 50 requests per 15 minutes
- **Authenticated users**: 100 requests per 15 minutes
- **Premium users**: 200 requests per 15 minutes

## Error Handling

The API uses standard HTTP status codes and returns detailed error messages in JSON format:

\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid-email"
    }
  }
}
\`\`\`

## Support

For API support, contact: api-support@resume-vita.com
    `,
    version: '2.0.0',
    contact: {
      name: 'Resume Vita API Support',
      email: 'api-support@resume-vita.com',
      url: 'https://resume-vita.com/support'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'https://api.resume-vita.com',
      description: 'Production server'
    },
    {
      url: 'https://staging-api.resume-vita.com',
      description: 'Staging server'
    },
    {
      url: 'http://localhost:3001',
      description: 'Development server'
    }
  ],
  tags: [
    {
      name: 'Health',
      description: 'Health check and system status endpoints'
    },
    {
      name: 'Authentication',
      description: 'User authentication and authorization'
    },
    {
      name: 'Users',
      description: 'User management and profile operations'
    },
    {
      name: 'Resumes',
      description: 'Resume processing, optimization, and management'
    },
    {
      name: 'Templates',
      description: 'Resume template management and selection'
    },
    {
      name: 'Payments',
      description: 'Payment processing and subscription management'
    },
    {
      name: 'Jobs',
      description: 'Job tracking and status monitoring'
    },
    {
      name: 'Metrics',
      description: 'Performance monitoring and system metrics'
    }
  ],
  paths: {
    '/trpc/health.status': {
      get: {
        tags: ['Health'],
        summary: 'Check API health status',
        description: 'Returns the current health status of the API and its dependencies',
        responses: {
          200: {
            description: 'Health status retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    result: {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            status: {
                              type: 'string',
                              enum: ['healthy', 'unhealthy', 'degraded'],
                              example: 'healthy'
                            },
                            timestamp: {
                              type: 'string',
                              format: 'date-time',
                              example: '2024-01-01T12:00:00.000Z'
                            },
                            database: {
                              type: 'string',
                              enum: ['connected', 'disconnected'],
                              example: 'connected'
                            },
                            cache: {
                              type: 'string',
                              enum: ['connected', 'disconnected'],
                              example: 'connected'
                            },
                            version: {
                              type: 'string',
                              example: '2.0.0'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/trpc/health.ping': {
      get: {
        tags: ['Health'],
        summary: 'Ping the API',
        description: 'Simple ping endpoint to check if the API is responding',
        responses: {
          200: {
            description: 'Pong response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    result: {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            message: {
                              type: 'string',
                              example: 'pong'
                            },
                            timestamp: {
                              type: 'string',
                              format: 'date-time'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/trpc/user.create': {
      post: {
        tags: ['Users'],
        summary: 'Create a new user',
        description: 'Register a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'name'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'user@example.com',
                    description: 'User email address (must be unique)'
                  },
                  name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 100,
                    example: 'John Doe',
                    description: 'User full name'
                  },
                  phone: {
                    type: 'string',
                    example: '+1-555-0123',
                    description: 'User phone number (optional)'
                  },
                  location: {
                    type: 'string',
                    example: 'New York, NY',
                    description: 'User location (optional)'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UserResponse'
                }
              }
            }
          },
          400: {
            $ref: '#/components/responses/ValidationError'
          },
          409: {
            $ref: '#/components/responses/ConflictError'
          }
        }
      }
    },
    '/trpc/user.getById': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID',
        description: 'Retrieve user information by user ID',
        parameters: [
          {
            name: 'input',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              description: 'JSON-encoded input: {"id": "user-id"}'
            }
          }
        ],
        responses: {
          200: {
            description: 'User retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UserResponse'
                }
              }
            }
          },
          404: {
            $ref: '#/components/responses/NotFoundError'
          }
        }
      }
    },
    '/trpc/resume.getTemplates': {
      get: {
        tags: ['Templates'],
        summary: 'Get all resume templates',
        description: 'Retrieve all available resume templates',
        responses: {
          200: {
            description: 'Templates retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    result: {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: {
                            $ref: '#/components/schemas/Template'
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/trpc/resume.process': {
      post: {
        tags: ['Resumes'],
        summary: 'Process resume file',
        description: 'Upload and process a resume file with AI optimization for a specific job',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'jobDescription', 'templateId', 'fileData', 'fileName', 'fileSize', 'mimeType'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'user@example.com'
                  },
                  jobDescription: {
                    type: 'string',
                    minLength: 10,
                    example: 'Software Engineer position requiring 3+ years of React and Node.js experience...'
                  },
                  templateId: {
                    type: 'string',
                    enum: ['ats-optimized', 'entry-clean', 'tech-focus', 'professional-plus', 'executive-format'],
                    example: 'tech-focus'
                  },
                  fileData: {
                    type: 'string',
                    format: 'base64',
                    description: 'Base64-encoded file content'
                  },
                  fileName: {
                    type: 'string',
                    example: 'resume.pdf'
                  },
                  fileSize: {
                    type: 'number',
                    example: 1024000
                  },
                  mimeType: {
                    type: 'string',
                    enum: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                    example: 'application/pdf'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Resume processing initiated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ProcessingResponse'
                }
              }
            }
          },
          400: {
            $ref: '#/components/responses/ValidationError'
          },
          413: {
            description: 'File too large',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },
    '/trpc/payment.createCheckoutSession': {
      post: {
        tags: ['Payments'],
        summary: 'Create Stripe checkout session',
        description: 'Create a payment session for template purchase',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['templateId', 'email', 'successUrl', 'cancelUrl'],
                properties: {
                  templateId: {
                    type: 'string',
                    enum: ['entry-clean', 'tech-focus', 'professional-plus', 'executive-format'],
                    example: 'tech-focus'
                  },
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'user@example.com'
                  },
                  successUrl: {
                    type: 'string',
                    format: 'uri',
                    example: 'https://resume-vita.com/success'
                  },
                  cancelUrl: {
                    type: 'string',
                    format: 'uri',
                    example: 'https://resume-vita.com/cancel'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Checkout session created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CheckoutResponse'
                }
              }
            }
          },
          400: {
            $ref: '#/components/responses/ValidationError'
          }
        }
      }
    },
    '/trpc/metrics.health': {
      get: {
        tags: ['Metrics'],
        summary: 'Get system health metrics',
        description: 'Retrieve comprehensive system health information',
        responses: {
          200: {
            description: 'Health metrics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthMetrics'
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'user_123456789'
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com'
          },
          name: {
            type: 'string',
            example: 'John Doe'
          },
          phone: {
            type: 'string',
            nullable: true,
            example: '+1-555-0123'
          },
          location: {
            type: 'string',
            nullable: true,
            example: 'New York, NY'
          },
          isFirstTime: {
            type: 'boolean',
            example: true
          },
          emailVerified: {
            type: 'boolean',
            example: false
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T12:00:00.000Z'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T12:00:00.000Z'
          }
        }
      },
      UserResponse: {
        type: 'object',
        properties: {
          result: {
            type: 'object',
            properties: {
              data: {
                $ref: '#/components/schemas/User'
              }
            }
          }
        }
      },
      Template: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'tech-focus'
          },
          name: {
            type: 'string',
            example: 'Tech Focus'
          },
          description: {
            type: 'string',
            example: 'Designed specifically for software engineers and tech professionals'
          },
          price: {
            type: 'number',
            example: 999
          },
          icon: {
            type: 'string',
            example: '💻'
          },
          isFree: {
            type: 'boolean',
            example: false
          },
          stripeProductId: {
            type: 'string',
            nullable: true,
            example: 'prod_tech_focus'
          },
          category: {
            type: 'string',
            example: 'Technology'
          },
          features: {
            type: 'array',
            items: {
              type: 'string'
            },
            example: ['Tech Optimized', 'Skills Highlight', 'Project Showcase']
          },
          popularity: {
            type: 'number',
            example: 92
          }
        }
      },
      ProcessingResponse: {
        type: 'object',
        properties: {
          result: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: true
                  },
                  message: {
                    type: 'string',
                    example: 'Resume processing initiated successfully'
                  },
                  data: {
                    type: 'object',
                    properties: {
                      jobId: {
                        type: 'string',
                        example: 'job_123456789'
                      },
                      estimatedTime: {
                        type: 'number',
                        example: 120000
                      },
                      templateInfo: {
                        $ref: '#/components/schemas/Template'
                      }
                    }
                  },
                  requestId: {
                    type: 'string',
                    example: 'req_123456789'
                  },
                  timestamp: {
                    type: 'string',
                    format: 'date-time'
                  }
                }
              }
            }
          }
        }
      },
      CheckoutResponse: {
        type: 'object',
        properties: {
          result: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: true
                  },
                  checkoutUrl: {
                    type: 'string',
                    format: 'uri',
                    example: 'https://checkout.stripe.com/session-id'
                  },
                  sessionId: {
                    type: 'string',
                    example: 'cs_123456789'
                  }
                }
              }
            }
          }
        }
      },
      HealthMetrics: {
        type: 'object',
        properties: {
          result: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['ok', 'warning', 'error'],
                    example: 'ok'
                  },
                  timestamp: {
                    type: 'string',
                    format: 'date-time'
                  },
                  services: {
                    type: 'object',
                    properties: {
                      database: {
                        type: 'object',
                        properties: {
                          healthy: {
                            type: 'boolean',
                            example: true
                          },
                          status: {
                            type: 'string',
                            example: 'healthy'
                          }
                        }
                      },
                      cache: {
                        type: 'object',
                        properties: {
                          healthy: {
                            type: 'boolean',
                            example: true
                          },
                          status: {
                            type: 'string',
                            example: 'healthy'
                          }
                        }
                      },
                      system: {
                        type: 'object',
                        properties: {
                          healthy: {
                            type: 'boolean',
                            example: true
                          },
                          memoryUsage: {
                            type: 'number',
                            example: 45.2
                          },
                          cpuLoad: {
                            type: 'number',
                            example: 0.8
                          },
                          uptime: {
                            type: 'number',
                            example: 86400
                          }
                        }
                      }
                    }
                  },
                  overall: {
                    type: 'string',
                    enum: ['healthy', 'degraded', 'unhealthy'],
                    example: 'healthy'
                  }
                }
              }
            }
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                example: 'VALIDATION_ERROR'
              },
              message: {
                type: 'string',
                example: 'Invalid input provided'
              },
              details: {
                type: 'object',
                additionalProperties: true
              }
            }
          }
        }
      }
    },
    responses: {
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'object',
                  properties: {
                    code: {
                      type: 'string',
                      example: 'VALIDATION_ERROR'
                    },
                    message: {
                      type: 'string',
                      example: 'Invalid input provided'
                    },
                    details: {
                      type: 'object',
                      properties: {
                        field: {
                          type: 'string',
                          example: 'email'
                        },
                        value: {
                          type: 'string',
                          example: 'invalid-email'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'object',
                  properties: {
                    code: {
                      type: 'string',
                      example: 'NOT_FOUND'
                    },
                    message: {
                      type: 'string',
                      example: 'Resource not found'
                    }
                  }
                }
              }
            }
          }
        }
      },
      ConflictError: {
        description: 'Resource conflict',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'object',
                  properties: {
                    code: {
                      type: 'string',
                      example: 'CONFLICT'
                    },
                    message: {
                      type: 'string',
                      example: 'Resource already exists'
                    }
                  }
                }
              }
            }
          }
        }
      },
      UnauthorizedError: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'object',
                  properties: {
                    code: {
                      type: 'string',
                      example: 'UNAUTHORIZED'
                    },
                    message: {
                      type: 'string',
                      example: 'Authentication required'
                    }
                  }
                }
              }
            }
          }
        }
      },
      RateLimitError: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'object',
                  properties: {
                    code: {
                      type: 'string',
                      example: 'RATE_LIMIT_EXCEEDED'
                    },
                    message: {
                      type: 'string',
                      example: 'Rate limit exceeded. Please try again later.'
                    },
                    retryAfter: {
                      type: 'number',
                      example: 60
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ]
};