import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { RESUME_TEMPLATES } from '../../../constants';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: NextRequest) {
  try {
    console.log('[STRIPE_CHECKOUT] Creating checkout session');
    
    const body = await request.json();
    const { templateId, email, resumeData, jobDescription, successUrl, cancelUrl } = body;

    if (!templateId || !email) {
      console.log('[STRIPE_CHECKOUT] Missing required fields');
      return NextResponse.json(
        { success: false, message: 'Template ID and email are required' },
        { status: 400 }
      );
    }

    // Find the template and validate pricing
    const template = RESUME_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      console.log(`[STRIPE_CHECKOUT] Template not found: ${templateId}`);
      return NextResponse.json(
        { success: false, message: 'Invalid template selected' },
        { status: 400 }
      );
    }

    if (template.price === 0) {
      console.log(`[STRIPE_CHECKOUT] Free template selected: ${templateId}`);
      return NextResponse.json(
        { success: false, message: 'This template is free and does not require payment' },
        { status: 400 }
      );
    }

    console.log(`[STRIPE_CHECKOUT] Creating session for template: ${template.name} ($${template.price})`);
    console.log(`[STRIPE_CHECKOUT] Customer email: ${email}`);

    // Get stripe price ID safely
    const stripePrice = (template as any).stripePrice;
    
    if (!stripePrice) {
      console.log(`[STRIPE_CHECKOUT] No Stripe price ID for template: ${templateId}`);
      return NextResponse.json(
        { success: false, message: 'Template pricing not configured' },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price: stripePrice, // Use the Stripe price ID from constants
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&template=${templateId}&email=${encodeURIComponent(email)}`,
      cancel_url: `${cancelUrl}?template=${templateId}&email=${encodeURIComponent(email)}`,
      metadata: {
        templateId,
        email,
        resumeData: resumeData ? Buffer.from(resumeData).toString('base64') : '',
        jobDescription: jobDescription ? Buffer.from(jobDescription).toString('base64') : '',
        timestamp: new Date().toISOString()
      },
      billing_address_collection: 'auto',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'ES', 'IT', 'NL', 'SE', 'NO', 'DK', 'FI'],
      },
      phone_number_collection: {
        enabled: false,
      },
      allow_promotion_codes: true,
    });

    console.log(`[STRIPE_CHECKOUT] Session created successfully: ${session.id}`);
    console.log(`[STRIPE_CHECKOUT] Checkout URL: ${session.url}`);

    // Log the payment attempt for tracking
    console.log(`[STRIPE_CHECKOUT] Payment attempt logged for ${email} - ${template.name}`);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url,
      message: 'Checkout session created successfully'
    });

  } catch (error) {
    console.error('[STRIPE_CHECKOUT] Error creating checkout session:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      console.error('[STRIPE_CHECKOUT] Stripe error:', error.code, error.message);
      return NextResponse.json(
        { success: false, message: `Payment error: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to create payment session' },
      { status: 500 }
    );
  }
}