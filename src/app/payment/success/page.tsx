'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Target, CheckCircle, Download, Mail, Home, AlertCircle } from 'lucide-react';
import { RESUME_TEMPLATES } from '@/constants';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [resumeStatus, setResumeStatus] = useState<'processing' | 'completed' | 'error'>('processing');
  const [processingTime, setProcessingTime] = useState(0);
  
  // Get payment details from URL parameters
  const sessionId = searchParams.get('session_id');
  const templateId = searchParams.get('template') || '';
  const email = searchParams.get('email') || '';
  
  const template = RESUME_TEMPLATES.find(t => t.id === templateId);

  useEffect(() => {
    if (!sessionId || !templateId || !email) {
      router.push('/');
      return;
    }

    // Start processing timer
    const timer = setInterval(() => {
      setProcessingTime(prev => prev + 1);
    }, 1000);

    // Simulate resume processing (webhook handles actual processing)
    const processingTimeout = setTimeout(() => {
      setResumeStatus('completed');
      clearInterval(timer);
    }, 30000); // 30 seconds typical processing time

    return () => {
      clearInterval(timer);
      clearTimeout(processingTimeout);
    };
  }, [sessionId, templateId, email, router]);

  const handleGoHome = () => {
    router.push('/');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!template) {
    return null;
  }

  return (
    <div className="min-h-screen relative px-4 py-8 md:py-16 gradient-bg">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <Target className="w-8 h-8 text-[#4a90a4] mr-3" />
            <h1 className="text-[#4a90a4] text-3xl md:text-4xl font-bold" style={{ fontFamily: 'Crimson Text, serif' }}>
              Resume Vita
            </h1>
          </div>
        </header>

        {/* Success Card */}
        <div className="card-gradient rounded-lg p-8 border border-[#4a90a4] border-opacity-30">
          
          {/* Success Icon */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-500 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-white text-2xl font-bold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              Payment Successful!
            </h2>
            <p className="text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
              Thank you for your purchase. Your resume is being generated.
            </p>
          </div>

          {/* Order Details */}
          <div className="mb-8 p-6 bg-[#1a365d] bg-opacity-30 rounded-lg">
            <h3 className="text-[#4a90a4] text-lg font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              Order Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>Template:</p>
                <p className="text-white font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>{template.name}</p>
              </div>
              <div>
                <p className="text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>Amount Paid:</p>
                <p className="text-white font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>${template.price}</p>
              </div>
              <div>
                <p className="text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>Email:</p>
                <p className="text-white font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>{email}</p>
              </div>
              <div>
                <p className="text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>Transaction ID:</p>
                <p className="text-white font-medium text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>{sessionId}</p>
              </div>
            </div>
          </div>

          {/* Processing Status */}
          <div className="mb-8 p-6 bg-blue-900 bg-opacity-20 rounded-lg border border-blue-500 border-opacity-30">
            {resumeStatus === 'processing' && (
              <>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <h3 className="text-blue-400 font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Generating Your Resume
                  </h3>
                </div>
                <p className="text-gray-300 text-sm mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Our AI is optimizing your resume for the job description you provided.
                </p>
                <p className="text-blue-400 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Processing time: {formatTime(processingTime)}
                </p>
              </>
            )}

            {resumeStatus === 'completed' && (
              <>
                <div className="flex items-center space-x-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <h3 className="text-green-400 font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Resume Generated Successfully!
                  </h3>
                </div>
                <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Your optimized resume has been sent to your email address.
                </p>
              </>
            )}

            {resumeStatus === 'error' && (
              <>
                <div className="flex items-center space-x-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <h3 className="text-red-400 font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Processing Issue
                  </h3>
                </div>
                <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  There was an issue generating your resume. Please check your email or contact support.
                </p>
              </>
            )}
          </div>

          {/* Next Steps */}
          <div className="mb-8 p-6 bg-[#1a365d] bg-opacity-20 rounded-lg">
            <h3 className="text-white font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              What Happens Next?
            </h3>
            <ul className="space-y-2 text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
              <li className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-[#4a90a4]" />
                <span>Your resume will be emailed to {email} within 2-3 minutes</span>
              </li>
              <li className="flex items-center space-x-2">
                <Download className="w-4 h-4 text-[#4a90a4]" />
                <span>Download the PDF attachment and start applying to jobs</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-[#4a90a4]" />
                <span>Your resume is optimized for Applicant Tracking Systems (ATS)</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleGoHome}
              className="flex-1 bg-gradient-to-r from-[#4a90a4] to-[#5ba0b5] text-white font-bold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <Home className="w-5 h-5" />
              <span>Return to Home</span>
            </button>
          </div>

          {/* Support Info */}
          <div className="mt-8 text-center">
            <p className="text-gray-400 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
              Need help? Contact support if you don't receive your resume within 5 minutes.<br/>
              Keep this page open for reference - your transaction ID is above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentSuccessLoading() {
  return (
    <div className="min-h-screen relative px-4 py-8 md:py-16 gradient-bg flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center mb-6">
          <Target className="w-8 h-8 text-[#4a90a4] mr-3" />
          <h1 className="text-[#4a90a4] text-3xl md:text-4xl font-bold" style={{ fontFamily: 'Crimson Text, serif' }}>
            Resume Vita
          </h1>
        </div>
        <div className="w-8 h-8 border-2 border-[#4a90a4] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
          Loading payment confirmation...
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PaymentSuccessLoading />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}