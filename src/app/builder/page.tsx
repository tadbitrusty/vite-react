'use client';

import React, { useState } from 'react';
import { ArrowLeft, Target } from 'lucide-react';
import Link from 'next/link';

export default function ResumeBuilder() {
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

  const addExperience = () => {
    setFormData({
      ...formData,
      experience: [
        ...formData.experience,
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
    });
  };

  const addEducation = () => {
    setFormData({
      ...formData,
      education: [
        ...formData.education,
        {
          school: '',
          degree: '',
          location: '',
          graduationDate: '',
          gpa: '',
        },
      ],
    });
  };

  return (
    <div className="min-h-screen relative px-4 py-8 md:py-16 gradient-bg">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <header className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Target className="w-12 h-12 text-[#4a90a4] mr-4" />
            <h1 className="text-[#4a90a4] text-4xl md:text-5xl font-bold" style={{ fontFamily: 'Crimson Text, serif' }}>
              Resume Builder
            </h1>
          </div>
          <p className="text-white text-xl md:text-2xl font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
            Build Your Professional Resume
          </p>
          <Link 
            href="/"
            className="inline-flex items-center text-[#4a90a4] hover:text-[#5ba0b5] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Resume Optimizer
          </Link>
        </header>

        {/* Form */}
        <div className="card-gradient rounded-lg p-8">
          <form className="space-y-8">
            
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

            {/* Action Buttons */}
            <div className="text-center pt-8">
              <button
                type="submit"
                className="btn-primary text-xl px-12 py-4 mr-4"
              >
                Generate Resume
              </button>
              <Link href="/" className="btn-secondary text-xl px-8 py-4">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}