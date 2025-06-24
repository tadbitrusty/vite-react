import Head from 'next/head'
import ResumeBuilder from '@/components/ResumeBuilder'

export default function ResumeBuilderPage() {
  return (
    <>
      <Head>
        <title>Resume Builder - Resume Vita</title>
        <meta name="description" content="Build a professional resume with our AI-enhanced resume builder. Choose from basic or AI-enhanced options." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ResumeBuilder />
    </>
  )
}