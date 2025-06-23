// N8N Function Node: Template Router
// This function node selects the appropriate HTML template based on user selection

const templates = {
  'clean-modern': {
    name: 'Modern Clean (Entry-Mid Level)',
    filename: 'clean-modern.html',
    description: 'Minimal contemporary design for young professionals',
    price: 5.99,
    stripeId: 'price_clean_modern_599',
    tier: 'entry'
  },
  'classic-chronological': {
    name: 'ATS Optimized (Most Used)',
    filename: 'classic-chronological.html',
    description: 'Traditional structure, works for any industry',
    price: 6.99,
    stripeId: 'price_ats_optimized_699',
    tier: 'standard'
  },
  'technical-focused': {
    name: 'Technical Focus (IT/Engineering)',
    filename: 'technical-focused.html',
    description: 'Prominent skills section, project highlights',
    price: 7.99,
    stripeId: 'price_technical_799',
    tier: 'professional'
  },
  'enhanced-professional': {
    name: 'Professional Plus (Best for Readability)', 
    filename: 'enhanced-professional.html',
    description: 'Skills summary at top, great for career changers',
    price: 8.99,
    stripeId: 'price_professional_899',
    tier: 'premium'
  },
  'executive-senior': {
    name: 'Executive Format (Senior Roles)',
    filename: 'executive-senior.html', 
    description: 'Conservative, authoritative feel for leadership positions',
    price: 9.99,
    stripeId: 'price_executive_999',
    tier: 'executive'
  }
};

// Get template selection from input data
const selectedTemplate = $input.first().json.template || 'classic-chronological';
const templateInfo = templates[selectedTemplate];

// If invalid template, default to classic
if (!templateInfo) {
  return [{
    json: {
      template: 'classic-chronological',
      templateName: templates['classic-chronological'].name,
      templateFile: templates['classic-chronological'].filename,
      ...($input.first().json)
    }
  }];
}

// Return the template information along with original data
return [{
  json: {
    template: selectedTemplate,
    templateName: templateInfo.name,
    templateFile: templateInfo.filename,
    templateDescription: templateInfo.description,
    templatePrice: templateInfo.price,
    stripeProductId: templateInfo.stripeId,
    pricingTier: templateInfo.tier,
    ...($input.first().json)
  }
}];