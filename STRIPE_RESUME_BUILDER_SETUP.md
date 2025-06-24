# Stripe Resume Builder Setup Guide

## 🚀 Quick Setup for Resume Builder Pricing

### Step 1: Create Products in Stripe Dashboard

1. **Go to Stripe Dashboard** → Products → Create Product

2. **Create Basic Resume Builder Product:**
   - **Name:** Basic Resume Builder
   - **Description:** Form data populated into professional template
   - **Price:** $45.00 USD
   - **Type:** One-time payment
   - **Copy the Price ID** (starts with `price_`)

3. **Create Enhanced Resume Builder Product:**
   - **Name:** AI-Enhanced Resume Builder  
   - **Description:** AI improves content + professional template
   - **Price:** $75.00 USD
   - **Type:** One-time payment
   - **Copy the Price ID** (starts with `price_`)

### Step 2: Update Code with Real Price IDs

Replace the placeholder values in two files:

#### File 1: `src/constants/index.ts`
```typescript
export const RESUME_BUILDER_PRICING = {
  BASIC: {
    price: 45,
    stripePrice: 'price_YOUR_BASIC_PRICE_ID_HERE',  // Replace this
    name: 'Basic Resume Builder',
    description: 'Form data populated into professional template'
  },
  ENHANCED: {
    price: 75,
    stripePrice: 'price_YOUR_ENHANCED_PRICE_ID_HERE',  // Replace this
    name: 'AI-Enhanced Resume Builder',
    description: 'AI improves content + professional template'
  }
} as const;
```

#### File 2: `api/build-resume.js`
```javascript
const RESUME_BUILDER_PRODUCTS = {
  'basic': {
    price_id: 'price_YOUR_BASIC_PRICE_ID_HERE',  // Replace this
    amount: 4500, // $45.00
    name: 'Basic Resume Builder'
  },
  'enhanced': {
    price_id: 'price_YOUR_ENHANCED_PRICE_ID_HERE',  // Replace this
    amount: 7500, // $75.00
    name: 'AI-Enhanced Resume Builder'
  }
};
```

### Step 3: Test the Integration

1. **Deploy the changes** (git commit + push)
2. **Test with a small amount first** (maybe create test products for $0.50 and $1.00)
3. **Verify payment flow works end-to-end**
4. **Switch to live products** when ready

### Step 4: Monitor

- Check Stripe dashboard for successful payments
- Monitor logs for any payment processing errors
- Test both pricing tiers thoroughly

---

## 🎉 YOU'RE READY TO MAKE MONEY!

The Resume Builder is fully functional with:
- ✅ Professional form interface
- ✅ Two-tier pricing structure  
- ✅ Stripe payment integration
- ✅ PDF delivery system
- ✅ Enterprise-grade architecture

**Just update those Price IDs and you're live!** 🚀