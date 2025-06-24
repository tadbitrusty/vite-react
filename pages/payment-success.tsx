import Head from 'next/head'
import PaymentSuccess from '@/components/PaymentSuccessDefault'

export default function PaymentSuccessPage() {
  return (
    <>
      <Head>
        <title>Payment Success - Resume Vita</title>
        <meta name="description" content="Payment successful! Your resume is being processed and will be sent to your email shortly." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PaymentSuccess />
    </>
  )
}