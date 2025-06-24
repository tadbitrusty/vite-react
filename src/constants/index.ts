// Application constants
export const API_ENDPOINTS = {
  PROCESS_RESUME: '/api/process-resume',
  BUILD_RESUME: '/api/build-resume',
  HEALTH: '/api/health',
  STRIPE_WEBHOOK: '/api/stripe-webhook'
} as const;

export const FILE_CONFIG = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc',
    'text/plain': '.txt',
    'text/rtf': '.rtf',
    'application/rtf': '.rtf'
  }
} as const;

export const RESUME_TEMPLATES = [
  { 
    id: 'ats-optimized', 
    name: 'ATS Optimized', 
    icon: '⭐', 
    price: 0, 
    freeForFirstTime: true,
    description: 'Traditional structure, works for any industry',
    tier: 'free'
  },
  { 
    id: 'entry-clean', 
    name: 'Premium Classic', 
    icon: '✨', 
    price: 5.99, 
    stripePrice: 'price_1RdLj0K2tmo6HKYKTPY41pOa',
    description: 'Modern design for entry-level professionals',
    tier: 'entry'
  },
  { 
    id: 'tech-focus', 
    name: 'Tech Focus', 
    icon: '⚙️', 
    price: 9.99, 
    stripePrice: 'price_1RdLkqK2tmo6HKYKkCPPcVtQ',
    description: 'Optimized for IT and engineering roles',
    tier: 'professional'
  },
  { 
    id: 'professional-plus', 
    name: 'Premium Plus', 
    icon: '👁️', 
    price: 7.99, 
    stripePrice: 'price_1RdLjbK2tmo6HKYKwByFU7dy',
    description: 'Enhanced formatting for career growth',
    tier: 'premium'
  },
  { 
    id: 'executive-format', 
    name: 'Executive Format', 
    icon: '💼', 
    price: 8.99, 
    stripePrice: 'price_1RdLkEK2tmo6HKYKaSNqvrh1',
    description: 'Premium design for senior leadership',
    tier: 'executive'
  }
] as const;

export const RESUME_BUILDER_PRICING = {
  BASIC: {
    price: 45,
    name: 'Basic Resume Builder',
    description: 'Form data populated into professional template'
  },
  ENHANCED: {
    price: 75,
    name: 'AI-Enhanced Resume Builder',
    description: 'AI improves content + professional template'
  }
} as const;