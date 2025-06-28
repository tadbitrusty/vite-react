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
  return (
    <html lang="en" className={`${inter.className} ${crimsonText.variable}`}>
      <body>
        <Navigation />
        {children}
      </body>
    </html>
  )
}