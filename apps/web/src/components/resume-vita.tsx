'use client';

import React from 'react';
import { useAppStore, useUserStore, useNotificationStore } from '@/store';

export function ResumeVita(): React.JSX.Element {
  const { setUserFlowType, userFlowType, selectedTemplate } = useAppStore();
  const { email, setEmail } = useUserStore();
  const { showSuccess } = useNotificationStore();

  const handleFlowSelection = (flowType: 'first-time' | 'returning') => {
    setUserFlowType(flowType);
    showSuccess('Flow Selected', `You selected ${flowType} user flow`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-resume-dark via-resume-medium to-resume-light">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-7xl font-crimson font-bold text-white mb-6">
            Resume
            <span className="text-resume-blue ml-4">Vita</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
            Transform your resume with AI-powered optimization. Get past ATS systems and land more interviews.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="card-gradient rounded-2xl p-8 mb-8">
            <h2 className="text-3xl font-crimson font-semibold text-white mb-8 text-center">
              Choose Your Experience Level
            </h2>
            
            {/* User Flow Selection */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <button
                onClick={() => handleFlowSelection('first-time')}
                className={`p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                  userFlowType === 'first-time'
                    ? 'border-resume-blue bg-resume-medium/30 text-white shadow-lg'
                    : 'border-gray-600 bg-resume-medium/10 text-gray-400 hover:border-resume-blue hover:text-white'
                }`}
              >
                <div className="text-4xl mb-4">🆓</div>
                <h3 className="text-xl font-semibold mb-2">First Time Here</h3>
                <p className="text-sm opacity-80">
                  Get our free ATS-optimized template to start your journey
                </p>
              </button>

              <button
                onClick={() => handleFlowSelection('returning')}
                className={`p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                  userFlowType === 'returning'
                    ? 'border-resume-blue bg-resume-medium/30 text-white shadow-lg'
                    : 'border-gray-600 bg-resume-medium/10 text-gray-400 hover:border-resume-blue hover:text-white'
                }`}
              >
                <div className="text-4xl mb-4">⭐</div>
                <h3 className="text-xl font-semibold mb-2">Returning User</h3>
                <p className="text-sm opacity-80">
                  Access premium templates and advanced features
                </p>
              </button>
            </div>

            {/* Template Selection (shown after flow selection) */}
            {userFlowType && (
              <div className="animate-fade-in">
                <h3 className="text-2xl font-semibold text-white mb-6 text-center">
                  {userFlowType === 'first-time' ? 'Your Free Template' : 'Choose a Premium Template'}
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                  {/* Free Template */}
                  <div className="relative p-4 rounded-lg border-2 border-resume-blue bg-resume-medium/20 text-center">
                    {userFlowType === 'first-time' && (
                      <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                        FREE
                      </div>
                    )}
                    <div className="text-3xl mb-2">⭐</div>
                    <h4 className="font-semibold text-white mb-1">ATS Optimized</h4>
                    <p className="text-xs text-gray-300 mb-2">Traditional structure</p>
                    <p className="text-green-400 font-bold">FREE</p>
                  </div>

                  {/* Premium Templates (shown for returning users) */}
                  {userFlowType === 'returning' && (
                    <>
                      <div className="p-4 rounded-lg border-2 border-gray-600 bg-resume-medium/10 text-center opacity-60">
                        <div className="text-3xl mb-2">✨</div>
                        <h4 className="font-semibold text-white mb-1">Premium Classic</h4>
                        <p className="text-xs text-gray-300 mb-2">Modern design</p>
                        <p className="text-resume-blue font-bold">$5.99</p>
                      </div>
                      
                      <div className="p-4 rounded-lg border-2 border-gray-600 bg-resume-medium/10 text-center opacity-60">
                        <div className="text-3xl mb-2">⚙️</div>
                        <h4 className="font-semibold text-white mb-1">Tech Focus</h4>
                        <p className="text-xs text-gray-300 mb-2">IT & Engineering</p>
                        <p className="text-resume-blue font-bold">$9.99</p>
                      </div>
                      
                      <div className="p-4 rounded-lg border-2 border-gray-600 bg-resume-medium/10 text-center opacity-60">
                        <div className="text-3xl mb-2">👁️</div>
                        <h4 className="font-semibold text-white mb-1">Premium Plus</h4>
                        <p className="text-xs text-gray-300 mb-2">Career growth</p>
                        <p className="text-resume-blue font-bold">$7.99</p>
                      </div>
                      
                      <div className="p-4 rounded-lg border-2 border-gray-600 bg-resume-medium/10 text-center opacity-60">
                        <div className="text-3xl mb-2">💼</div>
                        <h4 className="font-semibold text-white mb-1">Executive</h4>
                        <p className="text-xs text-gray-300 mb-2">Senior leadership</p>
                        <p className="text-resume-blue font-bold">$8.99</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Email Input */}
                <div className="input-container mb-6">
                  <label className="block text-white font-semibold mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full bg-resume-light/50 border border-resume-blue/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-resume-blue focus:ring-1 focus:ring-resume-blue"
                  />
                </div>

                {/* File Upload Area */}
                <div className="input-container mb-6">
                  <label className="block text-white font-semibold mb-2">
                    Upload Your Resume
                  </label>
                  <div className="border-2 border-dashed border-resume-blue/50 rounded-lg p-8 text-center hover:border-resume-blue transition-colors">
                    <div className="text-4xl mb-4">📄</div>
                    <p className="text-white mb-2">Drop your resume here or click to browse</p>
                    <p className="text-gray-400 text-sm">Supports PDF, DOC, DOCX (max 10MB)</p>
                  </div>
                </div>

                {/* Job Description */}
                <div className="input-container mb-8">
                  <label className="block text-white font-semibold mb-2">
                    Job Description
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Paste the job description here to optimize your resume for this specific role..."
                    className="w-full bg-resume-light/50 border border-resume-blue/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-resume-blue focus:ring-1 focus:ring-resume-blue resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button className="resume-magician-button btn-primary text-white font-bold py-4 px-8 rounded-lg">
                    ✨ OPTIMIZE MY RESUME ✨
                  </button>
                  
                  <button className="btn-secondary py-4 px-8 rounded-lg">
                    📝 Need a Resume? Build One
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 mt-16">
          <p>© 2024 Resume Vita v2. Transforming careers through AI-powered optimization.</p>
        </div>
      </div>
    </div>
  );
}