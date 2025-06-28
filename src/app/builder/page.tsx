'use client';

import React, { useState } from 'react';
import { Target, CheckCircle, AlertCircle, Upload, FileText } from 'lucide-react';
import Link from 'next/link';
import { RESUME_BUILDER_PRICING, API_ENDPOINTS, FILE_CONFIG } from '@/constants';

interface NotificationProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}

function Notification({ type, message, onClose }: NotificationProps) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-[#4a90a4]" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    info: <AlertCircle className="w-5 h-5 text-blue-400" />
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

export default function ResumeBuilder() {
  const [selectedTier, setSelectedTier] = useState<'BASIC' | 'ENHANCED'>('BASIC');
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(true);
  const [formData, setFormData] = useState({
    personalInfo: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
    },
    summary: '',
    experience: [
      {
        company: '',
        title: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        description: '',
      },
    ],
    education: [
      {
        school: '',
        degree: '',
        location: '',
        graduationDate: '',
        gpa: '',
      },
    ],
    skills: [] as string[],
  });

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!Object.keys(FILE_CONFIG.ALLOWED_TYPES).includes(file.type)) {
      showNotification('error', 'Please upload a PDF, DOCX, or TXT file');
      return;
    }

    // Validate file size
    if (file.size > FILE_CONFIG.MAX_SIZE) {
      showNotification('error', 'File size must be less than 10MB');
      return;
    }

    setUploadedFile(file);
    setIsParsing(true);

    try {
      // Read file content
      const fileContent = await readFileContent(file);
      
      // Send to parsing API
      const response = await fetch(API_ENDPOINTS.PARSE_RESUME, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeContent: fileContent
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Auto-fill the form with parsed data
        const parsedData = result.data;
        setFormData({
          personalInfo: {
            fullName: parsedData.personalInfo?.fullName || '',
            email: parsedData.personalInfo?.email || '',
            phone: parsedData.personalInfo?.phone || '',
            location: parsedData.personalInfo?.location || '',
            linkedin: parsedData.personalInfo?.linkedin || '',
            github: parsedData.personalInfo?.github || '',
          },
          summary: parsedData.summary || '',
          experience: parsedData.experience?.length > 0 ? parsedData.experience.map((exp: any) => ({
            company: exp.company || '',
            title: exp.title || '',
            location: exp.location || '',
            startDate: exp.startDate || '',
            endDate: exp.endDate || '',
            current: exp.current || false,
            description: exp.description || '',
          })) : formData.experience,
          education: parsedData.education?.length > 0 ? parsedData.education.map((edu: any) => ({
            school: edu.school || '',
            degree: edu.degree || '',
            location: edu.location || '',
            graduationDate: edu.graduationDate || '',
            gpa: edu.gpa || '',
          })) : formData.education,
          skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
        });
        
        showNotification('success', 'Resume parsed successfully! Review and edit the auto-filled information below.');
        setShowUploadSection(false);
      } else {
        // Enhanced error handling for different file types
        const fileType = file.type.includes('pdf') ? 'PDF' : 
                        file.type.includes('word') || file.type.includes('document') ? 'DOCX' : 
                        'text';
        const errorMsg = result.message || `Failed to parse ${fileType} resume`;
        
        if (fileType === 'DOCX' && errorMsg.includes('processing')) {
          showNotification('error', 'DOCX processing failed. Try saving your resume as PDF and uploading that instead.');
        } else {
          showNotification('error', errorMsg);
        }
      }
    } catch (error) {
      console.error('Resume parsing error:', error);
      const fileType = file.type.includes('pdf') ? 'PDF' : 
                      file.type.includes('word') || file.type.includes('document') ? 'DOCX' : 
                      'text';
      
      if (fileType === 'DOCX') {
        showNotification('error', 'DOCX file processing failed. Please try saving as PDF or check file integrity.');
      } else {
        showNotification('error', 'Failed to parse resume. Please try again.');
      }
    } finally {
      setIsParsing(false);
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.personalInfo.fullName || !formData.personalInfo.email || !formData.personalInfo.phone || !formData.personalInfo.location) {
      showNotification('error', 'Please fill in all required personal information fields');
      return;
    }

    if (!formData.summary.trim()) {
      showNotification('error', 'Please provide a professional summary');
      return;
    }

    if (formData.experience.some(exp => !exp.company || !exp.title || !exp.description)) {
      showNotification('error', 'Please complete all work experience fields');
      return;
    }

    setIsProcessing(true);
    
    try {
      const response = await fetch(API_ENDPOINTS.BUILD_RESUME, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalInfo: formData.personalInfo,
          summary: formData.summary,
          experience: formData.experience,
          education: formData.education,
          skills: formData.skills,
          tier: selectedTier
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showNotification('success', `${result.message} Check your email for the PDF!`);
        // Reset form
        setFormData({
          personalInfo: {
            fullName: '',
            email: '',
            phone: '',
            location: '',
            linkedin: '',
            github: '',
          },
          summary: '',
          experience: [
            {
              company: '',
              title: '',
              location: '',
              startDate: '',
              endDate: '',
              current: false,
              description: '',
            },
          ],
          education: [
            {
              school: '',
              degree: '',
              location: '',
              graduationDate: '',
              gpa: '',
            },
          ],
          skills: [],
        });
        setSelectedTier('BASIC');
      } else {
        showNotification('error', result.message || 'Failed to generate resume. Please try again.');
      }
    } catch (error) {
      console.error('Resume generation error:', error);
      showNotification('error', 'Failed to generate resume. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const addExperience = () => {
    setFormData({
      ...formData,
      experience: [
        {
          company: '',
          title: '',
          location: '',
          startDate: '',
          endDate: '',
          current: false,
          description: '',
        },
        ...formData.experience,
      ],
    });
  };

  const addEducation = () => {
    setFormData({
      ...formData,
      education: [
        {
          school: '',
          degree: '',
          location: '',
          graduationDate: '',
          gpa: '',
        },
        ...formData.education,
      ],
    });
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
      
      // Validate file type using the same logic as handleFileUpload
      if (!Object.keys(FILE_CONFIG.ALLOWED_TYPES).includes(file.type)) {
        showNotification('error', 'Please upload a PDF, DOCX, or TXT file');
        return;
      }

      // Validate file size
      if (file.size > FILE_CONFIG.MAX_SIZE) {
        showNotification('error', 'File size must be less than 10MB');
        return;
      }

      // Create a synthetic event to reuse the existing handleFileUpload logic
      const syntheticEvent = {
        target: { files: [file] }
      } as React.ChangeEvent<HTMLInputElement>;
      
      handleFileUpload(syntheticEvent);
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
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <header className="text-center mb-16 pt-8">
          <h1 className="text-[#4a90a4] text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: 'Crimson Text, serif' }}>
            Resume Builder
          </h1>
          <p className="text-white text-xl md:text-2xl font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
            Build Your Professional Resume
          </p>
        </header>

        {/* How to Use Instructions */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="card-gradient rounded-lg p-8 border border-[#4a90a4] border-opacity-30">
            <h2 className="text-[#4a90a4] text-2xl font-bold mb-6 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
              How to Use Resume Builder
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#4a90a4] bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-white font-semibold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                  1. Fill Out Your Information
                </h3>
                <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Complete the form with your personal details, work experience, education, and skills. The more complete your information, the better your resume will be.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-[#4a90a4] bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="text-white font-semibold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                  2. Choose Your Package
                </h3>
                <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Select Basic ($45) for clean professional formatting, or Enhanced ($75) for AI-optimized content with keyword enhancement.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-[#4a90a4] bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📧</span>
                </div>
                <h3 className="text-white font-semibold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                  3. Receive Your Resume
                </h3>
                <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Your professionally formatted resume will be emailed to you as a PDF within minutes. Ready to use for job applications!
                </p>
              </div>
            </div>

            <div className="bg-[#1a365d] bg-opacity-30 rounded-lg p-6 border border-[#4a90a4] border-opacity-20">
              <h4 className="text-[#4a90a4] font-semibold mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                💡 Pro Tips for Best Results:
              </h4>
              <ul className="text-gray-300 text-sm space-y-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                <li>• <strong>Be specific with job descriptions:</strong> Include quantifiable achievements (e.g., "Increased sales by 25%")</li>
                <li>• <strong>Use action verbs:</strong> Started, managed, developed, implemented, achieved</li>
                <li>• <strong>Include relevant skills:</strong> Match skills to your target job requirements</li>
                <li>• <strong>Keep it current:</strong> Focus on the last 10-15 years of experience</li>
                <li>• <strong>Enhanced package advantage:</strong> AI will optimize your content and add industry-specific keywords</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Pricing Selection */}
        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="text-[#4a90a4] text-2xl font-bold mb-8 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
            Choose Your Resume Builder Package
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Basic Package */}
            <div 
              className={`cursor-pointer border-2 rounded-lg p-6 transition-all transform hover:scale-105 ${
                selectedTier === 'BASIC' 
                  ? 'border-[#4a90a4] bg-[#1a365d] bg-opacity-30 shadow-lg scale-105' 
                  : 'border-gray-600 bg-[#1a365d] bg-opacity-10 hover:border-[#4a90a4]'
              }`}
              onClick={() => setSelectedTier('BASIC')}
            >
              {selectedTier === 'BASIC' && (
                <div className="absolute -top-2 -right-2 bg-[#4a90a4] text-white text-xs px-2 py-1 rounded-full font-bold">
                  ✓ SELECTED
                </div>
              )}
              
              <div className="text-center mb-4">
                <div className="text-4xl mb-3">📄</div>
                <h3 className="text-[#4a90a4] text-2xl font-bold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                  ${RESUME_BUILDER_PRICING.BASIC.price}
                </h3>
                <h4 className="text-white text-xl font-semibold mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {RESUME_BUILDER_PRICING.BASIC.name}
                </h4>
                <p className="text-gray-300 text-sm mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {RESUME_BUILDER_PRICING.BASIC.description}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-gray-300 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#4a90a4] mr-2" />
                  <span>Professional formatting and layout</span>
                </div>
                <div className="flex items-center text-gray-300 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#4a90a4] mr-2" />
                  <span>Clean, modern design</span>
                </div>
                <div className="flex items-center text-gray-300 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#4a90a4] mr-2" />
                  <span>ATS-friendly structure</span>
                </div>
                <div className="flex items-center text-gray-300 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#4a90a4] mr-2" />
                  <span>Instant PDF delivery via email</span>
                </div>
              </div>
            </div>

            {/* Enhanced Package */}
            <div 
              className={`cursor-pointer border-2 rounded-lg p-6 transition-all transform hover:scale-105 relative ${
                selectedTier === 'ENHANCED' 
                  ? 'border-[#4a90a4] bg-[#1a365d] bg-opacity-30 shadow-lg scale-105' 
                  : 'border-gray-600 bg-[#1a365d] bg-opacity-10 hover:border-[#4a90a4]'
              }`}
              onClick={() => setSelectedTier('ENHANCED')}
            >
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#4a90a4] to-[#5ba0b5] text-white text-xs px-4 py-1 rounded-full font-bold">
                MOST POPULAR
              </div>
              
              {selectedTier === 'ENHANCED' && (
                <div className="absolute -top-2 -right-2 bg-[#4a90a4] text-white text-xs px-2 py-1 rounded-full font-bold">
                  ✓ SELECTED
                </div>
              )}
              
              <div className="text-center mb-4 mt-2">
                <div className="text-4xl mb-3">✨</div>
                <h3 className="text-[#4a90a4] text-2xl font-bold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                  ${RESUME_BUILDER_PRICING.ENHANCED.price}
                </h3>
                <h4 className="text-white text-xl font-semibold mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {RESUME_BUILDER_PRICING.ENHANCED.name}
                </h4>
                <p className="text-gray-300 text-sm mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {RESUME_BUILDER_PRICING.ENHANCED.description}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-gray-300 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#4a90a4] mr-2" />
                  <span>Everything in Basic package</span>
                </div>
                <div className="flex items-center text-gray-300 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#4a90a4] mr-2" />
                  <span>AI-enhanced content optimization</span>
                </div>
                <div className="flex items-center text-gray-300 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#4a90a4] mr-2" />
                  <span>Industry-specific keyword integration</span>
                </div>
                <div className="flex items-center text-gray-300 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#4a90a4] mr-2" />
                  <span>Advanced ATS optimization</span>
                </div>
                <div className="flex items-center text-gray-300 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#4a90a4] mr-2" />
                  <span>Enhanced formatting and styling</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resume Upload Section */}
        {showUploadSection && (
          <div className="max-w-4xl mx-auto mb-12">
            <div className="card-gradient rounded-lg p-8 border border-[#4a90a4] border-opacity-30">
              <h2 className="text-[#4a90a4] text-2xl font-bold mb-6 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
                Upload Existing Resume (Optional)
              </h2>
              
              <div className="text-center mb-6">
                <p className="text-gray-300 text-lg mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Have an existing resume? Upload it to auto-fill your information and save time!
                </p>
                <p className="text-gray-400 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Supports PDF, DOCX, and TXT files up to 10MB. You can edit all auto-filled content and add new information.
                </p>
              </div>

              <div className="max-w-md mx-auto">
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
                    disabled={isParsing}
                  />
                  <label htmlFor="resume-upload" className={`cursor-pointer ${isParsing ? 'cursor-not-allowed opacity-50' : ''}`}>
                    {isParsing ? (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-[#4a90a4] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-[#4a90a4] text-lg font-semibold">Parsing your resume...</p>
                        <p className="text-gray-400 text-sm mt-2">This may take up to 30 seconds</p>
                      </div>
                    ) : uploadedFile ? (
                      <div className="flex flex-col items-center">
                        <FileText className="w-12 h-12 text-[#4a90a4] mb-4" />
                        <p className="text-white text-lg font-semibold">{uploadedFile.name}</p>
                        <p className="text-gray-400 text-sm mt-2">Click to upload a different file</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-12 h-12 text-[#4a90a4] mb-4" />
                        <p className="text-white text-lg font-semibold mb-2">Click to upload your resume</p>
                        <p className="text-gray-400 text-sm">or drag and drop here</p>
                        <p className="text-gray-500 text-xs mt-2">PDF, DOCX, or TXT files only</p>
                      </div>
                    )}
                  </label>
                </div>
                
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setShowUploadSection(false)}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Skip and fill manually →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resume Upload Success */}
        {!showUploadSection && uploadedFile && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-green-900 bg-opacity-30 border border-green-500 border-opacity-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  <div>
                    <p className="text-green-400 font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Resume uploaded and parsed: {uploadedFile.name}
                    </p>
                    <p className="text-green-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Information has been auto-filled below. Review, edit, and add any new details.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUploadSection(true);
                    setUploadedFile(null);
                  }}
                  className="text-green-400 hover:text-green-300 text-sm"
                >
                  Upload Different File
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="card-gradient rounded-lg p-8">
          <form className="space-y-8" onSubmit={handleFormSubmit}>
            
            {/* Personal Information */}
            <section>
              <h3 className="text-[#4a90a4] text-2xl font-semibold mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                Personal Information
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                    placeholder="John Doe"
                    value={formData.personalInfo.fullName}
                    onChange={(e) => setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo, fullName: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-white mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                    placeholder="john@example.com"
                    value={formData.personalInfo.email}
                    onChange={(e) => setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo, email: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-white mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Phone *
                  </label>
                  <input
                    type="tel"
                    className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                    placeholder="(555) 123-4567"
                    value={formData.personalInfo.phone}
                    onChange={(e) => setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo, phone: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-white mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Location *
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                    placeholder="City, State"
                    value={formData.personalInfo.location}
                    onChange={(e) => setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo, location: e.target.value }
                    })}
                  />
                </div>
              </div>
            </section>

            {/* Professional Summary */}
            <section>
              <h3 className="text-[#4a90a4] text-2xl font-semibold mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                Professional Summary
              </h3>
              <textarea
                className="w-full h-32 bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-4 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors resize-none"
                placeholder="Brief summary of your professional background and key qualifications..."
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              />
            </section>

            {/* Experience */}
            <section>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[#4a90a4] text-2xl font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Work Experience
                </h3>
                <button
                  type="button"
                  onClick={addExperience}
                  className="btn-secondary text-sm px-4 py-2"
                >
                  Add Experience
                </button>
              </div>
              {formData.experience.map((exp, index) => (
                <div key={index} className="mb-8 p-6 bg-[#1a365d] bg-opacity-10 rounded-lg border border-[#4a90a4] border-opacity-20">
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <input
                      type="text"
                      className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                      placeholder="Company Name"
                      value={exp.company}
                      onChange={(e) => {
                        const newExp = [...formData.experience];
                        if (newExp[index]) {
                          newExp[index].company = e.target.value;
                          setFormData({ ...formData, experience: newExp });
                        }
                      }}
                    />
                    <input
                      type="text"
                      className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                      placeholder="Job Title"
                      value={exp.title}
                      onChange={(e) => {
                        const newExp = [...formData.experience];
                        if (newExp[index]) {
                          newExp[index].title = e.target.value;
                          setFormData({ ...formData, experience: newExp });
                        }
                      }}
                    />
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <input
                      type="text"
                      className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                      placeholder="Location (optional)"
                      value={exp.location}
                      onChange={(e) => {
                        const newExp = [...formData.experience];
                        if (newExp[index]) {
                          newExp[index].location = e.target.value;
                          setFormData({ ...formData, experience: newExp });
                        }
                      }}
                    />
                    <input
                      type="text"
                      className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                      placeholder="Start Date (MM/YYYY)"
                      value={exp.startDate}
                      onChange={(e) => {
                        const newExp = [...formData.experience];
                        if (newExp[index]) {
                          newExp[index].startDate = e.target.value;
                          setFormData({ ...formData, experience: newExp });
                        }
                      }}
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        className={`flex-1 bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors ${exp.current ? 'opacity-50' : ''}`}
                        placeholder="End Date (MM/YYYY)"
                        value={exp.current ? 'Present' : exp.endDate}
                        disabled={exp.current}
                        onChange={(e) => {
                          const newExp = [...formData.experience];
                          if (newExp[index]) {
                            newExp[index].endDate = e.target.value;
                            setFormData({ ...formData, experience: newExp });
                          }
                        }}
                      />
                      <label className="flex items-center text-white text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="mr-2 w-4 h-4 text-[#4a90a4] bg-[#1a365d] border-[#4a90a4] rounded focus:ring-[#4a90a4]"
                          checked={exp.current}
                          onChange={(e) => {
                            const newExp = [...formData.experience];
                            if (newExp[index]) {
                              newExp[index].current = e.target.checked;
                              if (e.target.checked) {
                                newExp[index].endDate = '';
                              }
                              setFormData({ ...formData, experience: newExp });
                            }
                          }}
                        />
                        Current
                      </label>
                    </div>
                  </div>
                  
                  <textarea
                    className="w-full h-24 bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors resize-none"
                    placeholder="Description of responsibilities and achievements..."
                    value={exp.description}
                    onChange={(e) => {
                      const newExp = [...formData.experience];
                      if (newExp[index]) {
                        newExp[index].description = e.target.value;
                        setFormData({ ...formData, experience: newExp });
                      }
                    }}
                  />
                </div>
              ))}
            </section>

            {/* Education */}
            <section>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[#4a90a4] text-2xl font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Education
                </h3>
                <button
                  type="button"
                  onClick={addEducation}
                  className="btn-secondary text-sm px-4 py-2"
                >
                  Add Education
                </button>
              </div>
              {formData.education.map((edu, index) => (
                <div key={index} className="mb-8 p-6 bg-[#1a365d] bg-opacity-10 rounded-lg border border-[#4a90a4] border-opacity-20">
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <input
                      type="text"
                      className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                      placeholder="School Name"
                      value={edu.school}
                      onChange={(e) => {
                        const newEdu = [...formData.education];
                        if (newEdu[index]) {
                          newEdu[index].school = e.target.value;
                          setFormData({ ...formData, education: newEdu });
                        }
                      }}
                    />
                    <input
                      type="text"
                      className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                      placeholder="Degree & Field of Study"
                      value={edu.degree}
                      onChange={(e) => {
                        const newEdu = [...formData.education];
                        if (newEdu[index]) {
                          newEdu[index].degree = e.target.value;
                          setFormData({ ...formData, education: newEdu });
                        }
                      }}
                    />
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                      placeholder="Location"
                      value={edu.location}
                      onChange={(e) => {
                        const newEdu = [...formData.education];
                        if (newEdu[index]) {
                          newEdu[index].location = e.target.value;
                          setFormData({ ...formData, education: newEdu });
                        }
                      }}
                    />
                    <input
                      type="text"
                      className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                      placeholder="Graduation Date (MM/YYYY)"
                      value={edu.graduationDate}
                      onChange={(e) => {
                        const newEdu = [...formData.education];
                        if (newEdu[index]) {
                          newEdu[index].graduationDate = e.target.value;
                          setFormData({ ...formData, education: newEdu });
                        }
                      }}
                    />
                    <input
                      type="text"
                      className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                      placeholder="GPA (optional)"
                      value={edu.gpa}
                      onChange={(e) => {
                        const newEdu = [...formData.education];
                        if (newEdu[index]) {
                          newEdu[index].gpa = e.target.value;
                          setFormData({ ...formData, education: newEdu });
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
            </section>

            {/* Skills */}
            <section>
              <h3 className="text-[#4a90a4] text-2xl font-semibold mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                Skills
              </h3>
              <div className="mb-4">
                <textarea
                  className="w-full h-24 bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-4 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors resize-none"
                  placeholder="Enter your skills separated by commas (e.g., JavaScript, Project Management, Adobe Photoshop, Data Analysis)"
                  value={Array.isArray(formData.skills) ? formData.skills.join(', ') : ''}
                  onChange={(e) => {
                    const skillsArray = e.target.value.split(',').map(skill => skill.trim()).filter(skill => skill);
                    setFormData({ ...formData, skills: skillsArray });
                  }}
                />
                <p className="text-gray-400 text-sm mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Include both technical and soft skills relevant to your target role
                </p>
              </div>
            </section>

            {/* Action Buttons */}
            <div className="text-center pt-8">
              <button
                type="submit"
                disabled={isProcessing}
                className="btn-primary text-xl px-12 py-4 mr-4 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Generating Resume...' : `Generate Resume - $${RESUME_BUILDER_PRICING[selectedTier].price}`}
              </button>
              <Link 
                href="/" 
                className="btn-secondary text-xl px-8 py-4 inline-block"
                onClick={(e) => {
                  if (isProcessing) {
                    e.preventDefault();
                    showNotification('info', 'Please wait for resume generation to complete');
                  }
                }}
              >
                Cancel
              </Link>
            </div>
            
            {isProcessing && (
              <div className="mt-4 text-center">
                <div className="w-full bg-[#1a365d] bg-opacity-30 rounded-full h-2 mb-2">
                  <div className="bg-gradient-to-r from-[#4a90a4] to-[#5ba0b5] h-2 rounded-full animate-pulse"></div>
                </div>
                <p className="text-[#4a90a4] text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Creating your professional resume... This may take up to 60 seconds.
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}