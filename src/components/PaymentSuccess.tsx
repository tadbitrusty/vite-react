/**
 * PaymentSuccess Component
 * Displays success message after payment and provides next steps
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle, Mail, Download, ArrowLeft } from 'lucide-react';

interface PaymentSuccessProps {
  sessionId?: string;
}

export function PaymentSuccess({ sessionId }: PaymentSuccessProps) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Countdown to redirect back to main page
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl mx-auto text-center">
        
        {/* Success Icon */}
        <div className="mb-8">
          <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Crimson Text, serif' }}>
            Payment Successful!
          </h1>
          <p className="text-[#4a90a4] text-xl" style={{ fontFamily: 'Inter, sans-serif' }}>
            Your premium resume is being processed
          </p>
        </div>

        {/* Processing Status */}
        <div className="bg-[#1a365d] bg-opacity-20 rounded-lg p-8 border border-[#4a90a4] border-opacity-30 mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4a90a4] mr-4"></div>
            <span className="text-white text-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
              AI is optimizing your resume...
            </span>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center text-gray-300">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
              <span style={{ fontFamily: 'Inter, sans-serif' }}>Payment processed successfully</span>
            </div>
            <div className="flex items-center text-gray-300">
              <div className="w-5 h-5 border-2 border-[#4a90a4] rounded-full mr-3 animate-pulse"></div>
              <span style={{ fontFamily: 'Inter, sans-serif' }}>Analyzing job requirements</span>
            </div>
            <div className="flex items-center text-gray-300">
              <div className="w-5 h-5 border-2 border-gray-500 rounded-full mr-3"></div>
              <span className="text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>Optimizing resume content</span>
            </div>
            <div className="flex items-center text-gray-300">
              <div className="w-5 h-5 border-2 border-gray-500 rounded-full mr-3"></div>
              <span className="text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>Sending to your email</span>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-[#1a365d] bg-opacity-20 rounded-lg p-6 border border-[#4a90a4] border-opacity-30 mb-8">
          <h3 className="text-[#4a90a4] text-xl font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
            What happens next?
          </h3>
          
          <div className="space-y-3 text-left">
            <div className="flex items-start">
              <Mail className="w-5 h-5 text-[#4a90a4] mr-3 mt-1" />
              <div>
                <p className="text-white font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Check your email (2-3 minutes)
                </p>
                <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Your optimized resume will be delivered with formatting instructions
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Download className="w-5 h-5 text-[#4a90a4] mr-3 mt-1" />
              <div>
                <p className="text-white font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Copy and format your resume
                </p>
                <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Paste into Word/Google Docs and apply the premium template styling
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-[#4a90a4] mr-3 mt-1" />
              <div>
                <p className="text-white font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Apply with confidence
                </p>
                <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Your resume is now optimized to beat ATS systems
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Session Info */}
        {sessionId && (
          <div className="text-center mb-6">
            <p className="text-gray-400 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
              Transaction ID: {sessionId.slice(-8)}
            </p>
          </div>
        )}

        {/* Return Button */}
        <div className="text-center">
          <button
            onClick={() => window.location.href = '/'}
            className="inline-flex items-center text-[#4a90a4] hover:text-white transition-colors"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to ResumeSniper ({countdown}s)
          </button>
        </div>

        {/* Support */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
            Questions? Contact us at{' '}
            <a href="mailto:support@resumevita.com" className="text-[#4a90a4] hover:text-white">
              support@resumevita.com
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}

export default PaymentSuccess;