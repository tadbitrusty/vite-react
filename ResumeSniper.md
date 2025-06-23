# Project Plan: ResumeSniper SaaS Tool - Updated Master Brief

**Project Code Name:** ResumeSniper (formerly ATS Terminator)  
**Date:** June 19, 2025  
**Mission:** Build a scalable AI-powered resume builder that helps job seekers bypass ATS filters and land interviews, ultimately aiming to replace the founder's grocery delivery income and fund a veteran-focused farm project.

## 1. Executive Summary
ResumeSniper is a SaaS platform designed to generate ATS-optimized, targeted resumes by processing user-uploaded resumes and job descriptions via AI APIs. The core problem addressed is that 75% of qualified job applicants, especially non-traditional candidates (veterans, career changers), are filtered out by Applicant Tracking Systems (ATS) before human review. The project leverages a lean, systematic approach, targeting a 4-6 week MVP timeline with a bootstrapped launch estimate of ~$300–500. The founder, a Navy veteran with applied engineering management degrees, is personally motivated by the frustration of ATS limitations.

## 2. Core Product Description
**Problem Statement:**
- 75% of applicants are rejected by ATS before human review
- Veterans, non-traditional applicants, and career switchers are disproportionately affected
- The founder's personal experience of being filtered out despite qualifications highlights this market pain point

**Solution:**
A SaaS platform where users:
1. Upload their current resume (PDF, DOCX, TXT support)
2. Paste a job description
3. Receive a targeted, ATS-optimized resume using AI
4. (Optional) Receive a tailored cover letter

This AI-driven tool is designed to generate job-specific resumes to bypass ATS filters, increasing the likelihood of human review.

## 3. Brand Voice & Messaging
**Core Messaging:**
- Authentic, military-direct communication style
- Transparent about AI limitations and pricing structure
- No fake reviews or corporate BS marketing
- "Built by a veteran who lived this problem"
- Honest about convenience pricing vs. volume pricing

**Key Messaging Elements:**
- "Yeah I'm too lazy to rewrite my resume 50 times, so I built this tool"
- "Skip the fake 5-star reviews - try one free and see for yourself"
- "This costs real money to run. I've priced it as low as possible to keep it accessible"
- "If you click without reading, that's on you - no refunds"

## 4. Business Goals & Financial Targets
**Primary Objective:**
- Launch functional MVP within 4-6 weeks to replace grocery delivery income
- Achieve $10k monthly profit after expenses (~$15k gross revenue from ~300 customers)

**Long-Term Vision:**
- Scale to recurring revenue and hire part-time support ($2-3k/month)
- Fund veteran-focused farm project ("Veteran Reclamation Project")
- Become go-to resource for navigating economic transitions

**Secondary Revenue Streams (Post-MVP):**
- Ad revenue from recruiting platforms (~$3-8k/month)
- Job market newsletter with sponsorships and premium tiers

## 5. Pricing Strategy & Psychology
**Pricing Tiers:**
- **Free Trial:** One free resume for email sign-up (email capture)
- **Pay-as-you-go:** $3-8 per resume
- **Bundle (10 resumes):** $15 ($1.50 each)
- **Bundle (35 resumes):** $20 ($0.57 each)
- **Monthly Subscription:** $50/month for 100 resumes
- **Top-up Credits:** $12 for 5 additional credits ($2.40 each)

**Pricing Psychology:**
- Free trial builds trust and captures emails for newsletter
- Bundles encourage volume purchases with better per-unit pricing
- $12 top-ups exploit urgency/convenience (higher per-unit cost for desperate job hunters)
- Auto-conversion to pay-as-you-go when bundle credits expire
- "Proportional math" - people don't calculate per-unit costs when desperate
- No refunds policy with complete transparency upfront

## 6. Technical Architecture (Revised)
**Core Workflow Management:**
- **N8N Orchestration:** Handles file processing, API routing, email delivery, database updates
- **Development Approach:** Build locally, test thoroughly, deploy to N8N Cloud
- **Integration:** Website sends webhooks to N8N, N8N manages entire backend workflow

**AI API Strategy:**
- **Primary:** Claude 3.5 Sonnet (best quality for resume writing)
- **Backup:** OpenAI GPT-4 (reliable fallback)
- **Tertiary:** Groq (fast inference for peak times)
- **Cost Management:** $0.30-0.50 per resume across all providers

**Development Tools:**
- **Frontend:** Claude Code + VS Code for iterative development
- **Backend:** Supabase (database, storage, auth)
- **Payments:** Stripe with Customer Portal for subscription management
- **Email:** SendGrid/Mailgun for reliable delivery
- **Monitoring:** Supabase logs for error tracking

## 7. Website Structure & User Experience
**Homepage Flow:**
1. **Hero Section:** "AI-Powered Targeted Resumes to Beat ATS Systems"
2. **Founder Story:** Navy veteran, couldn't get hired, built solution
3. **Honest Social Proof:** "Skip fake 5-star reviews - try one free to see for yourself"
4. **Primary CTA:** Free resume for email sign-up

**Page 2: How It Works**
- **Step 1:** Upload comprehensive resume
- **Step 2:** Paste job description
- **Step 3:** Click "Resume Magician" button
- **Step 4:** Enter email for delivery
- **Tagline:** "If you can count to four, this app will be easy to use"

**FAQ Section:**
- **File Formats:** Everything except JSON, YAML, TOML
- **Processing Time:** Up to 2 minutes pending server traffic, usually under 1 minute
- **Security:** Files stored 48 hours then auto-deleted, payments via Stripe
- **Results Policy:** "You don't have to use the tool if you don't like results"

## 8. Key Features (MVP) - Prioritized
**Must Have:**
- Resume upload (PDF, DOCX, TXT)
- Job description input (paste functionality)
- AI processing with fallback logic
- Email delivery with 48-hour file retention
- Stripe payment integration
- Free trial tracking (one per email)
- Feedback collection (1-5 stars)
- Professional website (navy blue theme, rounded serif fonts)
- Beta tester whitelist system
- Admin code/promo code functionality

**Beta Testing & Whitelist System:**
- **Primary Beta Tester:** Ex-wife (medical billing professional, disabled child, skeptical mindset)
- **Stress Test:** Multi-page comprehensive resume processing
- **Implementation:** Email whitelist in N8N workflow or promo code field
- **Tracking:** Separate analytics for beta vs. paid users
- **Expected Outcome:** Brutal honest feedback and validation from harshest critic

**Nice to Have (Post-MVP):**
- Cover letter generation
- Job market newsletter
- Partnership integrations
- Admin dashboard

## 9. Go-to-Market Strategy
**Primary Channels:**
- **Cold Email:** Direct outreach to job platforms (Indeed, ZipRecruiter, Glassdoor) with partnership proposals
- **LinkedIn:** Build journey updates, founder story authenticity
- **Veteran Networks:** Military transition programs, veteran organizations
- **Email List:** Build through free trial, convert to newsletter subscribers

**Influencer Strategy:**
- Target 30 career coaches, job search YouTubers, LinkedIn newsletter writers
- Offer 20 free resumes for testing (no upfront payment required)
- Expected conversion: 50% open emails → 50% try tool → 75% approve → 50% mention = 3-4 organic mentions
- Search terms: "resume tips," "job search," "career advice," "ATS resume"
- Focus on authenticity over paid promotions

**Content Strategy:**
- Transparent about being veteran-built solution
- Before/after resume examples
- Job market insights tied to economic trends (manufacturing reshoring)
- No fake testimonials - let results speak

## 10. Legal & Operational Considerations
**Business Setup:**
- KY LLC or sole proprietorship (~$40 filing)
- Chase business account (veteran benefits)
- Professional liability disclaimers

**Data & Privacy:**
- GDPR/CCPA compliance
- 48-hour file deletion policy
- Transparent AI usage disclaimers
- User responsibility for content review

**Quality Control:**
- Prompt optimization using ghost job postings
- User feedback collection via email
- No refunds policy clearly stated
- Email-based customer support initially

## 11. Budget & Timeline
**Total Launch Cost:** $200-300
- Supabase: $0-25/month
- N8N Cloud: $20-50/month
- Domain: $15/year (3-5 years upfront)
- AI API testing: $50-100
- Stripe: Pay per transaction (2.9% + $0.30)

**Timeline: 4-6 weeks**
- **Week 1:** Backend setup (bank, Stripe, Supabase, API testing)
- **Week 2:** N8N workflow development and testing
- **Week 3:** Website integration with Claude Code
- **Week 4-6:** Polish, launch, initial customer acquisition

## 12. Success Metrics
**Launch Success:** Functional MVP with paying customers within 4-6 weeks
**Financial Success:** $15k gross revenue (~300 customers) for $10k profit target
**Quality Metrics:** User feedback, application-to-interview conversion rates
**Growth Metrics:** Email list building, conversion from free to paid users

## 13. Competitive Advantages
- **Authentic founder story:** Veteran who lived the ATS problem personally
- **First-mover advantage:** No direct comprehensive ATS optimization competitors
- **Transparent pricing:** No fake reviews or hidden costs
- **Technical redundancy:** Multiple AI providers for reliability
- **Market timing:** Positioned for economic transition (manufacturing reshoring)

## 14. Long-term Vision: Veteran Reclamation Project
**Ultimate Goal:** Use ResumeSniper profits to fund veteran rehabilitation farm
- **Mission:** Help veterans reclaim purpose through land, animals, and community
- **Approach:** Physical work, animal therapy, farm-to-market sales training
- **Funding Model:** $2-10M+ acquisition or sustained profitability from ResumeSniper

## 15. Next Steps (Starting June 19, 2025)
**Immediate Actions:**
1. Organize AI conversation archive into requirements
2. Open Chase business account
3. Register domain (resumesniper.com)
4. Set up development environment

**Week 1 Priorities:**
1. Stripe and Supabase configuration
2. AI API testing and prompt optimization
3. N8N local development setup
4. Begin core workflow development

**Success Criteria:** Replace grocery delivery income within 6 weeks maximum

---

**Note:** This updated plan incorporates the authentic voice, specific tactical decisions, and pricing psychology discussed in the original conversation. The focus remains on rapid execution with complete transparency and veteran-authentic messaging.