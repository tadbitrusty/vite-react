import React from 'react';

interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
}

interface WorkExperience {
  id: string;
  jobTitle: string;
  company: string;
  startDate: string;
  endDate: string;
  isCurrentJob: boolean;
  responsibilities: string;
}

interface Education {
  id: string;
  degree: string;
  school: string;
  graduationDate: string;
  gpa?: string;
}

interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: string;
  certifications: string;
}

interface ResumePreviewProps {
  data: ResumeData;
}

export function ResumePreview({ data }: ResumePreviewProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const formatWorkExperience = (exp: WorkExperience) => {
    const startDate = formatDate(exp.startDate);
    const endDate = exp.isCurrentJob ? 'Present' : formatDate(exp.endDate);
    return `${startDate} - ${endDate}`;
  };

  return (
    <div className="bg-white text-black p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="space-y-6">
        
        {/* Header - Always shown */}
        <div className="text-center border-b-2 border-gray-800 pb-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {data.personalInfo.fullName || '[Your Name]'}
          </h1>
          <div className="text-sm text-gray-600 space-y-1">
            <div>{data.personalInfo.email || '[Your Email]'} • {data.personalInfo.phone || '[Your Phone]'}</div>
            <div>{data.personalInfo.location || '[Your Location]'}</div>
            {data.personalInfo.linkedin && (
              <div>{data.personalInfo.linkedin}</div>
            )}
          </div>
        </div>

        {/* Professional Summary - Always shown */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-3 border-b border-gray-300 pb-1">
            PROFESSIONAL SUMMARY
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {data.summary || '[Your professional summary will appear here - a compelling 2-3 sentence overview of your experience and value proposition.]'}
          </p>
        </div>

        {/* Work Experience - Show first job only */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-3 border-b border-gray-300 pb-1">
            PROFESSIONAL EXPERIENCE
          </h2>
          {data.workExperience.length > 0 && data.workExperience[0].jobTitle ? (
            <div className="mb-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-800">
                    {data.workExperience[0].jobTitle}
                  </h3>
                  <p className="text-gray-600 font-medium">
                    {data.workExperience[0].company}
                  </p>
                </div>
                <div className="text-sm text-gray-600">
                  {formatWorkExperience(data.workExperience[0])}
                </div>
              </div>
              <div className="text-gray-700 text-sm leading-relaxed">
                {data.workExperience[0].responsibilities.split('\n').slice(0, 2).map((line, index) => (
                  <div key={index} className="mb-1">
                    {line.trim().startsWith('•') ? line : `• ${line}`}
                  </div>
                ))}
                {data.workExperience[0].responsibilities.split('\n').length > 2 && (
                  <div className="text-gray-500 italic">• [Additional responsibilities...]</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-gray-500 italic mb-4">
              [Your most recent work experience will appear here with detailed achievements and responsibilities]
            </div>
          )}
          
          {data.workExperience.length > 1 && (
            <div className="bg-gray-100 p-4 rounded border-l-4 border-gray-400">
              <p className="text-gray-600 text-sm italic">
                + {data.workExperience.length - 1} additional work experience{data.workExperience.length > 2 ? 's' : ''} will appear here...
              </p>
            </div>
          )}
        </div>

        {/* Placeholder sections */}
        <div className="space-y-4">
          <div className="bg-gray-100 p-4 rounded border-l-4 border-gray-400">
            <h2 className="text-xl font-bold text-gray-800 mb-2">EDUCATION</h2>
            <p className="text-gray-600 text-sm italic">
              Your education background will appear here with degrees, institutions, and dates
            </p>
          </div>
          
          <div className="bg-gray-100 p-4 rounded border-l-4 border-gray-400">
            <h2 className="text-xl font-bold text-gray-800 mb-2">SKILLS</h2>
            <p className="text-gray-600 text-sm italic">
              Your technical and professional skills will be organized here by category
            </p>
          </div>
          
          {data.certifications && (
            <div className="bg-gray-100 p-4 rounded border-l-4 border-gray-400">
              <h2 className="text-xl font-bold text-gray-800 mb-2">CERTIFICATIONS</h2>
              <p className="text-gray-600 text-sm italic">
                Your professional certifications and licenses will appear here
              </p>
            </div>
          )}
        </div>

        {/* Preview Notice */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Preview Mode:</strong> This shows 2-3 sample sections of your completed resume. 
                The full resume will include all sections with professional formatting.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}