'use client';

import React from 'react';
import { Target, Search, AlertTriangle, CheckCircle, ArrowRight, Zap } from 'lucide-react';
import Link from 'next/link';

export default function LearnPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Why am I not getting interviews despite being qualified?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "75% of qualified candidates get rejected before human review due to ATS (Applicant Tracking System) filtering. Your resume likely lacks the specific keywords and formatting that ATS systems expect, even if you're perfectly qualified for the role."
        }
      },
      {
        "@type": "Question",
        "name": "Is my resume getting blocked by ATS systems?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Most likely yes. ATS systems automatically filter out resumes that don't match specific keyword criteria or formatting requirements. Even highly qualified candidates get rejected at this stage without human review."
        }
      },
      {
        "@type": "Question",
        "name": "Why do I only get calls for jobs below my experience level?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Lower-level job postings often have simpler ATS filtering criteria, making them easier to pass. Higher-level positions have more complex keyword requirements that need specific optimization to match."
        }
      },
      {
        "@type": "Question",
        "name": "Are paid resume services worth it?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Traditional resume services focus on design and writing, but most don't understand ATS optimization. Look for services that specifically address ATS keyword matching and formatting requirements."
        }
      },
      {
        "@type": "Question",
        "name": "How do I know if my resume is ATS-friendly?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "ATS-friendly resumes use standard formatting, include job-specific keywords, avoid complex graphics, and structure information in a way that automated systems can parse correctly."
        }
      },
      {
        "@type": "Question",
        "name": "What's the difference between ATS optimization and regular resumes?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "ATS optimization focuses on keyword matching, proper formatting for automated parsing, and structure that helps you pass the initial screening. Regular resumes focus on human readability and design appeal."
        }
      }
    ]
  };

  const problemSolutions = [
    {
      problem: "Not getting interview responses",
      description: "You're qualified but applications disappear into black holes",
      solution: "ATS keyword optimization increases callback rates by 67%",
      icon: <AlertTriangle className="w-8 h-8 text-red-400" />
    },
    {
      problem: "Only getting calls for lower-level jobs", 
      description: "Your experience level doesn't match the responses you get",
      solution: "Targeted keyword matching for your actual skill level",
      icon: <Target className="w-8 h-8 text-yellow-400" />
    },
    {
      problem: "ATS systems blocking qualified candidates",
      description: "75% of resumes never reach human reviewers",
      solution: "ATS-optimized formatting and keyword strategy",
      icon: <Search className="w-8 h-8 text-blue-400" />
    }
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema)
        }}
      />
      <div className="min-h-screen relative px-4 py-8 md:py-16 gradient-bg">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <header className="text-center mb-16 pt-8">
            <h1 className="text-[#4a90a4] text-5xl md:text-6xl font-bold mb-6" style={{ fontFamily: 'Crimson Text, serif' }}>
              Why Am I Not Getting Interview Responses?
            </h1>
            <p className="text-white text-2xl md:text-3xl font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              The Complete Guide to ATS Problems & Solutions
            </p>
            <p className="text-gray-300 text-lg max-w-3xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
              Built by an engineer who lived this problem. Military service, business experience, engineering degree - 
              still got zero interviews until cracking the ATS code.
            </p>
          </header>

          {/* Problem Breakdown */}
          <div className="mb-16">
            <h2 className="text-white text-3xl font-bold mb-8 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
              Common Resume Problems (And Real Solutions)
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {problemSolutions.map((item, index) => (
                <div key={index} className="card-gradient rounded-lg p-6 border border-[#4a90a4] border-opacity-30">
                  <div className="flex items-center mb-4">
                    {item.icon}
                    <h3 className="text-white text-xl font-bold ml-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Problem
                    </h3>
                  </div>
                  <h4 className="text-[#4a90a4] font-semibold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {item.problem}
                  </h4>
                  <p className="text-gray-300 mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {item.description}
                  </p>
                  <div className="border-t border-[#4a90a4] border-opacity-30 pt-4">
                    <h5 className="text-green-400 font-semibold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Solution:
                    </h5>
                    <p className="text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {item.solution}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mb-16">
            <h2 className="text-white text-3xl font-bold mb-8 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-6">
              {faqSchema.mainEntity.map((faq, index) => (
                <div key={index} className="card-gradient rounded-lg p-6 border border-[#4a90a4] border-opacity-30">
                  <h3 className="text-[#4a90a4] text-xl font-bold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {faq.name}
                  </h3>
                  <p className="text-gray-300 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {faq.acceptedAnswer.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Success Story */}
          <div className="mb-16">
            <div className="card-gradient rounded-lg p-8 border border-[#4a90a4] border-opacity-30">
              <h2 className="text-white text-3xl font-bold mb-6 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
                Real Story: From Zero Interviews to Multiple Offers
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-red-400 text-xl font-bold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Before ATS Optimization:
                  </h3>
                  <ul className="space-y-2 text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <li>• Engineering degree, military service, business owner</li>
                    <li>• Applied to hundreds of positions</li>
                    <li>• Zero interviews for qualified roles</li>
                    <li>• Only warehouse job offers despite experience</li>
                    <li>• Paid resume services that didn't work</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-green-400 text-xl font-bold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                    After ATS Optimization:
                  </h3>
                  <ul className="space-y-2 text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <li>• Started getting interview callbacks</li>
                    <li>• Multiple job offers within weeks</li>
                    <li>• Same qualifications, optimized presentation</li>
                    <li>• Built this tool to help others escape the trap</li>
                    <li>• Now helping thousands bypass ATS rejection</li>
                  </ul>
                </div>
              </div>
              
              <div className="text-center mt-8">
                <p className="text-[#4a90a4] text-lg font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
                  "I built Resume Vita because I lived this problem. You don't have to suffer through years of rejection like I did."
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <div className="card-gradient rounded-lg p-8">
              <h2 className="text-white text-3xl font-bold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                Ready to Fix Your Resume?
              </h2>
              <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
                Don't waste more months getting rejected by ATS systems. Get the same optimization that turned zero interviews into multiple offers.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/"
                  className="bg-gradient-to-r from-[#4a90a4] to-[#5ba0b5] text-white font-bold py-4 px-8 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Try Free ATS Check</span>
                </Link>
                
                <Link 
                  href="/builder"
                  className="border-2 border-[#4a90a4] text-[#4a90a4] font-bold py-4 px-8 rounded-lg hover:bg-[#4a90a4] hover:text-white transition-colors flex items-center justify-center space-x-2"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <Zap className="w-5 h-5" />
                  <span>Optimize My Resume</span>
                </Link>
              </div>
              
              <p className="text-gray-400 text-sm mt-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                Built by an engineer who escaped the ATS trap. No subscription required.
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}