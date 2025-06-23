import React, { useState } from 'react';
import { Target, Upload, FileText, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { UserFlowSelector } from './components/UserFlowSelector';
import { TemplateSelector } from './components/TemplateSelector';

// API configuration for new serverless architecture
const API_CONFIG = {
  PROCESS_RESUME_URL: '/api/process-resume',
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc',
    'text/plain': '.txt',
    'text/rtf': '.rtf',
    'application/rtf': '.rtf'
  }
};

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

// Template options - exact specification from ResumeSniper spec
const RESUME_TEMPLATES = [
  { 
    id: 'ats-optimized', 
    name: 'ATS Optimized', 
    icon: '⭐', 
    price: 0, 
    freeForFirstTime: true,
    description: 'Traditional structure, works for any industry',
    tier: 'free'
  },
  { 
    id: 'entry-clean', 
    name: 'Entry Clean', 
    icon: '✨', 
    price: 5.99, 
    description: 'Modern design for entry-level professionals',
    tier: 'entry'
  },
  { 
    id: 'tech-focus', 
    name: 'Tech Focus', 
    icon: '⚙️', 
    price: 7.99, 
    description: 'Optimized for IT and engineering roles',
    tier: 'professional'
  },
  { 
    id: 'professional-plus', 
    name: 'Professional Plus', 
    icon: '👁️', 
    price: 8.99, 
    description: 'Enhanced formatting for career growth',
    tier: 'premium'
  },
  { 
    id: 'executive-format', 
    name: 'Executive Format', 
    icon: '💼', 
    price: 9.99, 
    description: 'Premium design for senior leadership',
    tier: 'executive'
  }
];

function App() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [email, setEmail] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState('ats-optimized');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > API_CONFIG.MAX_FILE_SIZE) {
      showNotification('error', `File too large. Maximum size is ${API_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`);
      return false;
    }

    // Check file type
    const isValidType = Object.keys(API_CONFIG.ALLOWED_FILE_TYPES).includes(file.type) ||
                       Object.values(API_CONFIG.ALLOWED_FILE_TYPES).some(ext => 
                         file.name.toLowerCase().endsWith(ext)
                       );
    
    if (!isValidType) {
      showNotification('error', 'Please upload a PDF, DOCX, DOC, TXT, or RTF file');
      return false;
    }

    return true;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        
      if (validateFile(file)) {
        setResumeFile(file);
        showNotification('success', `${file.name} uploaded successfully`);
      }
    }
  };

  const handleSubmission = async () => {
    if (!resumeFile || !jobDescription.trim() || !email.trim()) {
      showNotification('error', 'Please upload your resume, paste the job description, and enter your email');
      return;
    }

    // Validate template selection for first-time users
    if (isFirstTime && selectedTemplate !== 'ats-optimized') {
      showNotification('error', 'First-time users can only select the FREE ATS Optimized template');
      setSelectedTemplate('ats-optimized');
      return;
    }

    setProcessing(true);
    setProgress(10);
    
    try {
      // Read resume file content
      const resumeText = await readFileContent(resumeFile);
      setProgress(25);
      
      // Send to new serverless API
      const response = await fetch(API_CONFIG.PROCESS_RESUME_URL, {
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

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  return (
    <div className="min-h-screen relative px-4 py-8 md:py-16">
      {notification && (
        <Notification 
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <header className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Target className="w-12 h-12 text-[#4a90a4] mr-4" />
            <h1 className="text-[#4a90a4] text-5xl md:text-6xl font-bold" style={{ fontFamily: 'Crimson Text, serif' }}>
              ResumeSniper
            </h1>
          </div>
          <p className="text-white text-2xl md:text-3xl font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
            AI-Powered Targeted Resumes to Beat ATS Systems
          </p>
          <div className="max-w-3xl mx-auto mb-8">
            <p className="text-gray-300 text-lg mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              I'm a Navy veteran with multiple degrees. During the pandemic, I was a business owner. 
              When I had to re-enter the job market, I found myself taking warehouse jobs just to survive week to week.
            </p>
            <p className="text-gray-300 text-lg mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              The problem? Every job application now requires a customized resume to get past ATS systems. 
              And honestly? I was too lazy to rewrite my resume 50 times.
            </p>
            <p className="text-[#4a90a4] text-lg font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
              So I built this tool to solve my own problem. Now it can solve yours too.
            </p>
          </div>
        </header>

        {/* Anti-BS Section */}
        <div className="text-center mb-12 p-8 bg-[#1a365d] bg-opacity-20 rounded-lg border border-[#4a90a4] border-opacity-30">
          <h2 className="text-white text-2xl font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
            Skip the Fake 5-Star Reviews
          </h2>
          <p className="text-gray-300 text-lg mb-4">
            Go to any site that wants to sell you something, and this is where you see five star reviews. 
            I don't trust them either.
          </p>
          <p className="text-[#4a90a4] text-lg font-medium">
            This is why I'm giving you one for free. See the proof for yourself.
          </p>
        </div>

        {/* User Flow Selection */}
        <UserFlowSelector isFirstTime={isFirstTime} setIsFirstTime={setIsFirstTime} />
          
        {/* Template Selection */}
        <TemplateSelector 
          templates={RESUME_TEMPLATES}
          selectedTemplate={selectedTemplate}
          onTemplateChange={setSelectedTemplate}
          isFirstTime={isFirstTime}
        />

        {/* Main Form */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          
          {/* Resume Upload */}
          <div className="input-container rounded-lg p-6">
            <label className="block text-[#4a90a4] text-xl font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              Step 2: Upload Your Resume
            </label>
            <div className="border-2 border-dashed border-[#4a90a4] border-opacity-30 rounded-lg p-8 text-center hover:border-opacity-50 transition-colors">
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
                    <p className="text-gray-400 text-sm">PDF, DOCX, or TXT files only</p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Job Description */}
          <div className="input-container rounded-lg p-6">
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
            Step 4: Enter Your Email
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
              className="resume-magician-button text-white text-xl px-16 py-6 rounded-lg flex items-center justify-center mx-auto space-x-4 transform hover:scale-105 transition-transform disabled:opacity-75 disabled:cursor-not-allowed disabled:transform-none"
              onClick={handleSubmission}
              disabled={processing}
            >
              <Zap className="w-6 h-6" />
              <FileText className="w-6 h-6" />
              <span className="font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>
                {processing ? 'WORKING MAGIC...' : 
                 isFirstTime ? 'GET FREE RESUME' : 
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
          <div className="bg-[#1a365d] bg-opacity-20 rounded-lg p-6 border border-[#4a90a4] border-opacity-30">
            <p className="text-gray-300 text-sm mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              <strong>This resume is AI-generated.</strong> Please review and edit as needed. AI can make mistakes - you know your experience best.
            </p>
            <p className="text-gray-400 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
              Files automatically deleted after 48 hours • Processing typically takes 30-60 seconds • Secure payments via Stripe
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;