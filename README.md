# Resume Vita v2 🚀

> Enterprise-grade ATS resume optimization platform built with modern web technologies

## Overview

Resume Vita v2 is a complete rewrite of the original ATS resume optimization service, transformed from a proof-of-concept into a production-ready, enterprise-grade application. This monorepo contains both the frontend and backend applications with shared packages for maximum code reuse and type safety.

## 🏗️ Architecture

### Technology Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + Zustand
- **Backend**: tRPC + Prisma + PostgreSQL + Redis
- **Infrastructure**: Vercel + Docker + GitHub Actions
- **Quality**: ESLint + Prettier + Husky + TypeScript strict mode

### Project Structure

```
resume-vita-v2/
├── apps/
│   ├── web/                    # Next.js frontend application
│   └── api/                    # tRPC backend API
├── packages/
│   ├── ui/                     # Shared UI components
│   ├── types/                  # Shared TypeScript types
│   ├── config/                 # Shared configuration
│   └── utils/                  # Shared utilities
└── tools/
    ├── eslint-config/          # ESLint configuration
    └── tailwind-config/        # Tailwind configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18.17.0 or higher
- pnpm 8.0.0 or higher
- PostgreSQL database
- Redis instance (optional, for caching)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd resume-vita-v2
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp apps/api/.env.example apps/api/.env
   # Edit the .env file with your configuration
   ```

4. **Set up the database**
   ```bash
   pnpm db:push
   pnpm db:seed
   ```

5. **Start development servers**
   ```bash
   pnpm dev
   ```

This will start:
- Frontend at `http://localhost:3000`
- API at `http://localhost:3001`

## 📦 Available Scripts

### Root Level Commands

- `pnpm dev` - Start all development servers
- `pnpm build` - Build all applications
- `pnpm lint` - Lint all packages
- `pnpm type-check` - Type check all packages
- `pnpm test` - Run tests across all packages
- `pnpm format` - Format code with Prettier

### Database Commands

- `pnpm db:push` - Push schema changes to database
- `pnpm db:migrate` - Create and run migrations
- `pnpm db:studio` - Open Prisma Studio
- `pnpm db:seed` - Seed the database with initial data

## 🎯 Key Features

### ✅ Completed (Phase 1)

- **Modern Monorepo Setup**: Turborepo with pnpm workspaces
- **Type Safety**: TypeScript strict mode with end-to-end type safety
- **UI Framework**: Next.js 14 with App Router and React Server Components
- **Styling System**: Tailwind CSS with custom design tokens
- **Database**: Prisma ORM with PostgreSQL and comprehensive schema
- **API Layer**: tRPC for type-safe API endpoints
- **State Management**: Zustand with persistence and devtools
- **Development Tools**: ESLint, Prettier, and comprehensive tooling

### 🚧 In Progress (Phase 2)

- **Core Business Logic**: Resume processing and AI integration
- **File Upload**: Secure file handling and processing
- **Payment Integration**: Stripe checkout and webhook handling
- **Email Delivery**: Professional email templates and delivery
- **PDF Generation**: Server-side PDF creation with Puppeteer

### 📋 Planned (Phase 3)

- **Caching Layer**: Redis for performance optimization
- **Background Jobs**: Queue system for async processing
- **Fraud Detection**: Advanced security and fraud prevention
- **Monitoring**: Error tracking and performance monitoring
- **Testing**: Comprehensive test suite

## 🔧 Development

### Code Style

This project uses strict TypeScript, ESLint, and Prettier for code quality:

```bash
# Lint and fix
pnpm lint

# Format code
pnpm format

# Type check
pnpm type-check
```

### Database Workflow

```bash
# Make schema changes in apps/api/prisma/schema.prisma
# Then push to development database
pnpm db:push

# For production, create migrations
pnpm db:migrate

# View data
pnpm db:studio
```

### Adding New Features

1. **Add types** in `packages/types/src/index.ts`
2. **Create tRPC routes** in `apps/api/src/routers/`
3. **Build UI components** in `apps/web/src/components/`
4. **Update state management** in `apps/web/src/store/`

## 🏢 Architecture Decisions

### Why This Stack?

- **Type Safety**: End-to-end TypeScript for reduced bugs
- **Performance**: Next.js 14 with server components for optimal loading
- **Developer Experience**: Hot reloading, strict linting, comprehensive tooling
- **Scalability**: Monorepo structure supports team growth
- **Production Ready**: Enterprise-grade security and monitoring

### Design Patterns

- **tRPC**: Type-safe API layer eliminates client/server type mismatches
- **Zustand**: Lightweight state management with persistence
- **Prisma**: Type-safe database access with automatic migrations
- **Monorepo**: Shared packages ensure consistency across applications

## 🚀 Deployment

### Development

```bash
pnpm build
pnpm start
```

### Production

The application is designed for deployment on Vercel with automatic database migrations and environment variable management.

## 📈 Performance

- **Core Web Vitals**: Optimized for perfect Lighthouse scores
- **Bundle Size**: Tree-shaking and code splitting for minimal bundles
- **Database**: Connection pooling and query optimization
- **Caching**: Redis and CDN integration for global performance

## 🔒 Security

- **Input Validation**: Zod schemas for all user inputs
- **CORS Protection**: Configured for production domains
- **Rate Limiting**: IP-based rate limiting on API endpoints
- **SQL Injection**: Prisma ORM prevents SQL injection attacks
- **XSS Protection**: React's built-in XSS protection

## 📞 Support

For questions and support:

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Email**: support@resumevita.com

## 📄 License

This project is proprietary software. All rights reserved.

---

**Resume Vita v2** - Transforming careers through AI-powered resume optimization.