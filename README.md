# Resume Vita 🚀

**Breathing Life Into Your Resume**

A modern SaaS platform for AI-powered resume optimization and building, designed to help job seekers bypass ATS filters and land interviews.

## 🎯 Features

### Resume Optimizer
- **ATS-Friendly Optimization**: Tailors existing resumes for specific job descriptions
- **Multiple Templates**: 5 professional templates (free to premium tiers)
- **AI-Powered Processing**: Uses Claude 3.5 Sonnet for intelligent content enhancement
- **PDF Delivery**: Professional resume delivered via email attachment

### Resume Builder
- **From-Scratch Creation**: Build professional resumes in under an hour
- **Two-Tier Pricing**: Basic ($45) and AI-Enhanced ($75) options
- **Chronological Format**: Industry-standard format optimized for ATS systems
- **Real-Time Preview**: See your resume as you build it

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes (Serverless)
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **Email**: Resend
- **AI**: Anthropic Claude 3.5 Sonnet
- **Deployment**: Vercel

### Project Structure
```
├── docs/                    # Documentation
│   ├── development/         # Development guides
│   ├── deployment/         # Deployment instructions
│   └── api/                # API documentation
├── lib/                    # Backend services
│   ├── services/           # Core business logic
│   └── utils/             # Utility functions
├── pages/api/             # API endpoints
├── src/                   # Frontend application
│   ├── components/        # React components
│   ├── constants/         # Application constants
│   ├── types/            # TypeScript definitions
│   └── utils/            # Frontend utilities
├── templates/            # Resume templates
└── scripts/             # Deployment & utility scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Stripe account
- Anthropic API key
- Resend API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ATS-resume-wesite
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Fill in your API keys and configuration
   ```

4. **Database Setup**
   ```bash
   npm run db:migrate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Visit Application**
   Open [http://localhost:5173](http://localhost:5173)

## 📧 Environment Variables

```bash
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# AI Services
ANTHROPIC_API_KEY=your_anthropic_key

# Payments
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Email
RESEND_API_KEY=your_resend_key
FROM_EMAIL=noreply@yourdomain.com

# Application
NEXT_PUBLIC_URL=http://localhost:3000
```

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
npm run test         # Run tests (when implemented)
```

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Configured with React and TypeScript rules
- **Prettier**: Code formatting (integrated with ESLint)
- **Barrel Exports**: Clean import statements
- **Component Structure**: Consistent patterns across all components

## 🚢 Deployment

### Vercel (Recommended)

1. **Connect Repository**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

2. **Environment Variables**
   - Add all environment variables in Vercel dashboard
   - Set `NEXT_PUBLIC_URL` to your production domain

3. **Database Migration**
   ```bash
   npm run db:migrate
   ```

### Manual Deployment

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Deploy Static Files**
   - Upload `dist/` folder to your hosting provider
   - Configure API routes for serverless deployment

## 📊 Business Model

### Pricing Tiers

**Resume Optimizer:**
- Free ATS Optimized (first-time users)
- Premium templates: $5.99 - $9.99

**Resume Builder:**
- Basic: $45 (form data → template)
- AI-Enhanced: $75 (AI improvement + template)

**Revenue Strategy:**
- Freemium model with premium upgrades
- Cross-selling between optimizer and builder
- Target: $15k/month gross revenue

## 🔒 Security Features

- **Input Validation**: Zod schemas for all API inputs
- **Rate Limiting**: IP-based request throttling
- **Fraud Detection**: Email and IP tracking
- **File Validation**: Secure file upload handling
- **Data Retention**: 48-hour auto-deletion policy
- **Payment Security**: Stripe-handled transactions

## 📝 API Documentation

### Main Endpoints

#### `POST /api/process-resume`
Optimizes existing resume for specific job description.

#### `POST /api/build-resume`
Creates new resume from form data.

#### `POST /api/stripe-webhook`
Handles Stripe payment confirmations.

#### `GET /api/health`
Health check endpoint.

See `docs/api/` for detailed API documentation.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

- **Issues**: Create GitHub issue for bugs
- **Features**: Submit feature requests via GitHub
- **Documentation**: Check `docs/` directory
- **Contact**: [Your contact information]

---

**Built with ❤️ by a Navy veteran who got tired of delivering groceries despite having engineering degrees.**