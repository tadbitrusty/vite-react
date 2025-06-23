// N8N Function Node: Email-Based Free/Paid Logic
// This function checks if the email has been used before and handles pricing accordingly

// Get input data
const email = $input.first().json.email;
const isFirstTimeFlow = $input.first().json.isFirstTimeFlow;
const template = $input.first().json.template;

// Template pricing mapping
const templatePricing = {
  'classic-chronological': { price: 6.99, stripeId: 'price_ats_optimized_699' },
  'clean-modern': { price: 5.99, stripeId: 'price_clean_modern_599' },
  'technical-focused': { price: 7.99, stripeId: 'price_technical_799' },
  'enhanced-professional': { price: 8.99, stripeId: 'price_professional_899' },
  'executive-senior': { price: 9.99, stripeId: 'price_executive_999' }
};

// Check if email exists in database (this will be connected to your Supabase query)
// For now, we'll simulate this - replace with actual database lookup
const emailExists = false; // This will come from your Supabase query result

// First Time Flow Logic
if (isFirstTimeFlow) {
  if (emailExists) {
    // Email has been used before - redirect to payment
    const templateInfo = templatePricing[template];
    return [{
      json: {
        success: false,
        requiresPayment: true,
        message: "Email has been used before. Please select a premium template.",
        paymentUrl: `https://buy.stripe.com/${templateInfo.stripeId}?prefilled_email=${encodeURIComponent(email)}`,
        template: template,
        price: templateInfo.price
      }
    }];
  } else {
    // New email - process free resume with basic template
    return [{
      json: {
        ...($input.first().json),
        success: true,
        isFreeResume: true,
        template: 'classic-chronological', // Force free users to basic template
        message: "Processing your free resume...",
        chargeAmount: 0
      }
    }];
  }
}

// Returning User Flow Logic  
if (!isFirstTimeFlow) {
  // User selected "Returning User" - always requires payment
  const templateInfo = templatePricing[template];
  return [{
    json: {
      success: false,
      requiresPayment: true,
      message: `Selected ${template} template - $${templateInfo.price}`,
      paymentUrl: `https://buy.stripe.com/${templateInfo.stripeId}?prefilled_email=${encodeURIComponent(email)}`,
      template: template,
      price: templateInfo.price
    }
  }];
}

// Fallback - shouldn't reach here
return [{
  json: {
    success: false,
    message: "Invalid flow state",
    ...($input.first().json)
  }
}];