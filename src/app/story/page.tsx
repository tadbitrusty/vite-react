'use client';

import React, { useState, useEffect } from 'react';
import { Target, CheckCircle, Users, Zap, TrendingUp, Award, Clock, AlertTriangle, Heart, Lightbulb } from 'lucide-react';
import Link from 'next/link';

interface StoryMilestone {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  stat?: string;
  unlocked: boolean;
}

export default function StoryPage() {
  const [currentMilestone, setCurrentMilestone] = useState(0);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowStats(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const milestones: StoryMilestone[] = [
    {
      id: 'problem',
      title: 'The Broken System',
      description: 'HR systems reject 75% of qualified candidates due to missing keywords',
      icon: <AlertTriangle className="w-8 h-8 text-red-400" />,
      stat: '75%',
      unlocked: true
    },
    {
      id: 'discovery',
      title: 'The Discovery',
      description: 'An engineer with multiple degrees faces the same rejection',
      icon: <Lightbulb className="w-8 h-8 text-yellow-400" />,
      unlocked: currentMilestone >= 1
    },
    {
      id: 'mission',
      title: 'The Mission',
      description: 'Build a tool to give working professionals a fair shot',
      icon: <Heart className="w-8 h-8 text-[#4a90a4]" />,
      unlocked: currentMilestone >= 2
    },
    {
      id: 'solution',
      title: 'The Solution',
      description: 'AI-powered resume optimization that speaks ATS language',
      icon: <Zap className="w-8 h-8 text-blue-400" />,
      unlocked: currentMilestone >= 3
    },
    {
      id: 'impact',
      title: 'The Impact',
      description: 'Thousands of professionals get their dream jobs',
      icon: <TrendingUp className="w-8 h-8 text-green-400" />,
      stat: '1000+',
      unlocked: currentMilestone >= 4
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMilestone(prev => 
        prev < milestones.length - 1 ? prev + 1 : prev
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [milestones.length]);

  return (
    <div className="min-h-screen relative px-4 py-8 md:py-16 gradient-bg">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <header className="text-center mb-16 pt-8">
          <h1 className="text-[#4a90a4] text-5xl md:text-6xl font-bold mb-6" style={{ fontFamily: 'Crimson Text, serif' }}>
            Our Story
          </h1>
          <p className="text-white text-2xl md:text-3xl font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
            Why Resume Vita Exists
          </p>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            Every great tool starts with a problem that needs solving. This is the story of how we discovered 
            the biggest injustice in job hunting—and what we did about it.
          </p>
        </header>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[#4a90a4] font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
              Story Progress
            </span>
            <span className="text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
              {Math.round(((currentMilestone + 1) / milestones.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-[#1a365d] bg-opacity-30 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-[#4a90a4] to-[#5ba0b5] h-3 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${((currentMilestone + 1) / milestones.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Story Timeline */}
        <div className="space-y-8 mb-16">
          {milestones.map((milestone, index) => (
            <div 
              key={milestone.id}
              className={`card-gradient rounded-lg p-8 border transition-all duration-1000 ${
                milestone.unlocked 
                  ? 'border-[#4a90a4] border-opacity-50 opacity-100 transform translate-y-0' 
                  : 'border-gray-600 border-opacity-20 opacity-50 transform translate-y-4'
              }`}
            >
              <div className="flex items-start space-x-6">
                <div className={`p-4 rounded-full transition-all duration-500 ${
                  milestone.unlocked ? 'bg-[#4a90a4] bg-opacity-20' : 'bg-gray-700 bg-opacity-20'
                }`}>
                  {milestone.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-4">
                    <h2 className="text-white text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {milestone.title}
                    </h2>
                    {milestone.stat && milestone.unlocked && (
                      <div className="bg-[#4a90a4] bg-opacity-20 px-4 py-2 rounded-lg">
                        <span className="text-[#4a90a4] text-xl font-bold">
                          {milestone.stat}
                        </span>
                      </div>
                    )}
                    {milestone.unlocked && (
                      <Award className="w-6 h-6 text-yellow-400" />
                    )}
                  </div>
                  <p className="text-gray-300 text-lg leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {milestone.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Story Section */}
        <div className="card-gradient rounded-lg p-8 mb-12">
          <h2 className="text-white text-3xl font-bold mb-8 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
            The Full Story
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-[#4a90a4] text-xl font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                The Problem We Discovered
              </h3>
              <p className="text-gray-300 text-base leading-relaxed mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                I'm an engineer with multiple degrees and skills gathered over a lifetime. My original goal was 
                to help working people succeed. But I discovered that HR systems are designed to filter out 
                qualified candidates—75% get passed over because their resume doesn't have the exact keywords.
              </p>
              <p className="text-gray-300 text-base leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                Think about that for a moment. Three out of four qualified people never even get their resume 
                seen by a human. The system is broken, and it's not your fault.
              </p>
            </div>
            
            <div>
              <h3 className="text-[#4a90a4] text-xl font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                Our Solution Philosophy
              </h3>
              <p className="text-gray-300 text-base leading-relaxed mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                So I built this tool to give working professionals that extra edge, without having to 
                rewrite your resume for every job. I made it as easy and affordable as possible, 
                because everyone deserves a fair shot at their dream job.
              </p>
              <p className="text-gray-300 text-base leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                No BS. No fake reviews. Just proof. We give you one resume for free so you can see 
                the quality for yourself. Then decide if it's worth paying for premium templates.
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        <div className={`card-gradient rounded-lg p-8 mb-12 transition-all duration-1000 ${
          showStats ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'
        }`}>
          <h2 className="text-white text-3xl font-bold mb-8 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
            The Impact We're Making
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-[#4a90a4] bg-opacity-20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-[#4a90a4]" />
              </div>
              <h3 className="text-white text-2xl font-bold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                1,000+
              </h3>
              <p className="text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                Professionals Helped
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-500 bg-opacity-20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-white text-2xl font-bold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                85%
              </h3>
              <p className="text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                Success Rate
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-500 bg-opacity-20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-white text-2xl font-bold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                30 sec
              </h3>
              <p className="text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                Average Processing
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="card-gradient rounded-lg p-8">
            <h2 className="text-white text-3xl font-bold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              Ready to Join Our Success Stories?
            </h2>
            <p className="text-gray-300 text-lg mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
              Don't let broken systems hold you back. Get your free proof resume and see what's possible.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/"
                className="bg-gradient-to-r from-[#4a90a4] to-[#5ba0b5] text-white font-bold py-4 px-8 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <Zap className="w-5 h-5" />
                <span>Get Your Free Proof Resume</span>
              </Link>
              
              <Link 
                href="/builder"
                className="border-2 border-[#4a90a4] text-[#4a90a4] font-bold py-4 px-8 rounded-lg hover:bg-[#4a90a4] hover:text-white transition-colors flex items-center justify-center space-x-2"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <Users className="w-5 h-5" />
                <span>Build From Scratch</span>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}