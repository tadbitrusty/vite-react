# Development Setup Guide

## Prerequisites

### Required Software
- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher (or yarn 1.22.0+)
- **Git**: 2.0.0 or higher

### Required Accounts
- **Supabase**: Database and authentication
- **Stripe**: Payment processing
- **Anthropic**: AI services (Claude)
- **Resend**: Email delivery
- **Vercel**: Deployment (optional)

## Initial Setup

### 1. Clone and Install
```bash
git clone <repository-url>
cd ATS-resume-wesite
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
```

Fill in the following variables:
```bash
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# AI Services
ANTHROPIC_API_KEY=sk-ant-api03-your-key

# Payments
STRIPE_PUBLISHABLE_KEY=pk_test_your-key
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Email
RESEND_API_KEY=re_your-key
FROM_EMAIL=noreply@yourdomain.com

# Application
NEXT_PUBLIC_URL=http://localhost:3000
```

### 3. Database Setup
```bash
npm run db:migrate
```

### 4. Start Development
```bash
npm run dev
```

## Development Workflow

### Code Standards
- **TypeScript**: All new code must be TypeScript
- **ESLint**: Code must pass linting (`npm run lint`)
- **Components**: Use functional components with hooks
- **Imports**: Use barrel exports from organized modules

### Git Workflow
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes with clear commits
3. Run tests: `npm run type-check`
4. Push and create PR

### Testing
```bash
npm run type-check    # TypeScript validation
npm run lint          # Code quality
npm run build         # Production build test
```

## Debugging

### Common Issues

**Port 3000 in use:**
```bash
lsof -ti:3000 | xargs kill -9
```

**Database connection issues:**
- Verify Supabase keys in `.env`
- Check database migrations: `npm run db:migrate`

**Build failures:**
- Clear node_modules: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run type-check`

### Development Tools
- **React Developer Tools**: Browser extension
- **Supabase Dashboard**: Database management
- **Stripe Dashboard**: Payment testing
- **Vercel Dashboard**: Deployment monitoring

## Project Structure

```
src/
├── components/        # Reusable UI components
├── constants/        # Application constants
├── types/           # TypeScript definitions
├── utils/           # Frontend utilities
└── lib/            # Client-side services

lib/
├── services/        # Backend business logic
└── utils/          # Backend utilities

pages/api/          # API endpoints
templates/          # Resume templates
docs/              # Documentation
```

## API Development

### Adding New Endpoints
1. Create file in `pages/api/`
2. Import from `lib/services`
3. Add error handling and validation
4. Update API documentation

### Database Changes
1. Create migration in `database/migrations/`
2. Update TypeScript types
3. Test locally before deploying

## Performance Guidelines

- Use `React.memo()` for expensive components
- Implement proper loading states
- Optimize images and assets
- Use barrel exports to reduce bundle size

## Security Guidelines

- Never commit secrets to version control
- Validate all inputs with Zod schemas
- Use environment variables for configuration
- Implement proper error handling
- Follow principle of least privilege