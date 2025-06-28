'use client';

import React, { useState, useEffect } from 'react';
import { Target, CheckCircle, Clock, Calendar, Zap, Users, Globe, Brain, Shield, BarChart3, Smartphone, MessageSquare, FileText, Download, Search, Star, Rocket } from 'lucide-react';
import Link from 'next/link';

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'in_progress' | 'planned' | 'future';
  quarter: string;
  features: string[];
  priority: 'high' | 'medium' | 'low';
}

interface StatusBadgeProps {
  status: 'completed' | 'in_progress' | 'planned' | 'future';
}

function StatusBadge({ status }: StatusBadgeProps) {
  const configs = {
    completed: {
      bg: 'bg-green-500 bg-opacity-20',
      text: 'text-green-400',
      border: 'border-green-500',
      label: 'Completed',
      icon: <CheckCircle className="w-4 h-4" />
    },
    in_progress: {
      bg: 'bg-blue-500 bg-opacity-20',
      text: 'text-blue-400',
      border: 'border-blue-500',
      label: 'In Progress',
      icon: <Clock className="w-4 h-4 animate-spin" />
    },
    planned: {
      bg: 'bg-yellow-500 bg-opacity-20',
      text: 'text-yellow-400',
      border: 'border-yellow-500',
      label: 'Planned',
      icon: <Calendar className="w-4 h-4" />
    },
    future: {
      bg: 'bg-purple-500 bg-opacity-20',
      text: 'text-purple-400',
      border: 'border-purple-500',
      label: 'Future',
      icon: <Rocket className="w-4 h-4" />
    }
  };

  const config = configs[status];

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${config.bg} ${config.border} border-opacity-50`}>
      {config.icon}
      <span className={`text-sm font-medium ${config.text}`} style={{ fontFamily: 'Inter, sans-serif' }}>
        {config.label}
      </span>
    </div>
  );
}

export default function RoadmapPage() {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'completed' | 'in_progress' | 'planned' | 'future'>('all');
  const [visibleItems, setVisibleItems] = useState<string[]>([]);

  const roadmapItems: RoadmapItem[] = [
    {
      id: 'core-platform',
      title: 'Core Resume Optimization Platform',
      description: 'AI-powered resume optimization with ATS compatibility, PDF/DOCX support, and instant processing.',
      icon: <Zap className="w-8 h-8 text-[#4a90a4]" />,
      status: 'completed',
      quarter: 'Q1 2024',
      priority: 'high',
      features: [
        'AI resume optimization with Claude 3.5 Sonnet',
        'PDF, DOCX, TXT file support with drag & drop',
        'Professional template system',
        'Free proof resume offering',
        'Secure payment processing via Stripe',
        'Email delivery system'
      ]
    },
    {
      id: 'resume-builder',
      title: 'Interactive Resume Builder',
      description: 'Build professional resumes from scratch with AI-powered auto-fill and modern templates.',
      icon: <FileText className="w-8 h-8 text-[#4a90a4]" />,
      status: 'completed',
      quarter: 'Q1 2024',
      priority: 'high',
      features: [
        'Complete resume builder interface',
        'AI-powered auto-fill from uploaded resumes',
        'Drag & drop file upload',
        'Professional template options',
        'Real-time preview and editing'
      ]
    },
    {
      id: 'admin-dashboard',
      title: 'Admin Management Dashboard',
      description: 'Comprehensive admin tools for user management, analytics, and system monitoring.',
      icon: <BarChart3 className="w-8 h-8 text-blue-400" />,
      status: 'in_progress',
      quarter: 'Q1 2024',
      priority: 'medium',
      features: [
        'User session tracking and analytics',
        'Whitelist management system',
        'Abuse pattern detection',
        'Payment and transaction monitoring',
        'System health metrics'
      ]
    },
    {
      id: 'contact-system',
      title: 'Professional Contact System',
      description: 'Integrated contact forms with automated email routing and support ticket system.',
      icon: <MessageSquare className="w-8 h-8 text-green-400" />,
      status: 'planned',
      quarter: 'Q2 2024',
      priority: 'medium',
      features: [
        'Contact form with Resend integration',
        'Automated support ticket creation',
        'Customer inquiry routing',
        'FAQ and help documentation',
        'Live chat support widget'
      ]
    },
    {
      id: 'mobile-app',
      title: 'Mobile Application',
      description: 'Native mobile apps for iOS and Android with full resume optimization capabilities.',
      icon: <Smartphone className="w-8 h-8 text-purple-400" />,
      status: 'planned',
      quarter: 'Q2 2024',
      priority: 'high',
      features: [
        'iOS and Android native apps',
        'Mobile-optimized resume builder',
        'Camera-based document scanning',
        'Push notifications for completed resumes',
        'Offline editing capabilities'
      ]
    },
    {
      id: 'advanced-analytics',
      title: 'Advanced Analytics & SEO',
      description: 'Competitive analysis tools and comprehensive SEO optimization for better visibility.',
      icon: <Search className="w-8 h-8 text-yellow-400" />,
      status: 'planned',
      quarter: 'Q2 2024',
      priority: 'medium',
      features: [
        'Competitor keyword analysis',
        'SEO content optimization',
        'Resume performance scoring',
        'Industry-specific recommendations',
        'Job market trend analysis'
      ]
    },
    {
      id: 'ai-enhancements',
      title: 'Next-Gen AI Features',
      description: 'Advanced AI capabilities including interview prep, skill gap analysis, and career coaching.',
      icon: <Brain className="w-8 h-8 text-orange-400" />,
      status: 'future',
      quarter: 'Q3 2024',
      priority: 'high',
      features: [
        'AI interview question preparation',
        'Skill gap analysis and recommendations',
        'Career path optimization',
        'Salary negotiation guidance',
        'Industry trend predictions'
      ]
    },
    {
      id: 'enterprise-features',
      title: 'Enterprise & Integration Suite',
      description: 'Enterprise-grade features including API access, bulk processing, and third-party integrations.',
      icon: <Globe className="w-8 h-8 text-indigo-400" />,
      status: 'future',
      quarter: 'Q4 2024',
      priority: 'medium',
      features: [
        'Public API for developers',
        'Bulk resume processing',
        'LinkedIn profile sync',
        'ATS system integrations',
        'Enterprise admin controls',
        'White-label solutions'
      ]
    },
    {
      id: 'security-compliance',
      title: 'Enhanced Security & Compliance',
      description: 'Advanced security features and compliance certifications for enterprise customers.',
      icon: <Shield className="w-8 h-8 text-red-400" />,
      status: 'future',
      quarter: 'Q4 2024',
      priority: 'low',
      features: [
        'SOC 2 Type II compliance',
        'GDPR full compliance',
        'Advanced encryption',
        'Audit logging',
        'Single sign-on (SSO)',
        'Multi-factor authentication'
      ]
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleItems(prev => {
        const nextIndex = prev.length;
        if (nextIndex < roadmapItems.length) {
          return [...prev, roadmapItems[nextIndex].id];
        }
        return prev;
      });
    }, 300);

    return () => clearInterval(timer);
  }, [roadmapItems.length]);

  const filteredItems = selectedFilter === 'all' 
    ? roadmapItems 
    : roadmapItems.filter(item => item.status === selectedFilter);

  const statusCounts = {
    completed: roadmapItems.filter(item => item.status === 'completed').length,
    in_progress: roadmapItems.filter(item => item.status === 'in_progress').length,
    planned: roadmapItems.filter(item => item.status === 'planned').length,
    future: roadmapItems.filter(item => item.status === 'future').length
  };

  return (
    <div className="min-h-screen relative px-4 py-8 md:py-16 gradient-bg">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="text-center mb-16 pt-8">
          <h1 className="text-[#4a90a4] text-5xl md:text-6xl font-bold mb-6" style={{ fontFamily: 'Crimson Text, serif' }}>
            Product Roadmap
          </h1>
          <p className="text-white text-2xl md:text-3xl font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
            Building the Future of Resume Optimization
          </p>
          <p className="text-gray-300 text-lg max-w-3xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            See what we're building next. Our roadmap is driven by user feedback and the mission to give 
            every professional a fair shot at their dream job.
          </p>
        </header>

        {/* Progress Overview */}
        <div className="card-gradient rounded-lg p-8 mb-12">
          <h2 className="text-white text-2xl font-bold mb-6 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
            Development Progress
          </h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-green-500 bg-opacity-20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div className="text-green-400 text-2xl font-bold mb-1">
                {statusCounts.completed}
              </div>
              <div className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                Completed
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-500 bg-opacity-20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-blue-400" />
              </div>
              <div className="text-blue-400 text-2xl font-bold mb-1">
                {statusCounts.in_progress}
              </div>
              <div className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                In Progress
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-yellow-500 bg-opacity-20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-8 h-8 text-yellow-400" />
              </div>
              <div className="text-yellow-400 text-2xl font-bold mb-1">
                {statusCounts.planned}
              </div>
              <div className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                Planned
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-500 bg-opacity-20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <Rocket className="w-8 h-8 text-purple-400" />
              </div>
              <div className="text-purple-400 text-2xl font-bold mb-1">
                {statusCounts.future}
              </div>
              <div className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                Future
              </div>
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {(['all', 'completed', 'in_progress', 'planned', 'future'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                selectedFilter === filter
                  ? 'bg-[#4a90a4] text-white'
                  : 'bg-[#1a365d] bg-opacity-30 text-gray-300 hover:bg-[#4a90a4] hover:bg-opacity-20'
              }`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {filter === 'all' ? 'All Features' : 
               filter === 'in_progress' ? 'In Progress' :
               filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        {/* Roadmap Items */}
        <div className="space-y-8">
          {filteredItems.map((item, index) => (
            <div 
              key={item.id}
              className={`transition-all duration-700 ${
                visibleItems.includes(item.id)
                  ? 'opacity-100 transform translate-y-0'
                  : 'opacity-0 transform translate-y-8'
              }`}
            >
              <div className="card-gradient rounded-lg p-8 border border-[#4a90a4] border-opacity-30">
                <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-8">
                  
                  {/* Icon and Status */}
                  <div className="flex items-center space-x-4 mb-6 lg:mb-0 lg:flex-col lg:items-center lg:space-x-0 lg:space-y-4">
                    <div className="p-4 bg-[#4a90a4] bg-opacity-20 rounded-full">
                      {item.icon}
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                      <h3 className="text-white text-2xl font-bold mb-2 sm:mb-0" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {item.title}
                      </h3>
                      <div className="flex items-center space-x-3">
                        <span className="text-[#4a90a4] font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {item.quarter}
                        </span>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          item.priority === 'high' ? 'bg-red-500 bg-opacity-20 text-red-400' :
                          item.priority === 'medium' ? 'bg-yellow-500 bg-opacity-20 text-yellow-400' :
                          'bg-gray-500 bg-opacity-20 text-gray-400'
                        }`}>
                          {item.priority.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-300 text-lg mb-6 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {item.description}
                    </p>
                    
                    {/* Features List */}
                    <div className="grid md:grid-cols-2 gap-3">
                      {item.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center space-x-3">
                          <Star className="w-4 h-4 text-[#4a90a4] flex-shrink-0" />
                          <span className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="card-gradient rounded-lg p-8">
            <h2 className="text-white text-3xl font-bold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              Want to Influence Our Roadmap?
            </h2>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
              Your feedback drives our development. Try our current features and let us know what you'd like to see next.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/"
                className="bg-gradient-to-r from-[#4a90a4] to-[#5ba0b5] text-white font-bold py-4 px-8 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <Zap className="w-5 h-5" />
                <span>Try Resume Optimizer</span>
              </Link>
              
              <Link 
                href="/story"
                className="border-2 border-[#4a90a4] text-[#4a90a4] font-bold py-4 px-8 rounded-lg hover:bg-[#4a90a4] hover:text-white transition-colors flex items-center justify-center space-x-2"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <MessageSquare className="w-5 h-5" />
                <span>Learn Our Story</span>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}