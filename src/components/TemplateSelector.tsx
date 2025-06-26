/**
 * TemplateSelector Component  
 * Implements 1x5 template layout from ResumeSniper specification
 */

import React from 'react';

interface Template {
  id: string;
  name: string;
  icon: string;
  price: number;
  freeForFirstTime?: boolean;
  description: string;
  tier: string;
}

interface TemplateSelectorProps {
  templates: readonly Template[];
  selectedTemplate: string;
  onTemplateChange: (templateId: string) => void;
  isFirstTime: boolean;
}

export function TemplateSelector({ 
  templates, 
  selectedTemplate, 
  onTemplateChange, 
  isFirstTime 
}: TemplateSelectorProps) {
  return (
    <div className="max-w-5xl mx-auto mb-12">
      <div className="bg-[#1a365d] bg-opacity-20 rounded-lg p-6 border border-[#4a90a4] border-opacity-30">
        <h3 className="text-[#4a90a4] text-xl font-semibold mb-4 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
          Choose Your Template
        </h3>
        
        <p className="text-gray-300 text-sm mb-6 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
          {isFirstTime ? "Get the ATS Optimized template FREE, or choose any premium template!" : 'All templates available with instant payment processing'}
        </p>
        
        {/* 1x5 Template Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {templates.map((template) => {
            const isDisabled = false; // Remove first-time restrictions - anyone can pay
            const isSelected = selectedTemplate === template.id;
            
            return (
              <div
                key={template.id}
                className={`relative cursor-pointer border rounded-lg p-4 transition-all transform hover:scale-105 ${
                  isDisabled 
                    ? 'border-gray-700 bg-gray-800 bg-opacity-30 opacity-50 cursor-not-allowed hover:scale-100' 
                    : isSelected
                      ? 'border-[#4a90a4] bg-[#1a365d] bg-opacity-40 shadow-lg scale-105' 
                      : 'border-gray-600 bg-[#1a365d] bg-opacity-10 hover:border-[#4a90a4]'
                }`}
                onClick={() => !isDisabled && onTemplateChange(template.id)}
              >
                {/* FREE badge for first-time users */}
                {isFirstTime && template.id === 'ats-optimized' && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                    FREE
                  </div>
                )}
                
                {/* Selection indicator */}
                {isSelected && !isDisabled && (
                  <div className="absolute -top-2 -left-2 bg-[#4a90a4] text-white text-xs px-2 py-1 rounded-full font-bold">
                    ✓
                  </div>
                )}
                
                <div className="text-center">
                  <div className="text-3xl mb-3">{template.icon}</div>
                  <div className="text-[#4a90a4] font-bold text-lg mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {template.price === 0 ? 'FREE' : `$${template.price}`}
                  </div>
                  <div className="text-white font-semibold text-sm mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {template.name}
                  </div>
                  <div className="text-gray-300 text-xs leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {template.description}
                  </div>
                </div>
                
                {/* Lock overlay for disabled templates */}
                {isDisabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-60 rounded-lg">
                    <div className="bg-gray-700 text-gray-300 px-3 py-2 rounded text-xs font-bold">
                      🔒 PREMIUM ONLY
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
            {isFirstTime 
              ? "ATS Optimized is always free. Premium templates include advanced AI optimization and professional styling."
              : "All premium templates include advanced AI optimization and professional styling."
            }
          </p>
        </div>
      </div>
    </div>
  );
}