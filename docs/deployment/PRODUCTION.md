# Production Deployment Guide

## Pre-Deployment Checklist

### Environment Setup
- [ ] Production Supabase database configured
- [ ] Stripe live keys configured
- [ ] Production domain registered
- [ ] SSL certificate configured
- [ ] Environment variables secured

### Code Quality
- [ ] All tests passing: `npm run type-check`
- [ ] Code linted: `npm run lint`
- [ ] Build successful: `npm run build`
- [ ] No console errors or warnings
- [ ] Security scan completed

### API Configuration
- [ ] All API endpoints tested
- [ ] Error handling verified
- [ ] Rate limiting configured
- [ ] Database migrations applied
- [ ] Webhook endpoints configured

## Vercel Deployment (Recommended)

### 1. Initial Setup
```bash
npm install -g vercel
vercel login
```

### 2. Project Configuration
```bash
vercel --prod
```

Follow prompts to:
- Link to Git repository
- Configure project settings
- Set environment variables

### 3. Environment Variables
Add in Vercel dashboard:
```
SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_ANON_KEY=your_prod_anon_key
SUPABASE_SERVICE_KEY=your_prod_service_key
ANTHROPIC_API_KEY=sk-ant-api03-your-prod-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-live-key
STRIPE_SECRET_KEY=sk_live_your-live-key
STRIPE_WEBHOOK_SECRET=whsec_your-prod-webhook-secret
RESEND_API_KEY=re_your-prod-key
FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_URL=https://yourdomain.com
```

### 4. Domain Configuration
```bash
vercel domains add yourdomain.com
vercel domains add www.yourdomain.com
```

### 5. Deploy
```bash
vercel --prod
```

## Manual Deployment

### 1. Build Application
```bash
npm run build
```

### 2. Server Requirements
- Node.js 18+ runtime
- SSL certificate
- Environment variables configured
- Database accessible

### 3. Process Management
```bash
# Using PM2
npm install -g pm2
pm2 start npm --name "resume-vita" -- start
pm2 startup
pm2 save
```

## Database Migration

### Production Migration
```bash
# Set production environment
export SUPABASE_URL=your_prod_url
export SUPABASE_SERVICE_KEY=your_prod_service_key

# Run migrations
npm run db:migrate
```

### Backup Strategy
```bash
# Automated backups via Supabase
# Manual backup
pg_dump -h db.your-project.supabase.co -U postgres -d postgres > backup.sql
```

## Monitoring & Logging

### Application Monitoring
- **Vercel Analytics**: Performance monitoring
- **Supabase Logs**: Database queries and errors
- **Stripe Dashboard**: Payment monitoring
- **Custom Logging**: Application-specific logs

### Health Checks
```bash
# API health check
curl https://yourdomain.com/api/health

# Database connection
curl https://yourdomain.com/api/health?check=db
```

### Error Tracking
- Configure error logging in production
- Set up alerts for critical failures
- Monitor API response times
- Track conversion rates

## Security Configuration

### HTTPS Enforcement
```javascript
// Automatic with Vercel
// Manual setup requires SSL certificate
```

### CORS Configuration
```javascript
// pages/api/_middleware.js
export function middleware(req) {
  const res = NextResponse.next();
  res.headers.set('Access-Control-Allow-Origin', 'https://yourdomain.com');
  return res;
}
```

### Rate Limiting
```javascript
// Already configured in lib/services/errorHandler.ts
// Adjust limits for production traffic
```

## Performance Optimization

### Caching Strategy
- **Static Assets**: CDN caching via Vercel
- **API Responses**: Implement caching headers
- **Database**: Query optimization and indexing

### Bundle Optimization
```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer
```

### Image Optimization
- Use Next.js Image component
- Configure image domains in next.config.js
- Implement lazy loading

## Backup & Recovery

### Database Backups
- **Automatic**: Supabase point-in-time recovery
- **Manual**: Daily export to cloud storage
- **Testing**: Regular backup restoration tests

### Code Backups
- **Git Repository**: Multiple remotes
- **Environment Variables**: Secure backup storage
- **SSL Certificates**: Backup and renewal automation

## Rollback Procedures

### Vercel Rollback
```bash
# View deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

### Database Rollback
```bash
# Point-in-time recovery via Supabase dashboard
# Or restore from backup
psql -h your-host -U postgres -d postgres < backup.sql
```

## Post-Deployment Verification

### Functional Testing
- [ ] User registration flow
- [ ] Resume optimization flow
- [ ] Resume builder flow
- [ ] Payment processing
- [ ] Email delivery
- [ ] PDF generation

### Performance Testing
- [ ] Page load times < 3 seconds
- [ ] API response times < 1 second
- [ ] Database query performance
- [ ] Mobile responsiveness

### Security Testing
- [ ] SSL certificate valid
- [ ] API endpoints secured
- [ ] Input validation working
- [ ] Rate limiting active
- [ ] No sensitive data exposed

## Maintenance

### Regular Tasks
- **Weekly**: Review logs and performance metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Performance optimization and feature analysis

### Update Procedures
1. Test updates in staging environment
2. Schedule maintenance window
3. Deploy updates
4. Verify functionality
5. Monitor for issues

## Support & Troubleshooting

### Common Issues
- **502 Bad Gateway**: Check API endpoint configuration
- **Database Timeout**: Review connection pooling settings
- **Payment Failures**: Verify Stripe webhook configuration
- **Email Issues**: Check Resend API key and DNS records

### Support Contacts
- **Vercel Support**: Technical deployment issues
- **Supabase Support**: Database and authentication
- **Stripe Support**: Payment processing
- **Domain Provider**: DNS and SSL issues