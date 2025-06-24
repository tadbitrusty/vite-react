import Head from 'next/head'
import ResumeVita from '@/components/ResumeVita'

export default function Home() {
  return (
    <>
      <Head>
        <title>Resume Vita - AI-Powered ATS Resume Optimization</title>
        <meta name="description" content="Get your resume optimized for ATS systems with AI-powered technology. Free ATS optimization and premium templates available." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ResumeVita />
    </>
  )
}