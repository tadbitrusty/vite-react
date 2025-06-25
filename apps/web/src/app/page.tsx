import { ResumeVita } from '@/components/resume-vita';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Build Your Perfect ATS-Optimized Resume',
  description: 'Transform your resume with AI-powered optimization. Get past ATS systems and land more interviews with professionally crafted templates.',
};

export default function HomePage(): React.JSX.Element {
  return (
    <main className="container mx-auto px-4 py-8 md:py-16">
      <ResumeVita />
    </main>
  );
}