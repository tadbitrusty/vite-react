'use client';

import React, { useState } from 'react';
import { Target, Upload, Plus } from 'lucide-react';
import { UserFlowSelector, TemplateSelector } from '@/components';
import { RESUME_TEMPLATES } from '@/constants';

export default function Home() {
  const [currentView, setCurrentView] = useState<'optimizer' | 'builder'>('optimizer');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [email, setEmail] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState('ats-optimized');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setResumeFile(file);
    }
  };

  return (
    <div className="min-h-screen relative px-4 py-8 md:py-16 gradient-bg">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <header className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Target className="w-12 h-12 text-[#4a90a4] mr-4" />
            <h1 className="text-[#4a90a4] text-5xl md:text-6xl font-bold" style={{ fontFamily: 'Crimson Text, serif' }}>
              Resume Vita
            </h1>
          </div>
          <p className="text-white text-2xl md:text-3xl font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
            Breathing Life Into Your Resume
          </p>
          <div className="max-w-3xl mx-auto mb-8">
            <p className="text-gray-300 text-lg mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              I was Navy aviation ordnance - I made things go boom and understood complex systems others missed. 
              Now I have engineering degrees and real experience, but I'm delivering groceries because ATS systems kill qualified candidates before humans ever see them.
            </p>
            <p className="text-gray-300 text-lg mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              I was dead in the water - overqualified for grunt work, 'under-qualified' for engineering roles I could do in my sleep. 
              So I built Resume Vita to bring dead resumes back to life and get qualified people past these broken filters.
            </p>
            <p className="text-[#4a90a4] text-lg font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
              Your resume isn't garbage - it's just suffocating under systems that don't understand what you bring to the table.
            </p>
          </div>
        </header>

        {/* Anti-BS Section */}
        <div className="text-center mb-12 p-8 card-gradient rounded-lg">
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
              onClick={() => setCurrentView('builder')}
              className="bg-gradient-to-r from-[#4a90a4] to-[#5ba0b5] text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center mx-auto space-x-2 transform hover:scale-105 transition-transform"
            >
              <Plus className="w-5 h-5" />
              <span>Need a Resume?</span>
            </button>
          </div>
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
          <div className="card-gradient rounded-lg p-6">
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

        {/* Action Button */}
        <div className="text-center mb-12">
          <button
            className="btn-primary text-xl px-12 py-4"
            disabled={!resumeFile || !jobDescription || !email}
          >
            Optimize My Resume
          </button>
          <p className="text-gray-400 text-sm mt-4" style={{ fontFamily: 'Inter, sans-serif' }}>
            {isFirstTime ? "First resume is completely free - no payment required" : "Instant payment processing after optimization"}
          </p>
        </div>

      </div>
    </div>
  )
}