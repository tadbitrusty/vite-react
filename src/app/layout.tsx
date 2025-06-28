import type { Metadata } from 'next'
import { Inter, Crimson_Text } from 'next/font/google'
import { Navigation } from '@/components'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const crimsonText = Crimson_Text({ 
  subsets: ['latin'], 
  weight: ['400', '600', '700'],
  variable: '--font-crimson'
})

export const metadata: Metadata = {
  title: 'Resume Vita - AI-Powered ATS Resume Optimization',
  description: 'Get your resume optimized for ATS systems with AI-powered technology. Free ATS optimization and premium templates available.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Resume Vita",
    "description": "AI-powered resume optimization for ATS systems. Engineer-built tool that solves the 75% ATS rejection problem with transparent pricing and no subscription traps.",
    "url": "https://resumevita.io",
    "applicationCategory": "BusinessApplication",
    "applicationSubCategory": "Resume Optimization Software",
    "operatingSystem": "Web Browser",
    "softwareVersion": "1.0",
    "author": {
      "@type": "Person",
      "name": "Resume Vita Engineering Team",
      "description": "Engineers with multiple degrees focused on solving ATS rejection problems"
    },
    "offers": [
      {
        "@type": "Offer",
        "name": "ATS Optimized Resume",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Free ATS-optimized resume template - proof of quality",
        "availability": "https://schema.org/InStock"
      },
      {
        "@type": "Offer",
        "name": "Premium Classic",
        "price": "5.99",
        "priceCurrency": "USD",
        "description": "Professional template for entry-level professionals",
        "availability": "https://schema.org/InStock"
      },
      {
        "@type": "Offer",
        "name": "Tech Focus",
        "price": "9.99", 
        "priceCurrency": "USD",
        "description": "Optimized for IT and engineering roles",
        "availability": "https://schema.org/InStock"
      },
      {
        "@type": "Offer",
        "name": "Basic Resume Builder",
        "price": "45",
        "priceCurrency": "USD",
        "description": "Professional resume built from your information",
        "availability": "https://schema.org/InStock"
      },
      {
        "@type": "Offer",
        "name": "AI-Enhanced Resume Builder", 
        "price": "75",
        "priceCurrency": "USD",
        "description": "AI-optimized resume with enhanced content and formatting",
        "availability": "https://schema.org/InStock"
      }
    ],
    "featureList": [
      "ATS-compatible resume optimization",
      "AI-powered content enhancement", 
      "PDF, DOCX, TXT file support",
      "Drag and drop file upload",
      "Professional template system",
      "No subscription required",
      "Transparent pricing",
      "Engineer-built solution"
    ],
    "keywords": "resume optimization, ATS, applicant tracking system, resume builder, job application, career tools, ATS-friendly resume, resume template",
    "screenshot": "https://resumevita.io/og-image.png",
    "maintainer": {
      "@type": "Organization",
      "name": "Resume Vita",
      "url": "https://resumevita.io"
    }
  };

  return (
    <html lang="en" className={`${inter.className} ${crimsonText.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema)
          }}
        />
      </head>
      <body>
        <Navigation />
        {children}
      </body>
    </html>
  )
}