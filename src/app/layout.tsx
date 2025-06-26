import type { Metadata } from 'next';
import { Inter, Crimson_Text } from 'next/font/google';
import { config } from '@/lib/config';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const crimsonText = Crimson_Text({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-crimson',
});

export const metadata: Metadata = {
  title: {
    default: config.app.name,
    template: `%s | ${config.app.name}`,
  },
  description: config.app.description,
  keywords: [
    'resume builder',
    'ATS optimization',
    'job application',
    'career tools',
    'professional resume',
    'AI-powered',
  ],
  authors: [{ name: 'Resume Vita Team' }],
  creator: 'Resume Vita',
  metadataBase: new URL(config.app.url),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: config.app.url,
    title: config.app.name,
    description: config.app.description,
    siteName: config.app.name,
  },
  twitter: {
    card: 'summary_large_image',
    title: config.app.name,
    description: config.app.description,
    creator: '@resumevita',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="en" className={`${inter.variable} ${crimsonText.variable}`}>
      <body className="min-h-screen bg-gradient-to-br from-resume-dark via-resume-medium to-resume-light font-inter antialiased">
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}