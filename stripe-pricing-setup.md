# Stripe Tiered Pricing Setup Guide

## Overview
Configure Stripe to handle 5 different pricing tiers for ResumeSniper templates.

## Stripe Dashboard Setup

### 1. Create Products
In your Stripe Dashboard → Products, create 5 products:

#### Entry Level Product
- **Name**: "ResumeSniper - Modern Clean Template"
- **Description**: "Entry-level professional resume template optimized for ATS systems"
- **Price**: $5.99 USD (one-time payment)
- **Price ID**: `price_clean_modern_599`

#### Standard Product  
- **Name**: "ResumeSniper - ATS Optimized Template"
- **Description**: "Most popular traditional resume template - works for any industry"
- **Price**: $6.99 USD (one-time payment)
- **Price ID**: `price_ats_optimized_699`

#### Professional Product
- **Name**: "ResumeSniper - Technical Focus Template"
- **Description**: "IT/Engineering specialized template with prominent skills sections"
- **Price**: $7.99 USD (one-time payment) 
- **Price ID**: `price_technical_799`

#### Premium Product
- **Name**: "ResumeSniper - Professional Plus Template"
- **Description**: "Enhanced readability template perfect for career changers"
- **Price**: $8.99 USD (one-time payment)
- **Price ID**: `price_professional_899`

#### Executive Product
- **Name**: "ResumeSniper - Executive Format Template"
- **Description**: "Senior-level executive template for leadership positions"
- **Price**: $9.99 USD (one-time payment)
- **Price ID**: `price_executive_999`

## N8N Integration Changes

### 1. Payment Gateway Routing
Update your payment gateway node to handle dynamic pricing:

```javascript
// N8N Function Node: Dynamic Stripe Payment
const priceMapping = {
  'clean-modern': 'price_clean_modern_599',
  'classic-chronological': 'price_ats_optimized_699', 
  'technical-focused': 'price_technical_799',
  'enhanced-professional': 'price_professional_899',
  'executive-senior': 'price_executive_999'
};

const selectedTemplate = $input.first().json.template;
const stripePriceId = priceMapping[selectedTemplate] || 'price_ats_optimized_699';

return [{
  json: {
    ...($input.first().json),
    stripePriceId: stripePriceId,
    redirectTo: `https://buy.stripe.com/your-payment-link-${stripePriceId}`
  }
}];
```

### 2. Payment Confirmation Webhook
Update webhook to capture pricing tier information:

```javascript
// Stripe Webhook Handler in N8N
const eventType = $input.first().json.type;

if (eventType === 'checkout.session.completed') {
  const session = $input.first().json.data.object;
  const priceId = session.line_items.data[0].price.id;
  
  // Map price ID back to template
  const templateMapping = {
    'price_clean_modern_599': 'clean-modern',
    'price_ats_optimized_699': 'classic-chronological',
    'price_technical_799': 'technical-focused', 
    'price_professional_899': 'enhanced-professional',
    'price_executive_999': 'executive-senior'
  };
  
  const template = templateMapping[priceId];
  const customerEmail = session.customer_details.email;
  
  return [{
    json: {
      paymentConfirmed: true,
      template: template,
      customerEmail: customerEmail,
      amountPaid: session.amount_total / 100, // Convert from cents
      priceId: priceId
    }
  }];
}
```

## Revenue Tracking Setup

### 1. Analytics Function
Add this to track revenue by template tier:

```javascript
// N8N Function Node: Revenue Analytics
const pricingTiers = {
  'clean-modern': { tier: 'entry', price: 5.99 },
  'classic-chronological': { tier: 'standard', price: 6.99 },
  'technical-focused': { tier: 'professional', price: 7.99 },
  'enhanced-professional': { tier: 'premium', price: 8.99 },
  'executive-senior': { tier: 'executive', price: 9.99 }
};

const template = $input.first().json.template;
const tierInfo = pricingTiers[template];

return [{
  json: {
    ...($input.first().json),
    revenueTier: tierInfo.tier,
    revenueAmount: tierInfo.price,
    timestamp: new Date().toISOString()
  }
}];
```

### 2. Database Logging
Update your Supabase insert to track pricing:

```sql
-- Add columns to your analytics table
ALTER TABLE processing_analytics 
ADD COLUMN pricing_tier VARCHAR,
ADD COLUMN revenue_amount DECIMAL(5,2),
ADD COLUMN template_selected VARCHAR;

-- Insert with pricing data
INSERT INTO processing_analytics (
  email, 
  template_selected,
  pricing_tier,
  revenue_amount,
  processing_time,
  created_at
) VALUES (
  $1, $2, $3, $4, $5, NOW()
);
```

## Email Messaging Updates

### 1. Template-Specific Messaging
Update email templates to reflect premium positioning:

```javascript
// Email content based on pricing tier
const emailMessages = {
  'entry': {
    subject: 'Your Modern Clean Resume ($5.99) - ResumeSniper',
    greeting: 'Perfect choice for entry-level positions!'
  },
  'standard': {
    subject: 'Your ATS Optimized Resume ($6.99) - ResumeSniper', 
    greeting: 'Our most popular template - works everywhere!'
  },
  'professional': {
    subject: 'Your Technical Resume ($7.99) - ResumeSniper',
    greeting: 'Optimized for IT and engineering roles!'
  },
  'premium': {
    subject: 'Your Professional Plus Resume ($8.99) - ResumeSniper',
    greeting: 'Premium formatting for career advancement!'
  },
  'executive': {
    subject: 'Your Executive Resume ($9.99) - ResumeSniper',
    greeting: 'Leadership-focused template for senior roles!'
  }
};
```

## Payment Flow Testing

### 1. Test Each Pricing Tier
- Entry: $5.99 payment flow
- Standard: $6.99 payment flow  
- Professional: $7.99 payment flow
- Premium: $8.99 payment flow
- Executive: $9.99 payment flow

### 2. Verify Data Flow
1. Frontend sends correct `templatePrice`
2. N8N routes to correct Stripe price ID
3. Payment processes successfully
4. Webhook captures correct template/price
5. Email reflects premium positioning
6. Analytics track revenue by tier

## Revenue Projections

### Monthly Targets (100 customers)
- **Old Model**: 100 × $5.99 = $599
- **New Model**: 
  - 10 Entry ($5.99) = $59.90
  - 15 Standard ($6.99) = $104.85
  - 25 Professional ($7.99) = $199.75
  - 20 Premium ($8.99) = $179.80
  - 30 Executive ($9.99) = $299.70
  - **Total**: $844.00 (+41% revenue increase)

This tiered pricing strategy aligns price with perceived value while maintaining the manufacturing line efficiency.