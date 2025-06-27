'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Target, CreditCard, Shield, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { RESUME_TEMPLATES, API_ENDPOINTS } from '@/constants';

interface NotificationProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}

function Notification({ type, message, onClose }: NotificationProps) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-[#4a90a4]" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    info: <CreditCard className="w-5 h-5 text-blue-400" />
  };

  const bgColors = {
    success: 'bg-[#1a365d] border-[#4a90a4]',
    error: 'bg-red-900 border-red-500',
    info: 'bg-blue-900 border-blue-500'
  };

  return (
    <div className={`fixed top-4 right-4 max-w-md p-4 rounded-lg border flex items-center space-x-3 z-50 text-white ${bgColors[type]}`}>
      {icons[type]}
      <span className="flex-1" style={{ fontFamily: 'Inter, sans-serif' }}>{message}</span>
      <button 
        onClick={onClose}
        className="text-gray-400 hover:text-white transition-colors ml-2"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  
  // Get payment details from URL parameters
  const templateId = searchParams.get('template') || 'professional-plus';
  const email = searchParams.get('email') || '';
  const resumeData = searchParams.get('resumeData') || '';
  const jobDescription = searchParams.get('jobDescription') || '';
  
  const template = RESUME_TEMPLATES.find(t => t.id === templateId);
  
  useEffect(() => {
    if (!template || !email) {
      router.push('/');
    }
  }, [template, email, router]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handlePayment = async () => {
    if (!template || !email) {
      showNotification('error', 'Missing payment information. Please start over.');
      return;
    }

    setLoading(true);
    console.log(`[PAYMENT] Initiating checkout for template: ${templateId}, email: ${email}`);

    try {
      // Create Stripe checkout session
      const response = await fetch(API_ENDPOINTS.CREATE_CHECKOUT_SESSION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId,
          email,
          resumeData,
          jobDescription,
          successUrl: `${window.location.origin}/payment/success`,
          cancelUrl: `${window.location.origin}/payment`
        })
      });

      const result = await response.json();
      
      if (result.success && result.checkoutUrl) {
        console.log(`[PAYMENT] Redirecting to Stripe checkout: ${result.sessionId}`);
        showNotification('info', 'Redirecting to secure payment...');
        
        // Redirect to Stripe Checkout
        window.location.href = result.checkoutUrl;
      } else {
        console.error('[PAYMENT] Checkout session creation failed:', result.message);
        showNotification('error', result.message || 'Failed to create payment session');
      }
    } catch (error) {
      console.error('[PAYMENT] Payment initiation error:', error);
      showNotification('error', 'Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    router.push('/');
  };

  if (!template) {
    return null;
  }

  return (
    <div className="min-h-screen relative px-4 py-8 md:py-16 gradient-bg">
      {notification && (
        <Notification 
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <Target className="w-8 h-8 text-[#4a90a4] mr-3" />
            <h1 className="text-[#4a90a4] text-3xl md:text-4xl font-bold" style={{ fontFamily: 'Crimson Text, serif' }}>
              Resume Vita
            </h1>
          </div>
          <p className="text-white text-xl font-semibold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            Secure Payment
          </p>
          <p className="text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
            Complete your purchase to generate your premium resume
          </p>
        </header>

        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={handleGoBack}
            className="flex items-center space-x-2 text-[#4a90a4] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span style={{ fontFamily: 'Inter, sans-serif' }}>Back to Resume Builder</span>
          </button>
        </div>

        {/* Payment Card */}
        <div className="card-gradient rounded-lg p-8 border border-[#4a90a4] border-opacity-30">
          
          {/* Template Details */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>
                {template.name}
              </h2>
              <div className="text-right">
                <p className="text-[#4a90a4] text-3xl font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>
                  ${template.price}
                </p>
                <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  One-time payment
                </p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              {template.description}
            </p>
            
            <div className="bg-[#1a365d] bg-opacity-30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                What's Included:
              </h3>
              <ul className="text-gray-300 space-y-1 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                <li>• AI-optimized resume for your specific job</li>
                <li>• ATS-friendly formatting</li>
                <li>• Professional design and layout</li>
                <li>• Instant PDF download</li>
                <li>• Email delivery within minutes</li>
              </ul>
            </div>
          </div>

          {/* User Info */}
          <div className="mb-8 p-4 bg-[#1a365d] bg-opacity-20 rounded-lg border border-[#4a90a4] border-opacity-20">
            <h3 className="text-[#4a90a4] font-semibold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              Delivery Information:
            </h3>
            <p className="text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
              <strong>Email:</strong> {email}
            </p>
            <p className="text-gray-300 text-sm mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
              Your resume will be delivered to this email address
            </p>
          </div>

          {/* Security Notice */}
          <div className="mb-8 p-4 bg-green-900 bg-opacity-20 rounded-lg border border-green-500 border-opacity-30">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-4 h-4 text-green-400" />
              <h3 className="text-green-400 font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
                Secure Payment
              </h3>
            </div>
            <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
              Payments are processed securely by Stripe. We never store your payment information.
            </p>
          </div>

          {/* Payment Button */}
          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#4a90a4] to-[#5ba0b5] text-white font-bold py-4 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                <span>Pay ${template.price} & Generate Resume</span>
              </>
            )}
          </button>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
              By completing this purchase, you agree to our terms of service.<br/>
              Resume generation typically takes 30-60 seconds after payment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}