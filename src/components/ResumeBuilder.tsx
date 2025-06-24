import React, { useState } from 'react';
import { FileText, Plus, Minus, Eye, CreditCard } from 'lucide-react';
import { ResumePreview } from './ResumePreview';
import { API_ENDPOINTS } from '../constants';
import type { PersonalInfo, WorkExperience, Education, ResumeData } from '../types';


const initialResumeData: ResumeData = {
  personalInfo: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedin: ''
  },
  summary: '',
  workExperience: [{
    id: '1',
    jobTitle: '',
    company: '',
    startDate: '',
    endDate: '',
    isCurrentJob: false,
    responsibilities: ''
  }],
  education: [{
    id: '1',
    degree: '',
    school: '',
    graduationDate: '',
    gpa: ''
  }],
  skills: '',
  certifications: ''
};

interface ResumeBuilderProps {
  onBack?: () => void;
}

export function ResumeBuilder({ onBack }: ResumeBuilderProps) {
  const [resumeData, setResumeData] = useState<ResumeData>(initialResumeData);
  const [showPreview, setShowPreview] = useState(false);
  const [processing, setProcessing] = useState(false);

  const addWorkExperience = () => {
    const newId = (resumeData.workExperience.length + 1).toString();
    setResumeData(prev => ({
      ...prev,
      workExperience: [...prev.workExperience, {
        id: newId,
        jobTitle: '',
        company: '',
        startDate: '',
        endDate: '',
        isCurrentJob: false,
        responsibilities: ''
      }]
    }));
  };

  const removeWorkExperience = (id: string) => {
    if (resumeData.workExperience.length > 1) {
      setResumeData(prev => ({
        ...prev,
        workExperience: prev.workExperience.filter(exp => exp.id !== id)
      }));
    }
  };

  const updateWorkExperience = (id: string, field: keyof WorkExperience, value: any) => {
    setResumeData(prev => ({
      ...prev,
      workExperience: prev.workExperience.map(exp => 
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const addEducation = () => {
    const newId = (resumeData.education.length + 1).toString();
    setResumeData(prev => ({
      ...prev,
      education: [...prev.education, {
        id: newId,
        degree: '',
        school: '',
        graduationDate: '',
        gpa: ''
      }]
    }));
  };

  const removeEducation = (id: string) => {
    if (resumeData.education.length > 1) {
      setResumeData(prev => ({
        ...prev,
        education: prev.education.filter(edu => edu.id !== id)
      }));
    }
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.map(edu => 
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const handlePersonalInfoChange = (field: keyof PersonalInfo, value: string) => {
    setResumeData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value }
    }));
  };

  const generatePreview = () => {
    setShowPreview(true);
  };

  const handleSubmit = async (tier: 'basic' | 'enhanced') => {
    // Validate required fields
    if (!resumeData.personalInfo.fullName || !resumeData.personalInfo.email || 
        !resumeData.personalInfo.phone || !resumeData.personalInfo.location ||
        !resumeData.summary || !resumeData.skills) {
      alert('Please fill in all required fields before proceeding.');
      return;
    }

    // Validate work experience
    if (resumeData.workExperience.length === 0 || 
        !resumeData.workExperience[0].jobTitle || 
        !resumeData.workExperience[0].company || 
        !resumeData.workExperience[0].responsibilities) {
      alert('Please complete at least one work experience entry.');
      return;
    }

    // Validate education
    if (resumeData.education.length === 0 || 
        !resumeData.education[0].degree || 
        !resumeData.education[0].school) {
      alert('Please complete at least one education entry.');
      return;
    }

    setProcessing(true);
    
    try {
      const response = await fetch(API_ENDPOINTS.BUILD_RESUME, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...resumeData,
          tier
        })
      });

      const result = await response.json();
      
      if (result.requires_payment && result.payment_url) {
        // Redirect to Stripe payment
        alert(`Redirecting to payment for ${tier} resume ($${result.amount})...`);
        setTimeout(() => {
          window.location.href = result.payment_url;
        }, 1000);
      } else if (result.success) {
        alert('Resume processed successfully! Check your email.');
      } else {
        alert(`Error: ${result.message || 'Processing failed'}`);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to process resume. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen relative px-4 py-8 md:py-16">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <FileText className="w-12 h-12 text-[#4a90a4] mr-4" />
            <h1 className="text-[#4a90a4] text-4xl md:text-5xl font-bold" style={{ fontFamily: 'Crimson Text, serif' }}>
              Resume Builder
            </h1>
          </div>
          <p className="text-white text-xl md:text-2xl font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
            Build a Professional Resume in Under an Hour
          </p>
          <div className="max-w-2xl mx-auto mb-6">
            <p className="text-gray-300 text-lg mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              Use professional language and accurate information - this document represents you to potential employers. 
              Desktop/laptop recommended for optimal experience.
            </p>
            <div className="bg-[#1a365d] bg-opacity-20 rounded-lg p-4 border border-[#4a90a4] border-opacity-30">
              <p className="text-[#4a90a4] text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                📱 Yes, you CAN do this on your phone... it will take longer and be painful. Best built on a computer.
              </p>
            </div>
            {onBack && (
              <div className="text-center mt-4">
                <button
                  onClick={onBack}
                  className="text-[#4a90a4] hover:text-white transition-colors text-sm"
                >
                  ← Back to Resume Optimizer
                </button>
              </div>
            )}
          </div>
        </header>

        {!showPreview ? (
          <div className="space-y-8">
            
            {/* Personal Information */}
            <section className="bg-[#1a365d] bg-opacity-20 rounded-lg p-6 border border-[#4a90a4] border-opacity-30">
              <h2 className="text-[#4a90a4] text-2xl font-bold mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                Personal Information
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[#1a365d] bg-opacity-40 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                    value={resumeData.personalInfo.fullName}
                    onChange={(e) => handlePersonalInfoChange('fullName', e.target.value)}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full bg-[#1a365d] bg-opacity-40 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                    value={resumeData.personalInfo.email}
                    onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                    placeholder="john.smith@email.com"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    className="w-full bg-[#1a365d] bg-opacity-40 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                    value={resumeData.personalInfo.phone}
                    onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[#1a365d] bg-opacity-40 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                    value={resumeData.personalInfo.location}
                    onChange={(e) => handlePersonalInfoChange('location', e.target.value)}
                    placeholder="City, State"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-white text-sm font-medium mb-2">
                    LinkedIn Profile (optional)
                  </label>
                  <input
                    type="url"
                    className="w-full bg-[#1a365d] bg-opacity-40 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                    value={resumeData.personalInfo.linkedin}
                    onChange={(e) => handlePersonalInfoChange('linkedin', e.target.value)}
                    placeholder="https://linkedin.com/in/your-profile"
                  />
                </div>
              </div>
            </section>

            {/* Professional Summary */}
            <section className="bg-[#1a365d] bg-opacity-20 rounded-lg p-6 border border-[#4a90a4] border-opacity-30">
              <h2 className="text-[#4a90a4] text-2xl font-bold mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                Professional Summary
              </h2>
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Professional Summary (2-3 sentences) *
                </label>
                <textarea
                  required
                  rows={4}
                  className="w-full bg-[#1a365d] bg-opacity-40 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors resize-none"
                  value={resumeData.summary}
                  onChange={(e) => setResumeData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Experienced professional with X years in Y industry, specializing in Z. Proven track record of achieving results and driving growth..."
                />
              </div>
            </section>

            {/* Work Experience */}
            <section className="bg-[#1a365d] bg-opacity-20 rounded-lg p-6 border border-[#4a90a4] border-opacity-30">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[#4a90a4] text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Work Experience
                </h2>
                <button
                  onClick={addWorkExperience}
                  className="flex items-center space-x-2 text-[#4a90a4] hover:text-white transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Job</span>
                </button>
              </div>
              
              {resumeData.workExperience.map((exp, index) => (
                <div key={exp.id} className="mb-8 p-4 bg-[#1a365d] bg-opacity-40 rounded-lg border border-[#4a90a4] border-opacity-20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white text-lg font-medium">Job {index + 1}</h3>
                    {resumeData.workExperience.length > 1 && (
                      <button
                        onClick={() => removeWorkExperience(exp.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        Job Title *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full bg-[#1a365d] bg-opacity-60 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                        value={exp.jobTitle}
                        onChange={(e) => updateWorkExperience(exp.id, 'jobTitle', e.target.value)}
                        placeholder="Software Engineer"
                      />
                    </div>
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        Company *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full bg-[#1a365d] bg-opacity-60 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                        value={exp.company}
                        onChange={(e) => updateWorkExperience(exp.id, 'company', e.target.value)}
                        placeholder="Company Name"
                      />
                    </div>
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        Start Date *
                      </label>
                      <input
                        type="month"
                        required
                        className="w-full bg-[#1a365d] bg-opacity-60 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                        value={exp.startDate}
                        onChange={(e) => updateWorkExperience(exp.id, 'startDate', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        End Date
                      </label>
                      <div className="space-y-2">
                        <input
                          type="month"
                          className="w-full bg-[#1a365d] bg-opacity-60 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                          value={exp.endDate}
                          onChange={(e) => updateWorkExperience(exp.id, 'endDate', e.target.value)}
                          disabled={exp.isCurrentJob}
                        />
                        <label className="flex items-center space-x-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            checked={exp.isCurrentJob}
                            onChange={(e) => {
                              updateWorkExperience(exp.id, 'isCurrentJob', e.target.checked);
                              if (e.target.checked) {
                                updateWorkExperience(exp.id, 'endDate', '');
                              }
                            }}
                            className="rounded"
                          />
                          <span>Current job</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Key Responsibilities & Achievements *
                    </label>
                    <textarea
                      required
                      rows={4}
                      className="w-full bg-[#1a365d] bg-opacity-60 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors resize-none"
                      value={exp.responsibilities}
                      onChange={(e) => updateWorkExperience(exp.id, 'responsibilities', e.target.value)}
                      placeholder="• Led development of key features that increased user engagement by 25%&#10;• Managed team of 5 engineers and delivered projects on time&#10;• Implemented new processes that reduced bugs by 40%"
                    />
                  </div>
                </div>
              ))}
            </section>

            {/* Education */}
            <section className="bg-[#1a365d] bg-opacity-20 rounded-lg p-6 border border-[#4a90a4] border-opacity-30">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[#4a90a4] text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Education
                </h2>
                <button
                  onClick={addEducation}
                  className="flex items-center space-x-2 text-[#4a90a4] hover:text-white transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Education</span>
                </button>
              </div>
              
              {resumeData.education.map((edu, index) => (
                <div key={edu.id} className="mb-6 p-4 bg-[#1a365d] bg-opacity-40 rounded-lg border border-[#4a90a4] border-opacity-20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white text-lg font-medium">Education {index + 1}</h3>
                    {resumeData.education.length > 1 && (
                      <button
                        onClick={() => removeEducation(edu.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        Degree *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full bg-[#1a365d] bg-opacity-60 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                        value={edu.degree}
                        onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                        placeholder="Bachelor of Science in Computer Science"
                      />
                    </div>
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        School *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full bg-[#1a365d] bg-opacity-60 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                        value={edu.school}
                        onChange={(e) => updateEducation(edu.id, 'school', e.target.value)}
                        placeholder="University Name"
                      />
                    </div>
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        Graduation Date *
                      </label>
                      <input
                        type="month"
                        required
                        className="w-full bg-[#1a365d] bg-opacity-60 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                        value={edu.graduationDate}
                        onChange={(e) => updateEducation(edu.id, 'graduationDate', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        GPA (optional)
                      </label>
                      <input
                        type="text"
                        className="w-full bg-[#1a365d] bg-opacity-60 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                        value={edu.gpa || ''}
                        onChange={(e) => updateEducation(edu.id, 'gpa', e.target.value)}
                        placeholder="3.8/4.0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* Skills */}
            <section className="bg-[#1a365d] bg-opacity-20 rounded-lg p-6 border border-[#4a90a4] border-opacity-30">
              <h2 className="text-[#4a90a4] text-2xl font-bold mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                Skills
              </h2>
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Technical & Professional Skills *
                </label>
                <textarea
                  required
                  rows={4}
                  className="w-full bg-[#1a365d] bg-opacity-40 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors resize-none"
                  value={resumeData.skills}
                  onChange={(e) => setResumeData(prev => ({ ...prev, skills: e.target.value }))}
                  placeholder="Technical: JavaScript, React, Python, SQL, AWS&#10;Professional: Project Management, Team Leadership, Communication&#10;Languages: English (Native), Spanish (Conversational)"
                />
              </div>
            </section>

            {/* Certifications */}
            <section className="bg-[#1a365d] bg-opacity-20 rounded-lg p-6 border border-[#4a90a4] border-opacity-30">
              <h2 className="text-[#4a90a4] text-2xl font-bold mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                Certifications (Optional)
              </h2>
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Professional Certifications & Licenses
                </label>
                <textarea
                  rows={3}
                  className="w-full bg-[#1a365d] bg-opacity-40 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors resize-none"
                  value={resumeData.certifications}
                  onChange={(e) => setResumeData(prev => ({ ...prev, certifications: e.target.value }))}
                  placeholder="AWS Certified Solutions Architect (2023)&#10;Project Management Professional (PMP) (2022)&#10;Security+ Certification (2021)"
                />
              </div>
            </section>

            {/* Generate Preview Button */}
            <div className="text-center">
              <button
                onClick={generatePreview}
                className="bg-[#4a90a4] text-white text-xl px-8 py-4 rounded-lg flex items-center justify-center mx-auto space-x-3 transform hover:scale-105 transition-transform"
              >
                <Eye className="w-6 h-6" />
                <span className="font-bold">Preview Resume</span>
              </button>
            </div>

          </div>
        ) : (
          <div className="space-y-8">
            {/* Preview content will go here */}
            <div className="text-center">
              <button
                onClick={() => setShowPreview(false)}
                className="text-[#4a90a4] hover:text-white transition-colors mb-8"
              >
                ← Back to Edit
              </button>
            </div>
            
            {/* Resume Preview */}
            <ResumePreview data={resumeData} />
            
            {/* Payment Options */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[#1a365d] bg-opacity-20 rounded-lg p-6 border border-[#4a90a4] border-opacity-30">
                <h3 className="text-[#4a90a4] text-xl font-bold mb-4">Basic Resume</h3>
                <p className="text-white text-3xl font-bold mb-4">$45</p>
                <p className="text-gray-300 mb-6">Form data populated into professional template</p>
                <button
                  onClick={() => handleSubmit('basic')}
                  disabled={processing}
                  className="w-full bg-[#4a90a4] text-white py-3 rounded-lg font-bold hover:bg-[#3a7a8a] transition-colors disabled:opacity-50"
                >
                  <CreditCard className="w-5 h-5 inline mr-2" />
                  Get Basic Resume
                </button>
              </div>
              
              <div className="bg-[#1a365d] bg-opacity-20 rounded-lg p-6 border border-[#4a90a4] border-opacity-30 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#4a90a4] text-white px-4 py-1 rounded-full text-sm font-bold">
                  RECOMMENDED
                </div>
                <h3 className="text-[#4a90a4] text-xl font-bold mb-4">AI-Enhanced Resume</h3>
                <p className="text-white text-3xl font-bold mb-4">$75</p>
                <p className="text-gray-300 mb-6">AI improves content + professional template</p>
                <button
                  onClick={() => handleSubmit('enhanced')}
                  disabled={processing}
                  className="w-full bg-[#4a90a4] text-white py-3 rounded-lg font-bold hover:bg-[#3a7a8a] transition-colors disabled:opacity-50"
                >
                  <CreditCard className="w-5 h-5 inline mr-2" />
                  Get AI-Enhanced Resume
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}