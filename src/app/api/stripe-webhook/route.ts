import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { RESUME_TEMPLATES } from '../../../constants';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    console.log('[STRIPE_WEBHOOK] Webhook received');
    
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
      console.error('[STRIPE_WEBHOOK] No signature header found');
      return NextResponse.json(
        { error: 'No signature header' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      console.log(`[STRIPE_WEBHOOK] Event verified: ${event.type}`);
    } catch (err) {
      console.error('[STRIPE_WEBHOOK] Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[STRIPE_WEBHOOK] Payment successful for session: ${session.id}`);
        
        await handleSuccessfulPayment(session);
        break;

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[STRIPE_WEBHOOK] Payment intent succeeded: ${paymentIntent.id}`);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log(`[STRIPE_WEBHOOK] Payment failed: ${failedPayment.id}`);
        break;

      default:
        console.log(`[STRIPE_WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('[STRIPE_WEBHOOK] Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  try {
    console.log(`[STRIPE_WEBHOOK] Processing successful payment for session: ${session.id}`);
    
    const { templateId, email, resumeData, jobDescription } = session.metadata || {};
    
    if (!templateId || !email) {
      console.error('[STRIPE_WEBHOOK] Missing required metadata in session');
      return;
    }

    const template = RESUME_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      console.error(`[STRIPE_WEBHOOK] Template not found: ${templateId}`);
      return;
    }

    console.log(`[STRIPE_WEBHOOK] Processing resume for ${email} - ${template.name}`);

    // Decode the base64 encoded data
    const decodedResumeData = resumeData ? Buffer.from(resumeData, 'base64').toString() : '';
    const decodedJobDescription = jobDescription ? Buffer.from(jobDescription, 'base64').toString() : '';

    // Record usage in tracking system
    try {
      console.log(`[STRIPE_WEBHOOK] Recording payment usage for ${email}`);
      
      const trackingResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/user-tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          action: 'record_usage'
        })
      });

      if (!trackingResponse.ok) {
        console.error('[STRIPE_WEBHOOK] Failed to record usage tracking');
      }
    } catch (trackingError) {
      console.error('[STRIPE_WEBHOOK] Error recording usage:', trackingError);
    }

    // Generate the resume
    try {
      console.log(`[STRIPE_WEBHOOK] Generating resume for paid customer: ${email}`);
      
      const resumeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/process-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          resumeContent: decodedResumeData,
          jobDescription: decodedJobDescription,
          fileName: `resume_${templateId}.pdf`,
          template: templateId,
          isFirstTimeFlow: false,
          paymentSessionId: session.id, // Include payment verification
          skipPaymentCheck: true // Skip payment validation since this is post-payment
        })
      });

      const resumeResult = await resumeResponse.json();
      
      if (resumeResult.success) {
        console.log(`[STRIPE_WEBHOOK] Resume generated successfully for ${email}`);
        console.log(`[STRIPE_WEBHOOK] Payment amount: $${(session.amount_total || 0) / 100}`);
        console.log(`[STRIPE_WEBHOOK] Customer ID: ${session.customer || 'N/A'}`);
      } else {
        console.error('[STRIPE_WEBHOOK] Resume generation failed:', resumeResult.message);
      }

    } catch (resumeError) {
      console.error('[STRIPE_WEBHOOK] Error generating resume:', resumeError);
    }

    // Log successful transaction for analytics
    console.log(`[STRIPE_WEBHOOK] ✅ SUCCESSFUL TRANSACTION:`);
    console.log(`[STRIPE_WEBHOOK]   Session ID: ${session.id}`);
    console.log(`[STRIPE_WEBHOOK]   Customer: ${email}`);
    console.log(`[STRIPE_WEBHOOK]   Template: ${template.name} ($${template.price})`);
    console.log(`[STRIPE_WEBHOOK]   Amount: $${(session.amount_total || 0) / 100}`);
    console.log(`[STRIPE_WEBHOOK]   Currency: ${session.currency?.toUpperCase()}`);
    console.log(`[STRIPE_WEBHOOK]   Payment Status: ${session.payment_status}`);

  } catch (error) {
    console.error('[STRIPE_WEBHOOK] Error handling successful payment:', error);
  }
}