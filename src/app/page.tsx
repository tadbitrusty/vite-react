'use client';

import React, { useState } from 'react';
import { Target, Upload, Plus, Zap, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { UserFlowSelector, TemplateSelector } from '@/components';
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
    info: <FileText className="w-5 h-5 text-blue-400" />
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

export default function Home() {
  const [currentView, setCurrentView] = useState<'optimizer' | 'builder'>('optimizer');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [email, setEmail] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(true); // Always true now - aligned with transparent brand approach
  const [selectedTemplate, setSelectedTemplate] = useState('ats-optimized');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSubmission = async () => {
    if (!resumeFile || !jobDescription.trim() || !email.trim()) {
      showNotification('error', 'Please upload your resume, paste the job description, and enter your email');
      return;
    }

    setProcessing(true);
    setProgress(10);
    
    try {
      // Read resume file content
      const resumeText = await readFileContent(resumeFile);
      setProgress(25);
      
      // Send to new serverless API
      const response = await fetch(API_ENDPOINTS.PROCESS_RESUME, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          resumeContent: resumeText,
          jobDescription: jobDescription.trim(),
          fileName: resumeFile.name,
          template: selectedTemplate,
          isFirstTimeFlow: isFirstTime
        })
      });

      const result = await response.json();
      setProgress(75);
      
      if (result.success) {
        setProgress(100);
        showNotification('success', `Success! ${result.message}`);
        // Clear form
        setResumeFile(null);
        setJobDescription('');
        setEmail('');
        setSelectedTemplate('ats-optimized');
      } else if (result.requires_payment && result.payment_url) {
        // Redirect to Stripe payment
        setProgress(100);
        showNotification('info', 'Redirecting to payment...');
        setTimeout(() => {
          window.location.href = result.payment_url;
        }, 1000);
      } else {
        showNotification('error', `Error: ${result.message || 'Processing failed'}`);
      }
    } catch (error) {
      console.error('Submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process resume. Please try again.';
      showNotification('error', errorMessage);
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const readFileContent = async (file: File): Promise<string> => {
    console.log(`[FRONTEND] Processing file: ${file.name} (${file.type})`);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = function(event) {
        const result = event.target?.result;
        if (typeof result === 'string') {
          console.log(`[FRONTEND] File processed successfully, size: ${result.length}`);
          resolve(result);
        } else {
          reject(new Error('FileReader returned unexpected result type'));
        }
      };
      
      reader.onerror = function() {
        console.error('[FRONTEND] File reading failed');
        reject(new Error('Failed to read file'));
      };
      
      // Use readAsDataURL for all file types - this is the standard, supported method
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setResumeFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Validate file type
      if (file.type === 'application/pdf' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.type === 'text/plain') {
        setResumeFile(file);
      } else {
        showNotification('error', 'Please upload a PDF, DOCX, or TXT file');
      }
    }
  };

  return (
    <div className="min-h-screen relative px-4 py-8 md:py-16 gradient-bg">
      {notification && (
        <Notification 
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="max-w-5xl mx-auto">
        
        {/* Hero Section */}
        <header className="text-center mb-16 pt-8">
          <h1 className="text-white text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'Crimson Text, serif' }}>
            Breathing Life Into Your Resume
          </h1>
          <div className="max-w-3xl mx-auto mb-8">
            <p className="text-gray-300 text-lg mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              I'm an engineer with multiple degrees and skills gathered over a lifetime. My original goal was to help working people succeed. But I discovered that HR systems are designed to filter out qualified candidates - 75% get passed over because their resume doesn't have the exact keywords.
            </p>
            <p className="text-[#4a90a4] text-lg font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
              So I built this tool to give working professionals that extra edge, without having to rewrite your resume for every job. I made it as easy and affordable as possible, because everyone deserves a fair shot at their dream job.
            </p>
          </div>
        </header>

        {/* Transparent Approach Section */}
        <div className="text-center mb-12 p-8 card-gradient rounded-lg">
          <h2 className="text-white text-2xl font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
            No BS. No Fake Reviews. Just Proof.
          </h2>
          <p className="text-gray-300 text-lg mb-4">
            I spent time and money developing this tool. Instead of fake testimonials, 
            I'm giving you one resume for free as proof it works.
          </p>
          <p className="text-[#4a90a4] text-lg font-medium">
            See the quality for yourself. Then decide if it's worth paying for premium templates.
          </p>
        </div>

        {/* Need a Resume? Section */}
        <div className="text-center mb-12">
          <div className="card-gradient rounded-lg p-6 max-w-md mx-auto">
            <h3 className="text-white text-xl font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              Don't Have a Resume?
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Build a professional resume from scratch in under an hour
            </p>
            <button
              onClick={() => window.location.href = '/builder'}
              className="bg-gradient-to-r from-[#4a90a4] to-[#5ba0b5] text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center mx-auto space-x-2 transform hover:scale-105 transition-transform"
            >
              <Plus className="w-5 h-5" />
              <span>Need a Resume?</span>
            </button>
          </div>
        </div>

        {/* User Flow Selection - REMOVED per SLA brand alignment requirements */}
          
        {/* Template Selection */}
        <TemplateSelector 
          templates={RESUME_TEMPLATES}
          selectedTemplate={selectedTemplate}
          onTemplateChange={setSelectedTemplate}
          isFirstTime={isFirstTime}
        />

        {/* Format Support Message */}
        <div className="text-center mb-8">
          <div className="max-w-2xl mx-auto bg-green-900 bg-opacity-20 border border-green-600 rounded-lg p-4">
            <p className="text-green-200 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
              ✅ <strong>All formats working perfectly!</strong> If you experience any format issues, please try a different format. Currently supported: PDF, DOCX, DOC, TXT, and RTF files.
            </p>
          </div>
        </div>

        {/* Main Form */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          
          {/* Resume Upload */}
          <div className="card-gradient rounded-lg p-6">
            <label className="block text-[#4a90a4] text-xl font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              Step 2: Upload Your Resume
            </label>
            <div 
              className="border-2 border-dashed border-[#4a90a4] border-opacity-30 rounded-lg p-8 text-center hover:border-opacity-50 transition-colors"
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
                id="resume-upload"
              />
              <label htmlFor="resume-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-[#4a90a4] mx-auto mb-4" />
                {resumeFile ? (
                  <p className="text-white text-lg">{resumeFile.name}</p>
                ) : (
                  <>
                    <p className="text-white text-lg mb-2">Click to upload resume</p>
                    <p className="text-gray-400 text-sm mb-1">or drag and drop here</p>
                    <p className="text-gray-400 text-sm">PDF, DOCX, or TXT files only</p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Job Description */}
          <div className="card-gradient rounded-lg p-6">
            <label className="block text-[#4a90a4] text-xl font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              Step 3: Paste Job Description
            </label>
            <textarea
              className="w-full h-48 bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-4 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors resize-none"
              placeholder="Paste the complete job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
          </div>
        </div>

        {/* Email Input */}
        <div className="max-w-md mx-auto mb-8">
          <label className="block text-[#4a90a4] text-xl font-semibold mb-4 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
            Step 4: Your Email
          </label>
          <input
            type="email"
            className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-4 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors text-center"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ fontFamily: 'Inter, sans-serif' }}
          />
        </div>

        {/* Magic Button */}
        <div className="text-center mb-12">
          <p className="text-gray-300 text-lg mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
            Step 5: If you can count to five, this app will be easy to use
          </p>
          <div className="relative">
            <button 
              className="btn-primary text-xl px-16 py-6 flex items-center justify-center mx-auto space-x-4 transform hover:scale-105 transition-transform disabled:opacity-75 disabled:cursor-not-allowed disabled:transform-none"
              onClick={handleSubmission}
              disabled={processing}
            >
              <Zap className="w-6 h-6" />
              <FileText className="w-6 h-6" />
              <span className="font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>
                {processing ? 'WORKING MAGIC...' : 
                 selectedTemplate === 'ats-optimized' ? 'GET FREE PROOF RESUME' : 
                 `PAY $${RESUME_TEMPLATES.find(t => t.id === selectedTemplate)?.price || 0} & PROCESS`}
              </span>
            </button>
            {processing && (
              <div className="mt-4">
                <div className="w-full bg-[#1a365d] bg-opacity-30 rounded-full h-2 mb-2">
                  <div 
                    className="bg-gradient-to-r from-[#4a90a4] to-[#5ba0b5] h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-[#4a90a4] text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {progress < 30 ? 'Uploading resume...' : 
                   progress < 80 ? 'AI processing your resume...' : 
                   'Finalizing optimization...'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="max-w-3xl mx-auto text-center">
          <div className="card-gradient rounded-lg p-6">
            <p className="text-gray-300 text-sm mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              <strong>This resume is AI-generated.</strong> Please review and edit as needed. AI can make mistakes - you know your experience best.
            </p>
            <p className="text-gray-400 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
              Files automatically deleted after 48 hours • Processing typically takes 30-60 seconds • Secure payments via Stripe
            </p>
            <div className="mt-2 text-center">
              <a 
                href="/admin/login" 
                className="text-gray-600 hover:text-[#4a90a4] transition-colors text-xs"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Site Admin
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}