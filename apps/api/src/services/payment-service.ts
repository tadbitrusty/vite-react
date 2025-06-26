import Stripe from 'stripe';
import { config } from '@resume-vita/config';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

// Stripe configuration
const stripe = new Stripe(config.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
});

// Payment validation schemas
const CreateCheckoutSessionSchema = z.object({
  productType: z.enum(['template', 'resume-builder']),
  productId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default('usd'),
  customerEmail: z.string().email(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  metadata: z.record(z.string()).optional(),
});

const ProcessWebhookSchema = z.object({
  signature: z.string(),
  payload: z.string(),
});

type CreateCheckoutSessionInput = z.infer<typeof CreateCheckoutSessionSchema>;
type ProcessWebhookInput = z.infer<typeof ProcessWebhookSchema>;

// Product catalog (matches original pricing)
const PRODUCT_CATALOG = {
  // Template Products
  'entry-clean': {
    priceId: 'price_1RdLj0K2tmo6HKYKTPY41pOa',
    amount: 599, // $5.99
    name: 'Premium Classic Template',
    description: 'Modern design for entry-level professionals',
  },
  'tech-focus': {
    priceId: 'price_1RdLkqK2tmo6HKYKkCPPcVtQ',
    amount: 999, // $9.99
    name: 'Tech Focus Template',
    description: 'Optimized for IT and engineering roles',
  },
  'professional-plus': {
    priceId: 'price_1RdLjbK2tmo6HKYKwByFU7dy',
    amount: 799, // $7.99
    name: 'Premium Plus Template',
    description: 'Enhanced formatting for career growth',
  },
  'executive-format': {
    priceId: 'price_1RdLkEK2tmo6HKYKaSNqvrh1',
    amount: 899, // $8.99
    name: 'Executive Format Template',
    description: 'Premium design for senior leadership',
  },
  
  // Resume Builder Products
  'resume-builder-basic': {
    priceId: 'price_1RdahQK2tmo6HKYKhHAwxQce',
    amount: 4500, // $45.00
    name: 'Basic Resume Builder',
    description: 'Professional resume creation with basic features',
  },
  'resume-builder-enhanced': {
    priceId: 'price_1RdaiAK2tmo6HKYKZUt5ZN0U',
    amount: 7500, // $75.00
    name: 'Enhanced Resume Builder',
    description: 'Premium resume creation with advanced features',
  },
} as const;

// Payment result interfaces
interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
  expiresAt: Date;
  amount: number;
  currency: string;
  productInfo: {
    name: string;
    description: string;
  };
}

interface PaymentVerificationResult {
  success: boolean;
  paymentStatus: 'pending' | 'succeeded' | 'failed' | 'canceled';
  amount: number;
  currency: string;
  customerEmail: string;
  productId: string;
  transactionId: string;
  metadata: Record<string, string>;
}

interface WebhookProcessingResult {
  success: boolean;
  eventType: string;
  handled: boolean;
  paymentRecordId?: string;
  errorMessage?: string;
}

class PaymentService {
  /**
   * Create Stripe checkout session
   */
  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSessionResult> {
    // Validate input
    const validatedInput = CreateCheckoutSessionSchema.parse(input);
    
    // Get product information
    const productInfo = PRODUCT_CATALOG[validatedInput.productId as keyof typeof PRODUCT_CATALOG];
    if (!productInfo) {
      throw new Error(`Invalid product ID: ${validatedInput.productId}`);
    }

    // Verify amount matches catalog
    if (validatedInput.amount !== productInfo.amount) {
      throw new Error('Amount mismatch with catalog price');
    }

    try {
      // Create or retrieve customer
      const customer = await this.getOrCreateCustomer(validatedInput.customerEmail);

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: validatedInput.currency,
              product_data: {
                name: productInfo.name,
                description: productInfo.description,
              },
              unit_amount: validatedInput.amount,
            },
            quantity: 1,
          },
        ],
        success_url: validatedInput.successUrl + '?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: validatedInput.cancelUrl,
        metadata: {
          productType: validatedInput.productType,
          productId: validatedInput.productId,
          customerEmail: validatedInput.customerEmail,
          ...validatedInput.metadata,
        },
        expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
        billing_address_collection: 'auto',
        customer_email: validatedInput.customerEmail,
      });

      // Create payment record in database
      await this.createPaymentRecord({
        stripeSessionId: session.id,
        customerEmail: validatedInput.customerEmail,
        amount: validatedInput.amount,
        currency: validatedInput.currency,
        productType: validatedInput.productType,
        productId: validatedInput.productId,
        status: 'PENDING',
      });

      return {
        sessionId: session.id,
        checkoutUrl: session.url!,
        expiresAt: new Date(session.expires_at * 1000),
        amount: validatedInput.amount,
        currency: validatedInput.currency,
        productInfo: {
          name: productInfo.name,
          description: productInfo.description,
        },
      };
    } catch (error) {
      console.error('Stripe checkout session creation failed:', error);
      throw new Error('Failed to create payment session');
    }
  }

  /**
   * Verify payment status and retrieve session details
   */
  async verifyPayment(sessionId: string): Promise<PaymentVerificationResult> {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      });

      const paymentIntent = session.payment_intent as Stripe.PaymentIntent;

      return {
        success: session.payment_status === 'paid',
        paymentStatus: this.mapStripeStatus(session.payment_status),
        amount: session.amount_total || 0,
        currency: session.currency || 'usd',
        customerEmail: session.customer_details?.email || '',
        productId: session.metadata?.productId || '',
        transactionId: paymentIntent?.id || session.id,
        metadata: session.metadata || {},
      };
    } catch (error) {
      console.error('Payment verification failed:', error);
      throw new Error('Failed to verify payment');
    }
  }

  /**
   * Process Stripe webhooks
   */
  async processWebhook(input: ProcessWebhookInput): Promise<WebhookProcessingResult> {
    // Validate webhook signature
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(
        input.payload,
        input.signature,
        config.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw new Error('Invalid webhook signature');
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          return await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          
        case 'payment_intent.succeeded':
          return await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          
        case 'payment_intent.payment_failed':
          return await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          // Future subscription handling
          return {
            success: true,
            eventType: event.type,
            handled: false, // Not implemented yet
          };
          
        default:
          console.log(`Unhandled event type: ${event.type}`);
          return {
            success: true,
            eventType: event.type,
            handled: false,
          };
      }
    } catch (error) {
      console.error(`Webhook processing failed for ${event.type}:`, error);
      return {
        success: false,
        eventType: event.type,
        handled: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle successful checkout completion
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<WebhookProcessingResult> {
    const paymentRecord = await prisma.paymentRecord.findUnique({
      where: { stripeSessionId: session.id },
    });

    if (!paymentRecord) {
      throw new Error(`Payment record not found for session: ${session.id}`);
    }

    // Update payment record
    const updatedRecord = await prisma.paymentRecord.update({
      where: { id: paymentRecord.id },
      data: {
        status: 'COMPLETED',
        stripePaymentIntentId: session.payment_intent as string,
        stripeCustomerId: session.customer as string,
        paidAt: new Date(),
      },
    });

    // TODO: Trigger resume processing job here
    // This would create a background job to process the paid request

    return {
      success: true,
      eventType: 'checkout.session.completed',
      handled: true,
      paymentRecordId: updatedRecord.id,
    };
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<WebhookProcessingResult> {
    // Find payment record by payment intent ID
    const paymentRecord = await prisma.paymentRecord.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (paymentRecord) {
      await prisma.paymentRecord.update({
        where: { id: paymentRecord.id },
        data: { status: 'COMPLETED' },
      });
    }

    return {
      success: true,
      eventType: 'payment_intent.succeeded',
      handled: true,
      paymentRecordId: paymentRecord?.id,
    };
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<WebhookProcessingResult> {
    // Find payment record by payment intent ID
    const paymentRecord = await prisma.paymentRecord.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (paymentRecord) {
      await prisma.paymentRecord.update({
        where: { id: paymentRecord.id },
        data: { status: 'FAILED' },
      });
    }

    return {
      success: true,
      eventType: 'payment_intent.payment_failed',
      handled: true,
      paymentRecordId: paymentRecord?.id,
    };
  }

  /**
   * Get or create Stripe customer
   */
  private async getOrCreateCustomer(email: string): Promise<Stripe.Customer> {
    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0]!;
    }

    // Create new customer
    return await stripe.customers.create({
      email,
      metadata: {
        source: 'resume-vita',
        createdAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Create payment record in database
   */
  private async createPaymentRecord(data: {
    stripeSessionId: string;
    customerEmail: string;
    amount: number;
    currency: string;
    productType: string;
    productId: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
  }): Promise<void> {
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: data.customerEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: data.customerEmail,
          isFirstTime: false, // They're paying, so not first time
        },
      });
    }

    // Create payment record
    await prisma.paymentRecord.create({
      data: {
        userId: user.id,
        stripeSessionId: data.stripeSessionId,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        productType: data.productType,
        productId: data.productId,
        description: PRODUCT_CATALOG[data.productId as keyof typeof PRODUCT_CATALOG]?.description,
      },
    });
  }

  /**
   * Map Stripe status to our internal status
   */
  private mapStripeStatus(stripeStatus: string): 'pending' | 'succeeded' | 'failed' | 'canceled' {
    switch (stripeStatus) {
      case 'paid':
        return 'succeeded';
      case 'unpaid':
        return 'pending';
      case 'no_payment_required':
        return 'succeeded';
      default:
        return 'failed';
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    successRate: number;
    topProducts: Array<{ productId: string; count: number; revenue: number }>;
  }> {
    const stats = await prisma.paymentRecord.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
      _count: { id: true },
    });

    const totalTransactions = await prisma.paymentRecord.count();
    const successRate = totalTransactions > 0 ? (stats._count.id / totalTransactions) * 100 : 0;

    // Get top products
    const productStats = await prisma.paymentRecord.groupBy({
      by: ['productId'],
      where: { status: 'COMPLETED' },
      _count: { id: true },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    const topProducts = productStats.map(stat => ({
      productId: stat.productId,
      count: stat._count.id,
      revenue: stat._sum.amount || 0,
    }));

    return {
      totalRevenue: stats._sum.amount || 0,
      totalTransactions: stats._count.id,
      successRate,
      topProducts,
    };
  }

  /**
   * Process refund
   */
  async processRefund(paymentIntentId: string, amount?: number): Promise<{
    success: boolean;
    refundId: string;
    amount: number;
  }> {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount, // Partial refund if specified
      });

      // Update payment record
      await prisma.paymentRecord.updateMany({
        where: { stripePaymentIntentId: paymentIntentId },
        data: {
          status: amount ? 'PARTIAL_REFUND' : 'REFUNDED',
          refundedAt: new Date(),
        },
      });

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount,
      };
    } catch (error) {
      console.error('Refund processing failed:', error);
      throw new Error('Failed to process refund');
    }
  }

  /**
   * Health check for payment service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const start = Date.now();
    
    try {
      // Test Stripe API connectivity
      await stripe.balance.retrieve();
      
      return {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } catch (error) {
      console.error('Payment service health check failed:', error);
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
      };
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
export { PRODUCT_CATALOG };
export type { 
  CheckoutSessionResult,
  PaymentVerificationResult,
  WebhookProcessingResult,
  CreateCheckoutSessionInput 
};