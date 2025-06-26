export const config = {
  app: {
    name: 'Resume Vita',
    description: 'AI-Powered ATS Resume Optimization Platform',
    url: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
  }
}