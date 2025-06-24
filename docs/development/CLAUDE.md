# CLAUDE.md - ATS Resume Website Project

## Project Overview
**Project Name:** Resume Vita (formerly ResumeSniper)  
**Type:** SaaS Platform - AI-Powered Resume Optimization  
**Founder:** Navy Veteran, Applied Engineering Management, 107 days sober  
**Mission:** Build a tool to help job seekers bypass ATS filters and land interviews

## The Problem & Personal Motivation
- 75% of qualified candidates are filtered out by ATS systems before human review
- Veterans and non-traditional candidates disproportionately affected
- Founder's personal experience: Multiple degrees, engineering background, can't get past ATS systems
- Currently delivering groceries for $4/hour after expenses while qualified for engineering roles

## Core Product Vision
A simple 4-step process:
1. Upload comprehensive resume (PDF, DOCX, TXT)
2. Paste job description or provide link
3. Click "Resume Magician" button
4. Receive optimized resume via email

**Key Philosophy:** "If you can count to four, this app will be easy to use"

## Brand Voice & Messaging
- **Authentic & Direct:** Military-style communication, no corporate BS
- **Transparent:** Honest about AI limitations, pricing, and process
- **Personal Story:** "I was Navy aviation ordnance, now I'm delivering groceries despite engineering degrees, so I built this"
- **No Fake Social Proof:** "Skip the fake 5-star reviews - try one free and see for yourself"

## Technical Architecture

### Core Technology Stack
- **Frontend:** Claude Code + VS Code for development
- **Backend Orchestration:** N8N (develop locally, deploy to cloud)
- **Database & Storage:** Supabase
- **Payments:** Stripe with Customer Portal
- **Email Delivery:** SendGrid/Mailgun
- **File Retention:** 48-hour auto-delete policy

### AI API Strategy (Fallback Hierarchy)
1. **Primary:** Claude 3.5 Sonnet (best for resume writing)
2. **Backup:** OpenAI GPT-4 (reliable fallback)
3. **Tertiary:** Groq (fast inference for peak times)
4. **Cost:** $0.30-0.50 per resume processing

### Development Approach
- Build and test N8N workflows locally
- Use existing partial website as foundation
- Iterate with Claude Code for UI/UX improvements
- Deploy to production when tested and stable

## Pricing Strategy & Psychology

### Pricing Tiers
- **Free Trial:** One resume for email signup (lead magnet)
- **Pay-as-you-go:** $3-8 per resume
- **Bundle (10 resumes):** $15 ($1.50 each)
- **Bundle (35 resumes):** $20 ($0.57 each)
- **Monthly Subscription:** $50/month for 100 resumes
- **Top-up Credits:** $12 for 5 more ($2.40 each - convenience pricing)

### Pricing Psychology
- Bundles encourage volume purchases
- Top-ups exploit urgency when job hunting
- Auto-conversion to pay-as-you-go when bundles expire
- "Proportional math" - desperate job hunters don't calculate per-unit costs
- **No refunds policy** with complete upfront transparency

## Website Structure

### Homepage
1. **Hero Section:** "AI tool for targeted resumes"
2. **Founder Story:** Navy veteran, business owner during pandemic, warehouse jobs, built solution
3. **Anti-BS Section:** "Skip fake reviews - try one free to see proof yourself"
4. **Primary CTA:** Free resume for email

### How It Works Page
- Same hero carried over for consistency
- 4-step process clearly outlined
- FAQ section with specific answers:
  - File formats: Everything except JSON, YAML, TOML
  - Processing time: Up to 2 minutes, usually under 1 minute
  - Security: 48-hour deletion, Stripe payments
  - Results: "You don't have to use the tool if you don't like results"

### Design Preferences
- **Color Scheme:** Navy blue (almost black, military-inspired)
- **Typography:** Rounded serif fonts for readability
- **Aesthetic:** Professional military-tech, not flashy
- **Mobile-first:** Fast loading on all devices

## Business Goals & Financial Targets

### Primary Objectives
- **Launch Timeline:** 4-6 weeks maximum
- **Target Revenue:** $15k gross monthly (~300 customers)
- **Profit Goal:** $10k monthly after expenses
- **Replace grocery delivery income and hire part-time help ($2-3k/month)

### Long-term Vision: Veteran Reclamation Project
- Use profits to purchase farmland
- Create rehabilitation space for veterans through:
  - Physical work and animal care
  - Farm-to-market sales training
  - Community building among veterans
  - Alternative to traditional VA programs

## Go-to-Market Strategy

### Primary Channels
1. **Cold Email Partnerships:** Direct outreach to Indeed, ZipRecruiter, Glassdoor
2. **Veteran Networks:** Military transition programs, VFW, American Legion
3. **LinkedIn Content:** Authentic founder journey, no fake polish
4. **Email List Building:** Through free trial, convert to newsletter

### Influencer Strategy
- Target career coaches, job search YouTubers, LinkedIn newsletter writers
- Offer 20 free resumes for testing
- No upfront payment - let quality drive organic mentions
- Focus on authenticity over paid promotions

## Operational Considerations

### Business Setup
- **Structure:** LLC or sole proprietorship (~$40 filing in KY)
- **Banking:** Chase business account (veteran benefits)
- **Domain:** resumesniper.com (professional, memorable)
- **Insurance:** Basic professional liability

### Quality Control
- **Prompt Optimization:** Use ghost job postings for testing
- **User Feedback:** 1-5 star rating in delivery emails
- **Support:** Email-based initially, scale as needed
- **Beta Testing:** Ex-wife (medical billing professional) as primary tester

### Legal & Compliance
- **Data Privacy:** GDPR/CCPA compliance
- **AI Disclaimers:** Transparent about limitations
- **Terms of Service:** Clear no-refunds policy
- **User Responsibility:** Review and edit AI outputs

## Budget & Timeline

### Launch Costs: $200-300 Total
- Supabase: $0-25/month
- N8N Cloud: $20-50/month  
- Domain: $15/year (register 3-5 years)
- AI API testing: $50-100
- Stripe: 2.9% + $0.30 per transaction

### 4-6 Week Timeline
- **Week 1:** Backend setup (bank, Stripe, Supabase, APIs)
- **Week 2:** N8N workflow development and testing
- **Week 3:** Website integration with Claude Code
- **Week 4-6:** Polish, testing, launch, initial customers

## Success Metrics
- **MVP Success:** Functional product with paying customers in 4-6 weeks
- **Financial Success:** $15k gross revenue for $10k profit target
- **Quality Metrics:** User ratings, application-to-interview conversion
- **Growth Metrics:** Email list building, free-to-paid conversion

## Competitive Advantages
1. **Authentic Founder Story:** Veteran who personally experienced ATS discrimination
2. **First-Mover:** No comprehensive ATS optimization competitors found
3. **Transparent Approach:** No fake reviews or hidden costs
4. **Technical Redundancy:** Multiple AI providers for reliability
5. **Market Timing:** Positioned for economic transition (manufacturing reshoring)

## Risk Mitigation
- **API Fallbacks:** Multiple AI providers prevent single points of failure
- **No Refunds:** Clear policy prevents abuse
- **Data Security:** 48-hour deletion reduces liability
- **Bootstrap Approach:** Minimal financial risk
- **Beta Testing:** Validate with harsh critic before launch

## Technical Notes for Development

### N8N Workflow Logic
1. User uploads files to Supabase
2. N8N webhook triggered by payment confirmation
3. Check if email has used free trial (Supabase query)
4. Try AI APIs in sequence (Claude → OpenAI → Groq)
5. Format and deliver resume via email
6. Update database with completion status and user feedback

### Database Schema (Supabase)
```
users:
- email (primary key)
- free_resume_used (boolean)
- current_tier (free/bundle/subscription/paygo)
- credits_remaining (integer)
- total_spent (decimal)
- created_at (timestamp)
- feedback_scores (array)
```

### Admin Features
- Beta tester whitelist (email-based)
- Usage analytics dashboard
- API cost tracking
- Customer support tools

## The Bigger Picture
This resume tool is phase 1 of a larger vision involving:
- AI trading systems (75% complete)
- Scientific learning AI architecture (75% complete)
- Medical billing automation
- Smart city infrastructure
- Eventually: Standalone AI operating system

But the focus remains: **One target at a time. Build the resume tool. Execute with humility.**

## Key Mantras
- "Do it right or don't do it at all"
- "Go big or go home"
- "One target at a time"
- "If you can count to four, this app will be easy to use"
- "Hineni" - Here I am, ready to do the work

---

**Final Note:** This project represents more than a business opportunity - it's a mission to help people like the founder who get filtered out by broken systems, while building toward the resources needed for the Veteran Reclamation Project. Every line of code is a step toward both personal freedom and helping other veterans find their way home.