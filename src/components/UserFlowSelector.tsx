/**
 * UserFlowSelector Component
 * Implements the two-button user flow from ResumeSniper specification
 */

import React from 'react';

interface UserFlowSelectorProps {
  isFirstTime: boolean;
  setIsFirstTime: (value: boolean) => void;
}

export function UserFlowSelector({ isFirstTime, setIsFirstTime }: UserFlowSelectorProps) {
  return (
    <div className="max-w-3xl mx-auto mb-12 text-center">
      <h2 className="text-[#4a90a4] text-2xl font-semibold mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
        Step 1: Choose Your Path
      </h2>
      
      <div className="flex flex-col md:flex-row justify-center gap-6 mb-8">
        <button
          className={`px-8 py-6 rounded-lg border-2 transition-all transform hover:scale-105 ${
            isFirstTime 
              ? 'border-[#4a90a4] bg-[#1a365d] bg-opacity-30 text-white shadow-lg' 
              : 'border-gray-600 bg-[#1a365d] bg-opacity-10 text-gray-400 hover:border-[#4a90a4] hover:text-white'
          }`}
          onClick={() => setIsFirstTime(true)}
        >
          <div className="text-center">
            <div className="text-3xl mb-3">🆓</div>
            <div className="font-bold text-lg mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              First Time Here?
            </div>
            <div className="text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
              Test the tool - FREE resume
            </div>
            <div className="text-xs text-[#4a90a4] mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              No payment required
            </div>
          </div>
        </button>
        
        <button
          className={`px-8 py-6 rounded-lg border-2 transition-all transform hover:scale-105 ${
            !isFirstTime 
              ? 'border-[#4a90a4] bg-[#1a365d] bg-opacity-30 text-white shadow-lg' 
              : 'border-gray-600 bg-[#1a365d] bg-opacity-10 text-gray-400 hover:border-[#4a90a4] hover:text-white'
          }`}
          onClick={() => setIsFirstTime(false)}
        >
          <div className="text-center">
            <div className="text-3xl mb-3">⭐</div>
            <div className="font-bold text-lg mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              Returning User?
            </div>
            <div className="text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
              Choose premium templates
            </div>
            <div className="text-xs text-[#4a90a4] mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              $5.99 - $9.99
            </div>
          </div>
        </button>
      </div>
      
      <p className="text-gray-400 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
        {isFirstTime 
          ? "New users get one free resume to test our quality. No payment info required."
          : "Returning users select from premium templates with advanced features and styling."
        }
      </p>
    </div>
  );
}