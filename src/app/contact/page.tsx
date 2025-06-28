'use client';

import React, { useState } from 'react';
import { Target, Send, CheckCircle, AlertCircle, Mail, MessageSquare, Heart, Users } from 'lucide-react';
import Link from 'next/link';

interface NotificationProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}

function Notification({ type, message, onClose }: NotificationProps) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    info: <Mail className="w-5 h-5 text-blue-400" />
  };

  const bgColors = {
    success: 'bg-green-900 border-green-500',
    error: 'bg-red-900 border-red-500',
    info: 'bg-blue-900 border-blue-500'
  };

  return (
    <div className={`fixed top-4 right-4 max-w-md p-4 rounded-lg border flex items-center space-x-3 z-50 text-white ${bgColors[type]}`}>
      {icons[type]}
      <span className="flex-1" style={{ fontFamily: 'Inter, sans-serif' }}>{message}</span>
      <button 
        onClick={onClose}
        className="text-gray-400 hover:text-white transition-colors ml-2"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    type: 'general'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      showNotification('error', 'Please fill in all fields');
      return;
    }

    if (formData.message.length < 10) {
      showNotification('error', 'Message must be at least 10 characters long');
      return;
    }

    if (formData.message.length > 2000) {
      showNotification('error', 'Message must be less than 2000 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        showNotification('success', result.message);
        // Reset form
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: '',
          type: 'general'
        });
      } else {
        showNotification('error', result.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      showNotification('error', 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactTypes = [
    { value: 'general', label: 'General Inquiry', icon: <MessageSquare className="w-4 h-4" /> },
    { value: 'support', label: 'Technical Support', icon: <AlertCircle className="w-4 h-4" /> },
    { value: 'feedback', label: 'Feedback & Suggestions', icon: <Heart className="w-4 h-4" /> },
    { value: 'partnership', label: 'Partnership Inquiry', icon: <Users className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen relative px-4 py-8 md:py-16 gradient-bg">
      {notification && (
        <Notification 
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <header className="text-center mb-16 pt-8">
          <h1 className="text-[#4a90a4] text-5xl md:text-6xl font-bold mb-6" style={{ fontFamily: 'Crimson Text, serif' }}>
            Contact Us
          </h1>
          <p className="text-white text-2xl md:text-3xl font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
            We're Here to Help
          </p>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            Have a question, feedback, or need support? We'd love to hear from you. 
            Our team typically responds within 24-48 hours.
          </p>
        </header>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="card-gradient rounded-lg p-8">
              <h2 className="text-white text-2xl font-bold mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                Send us a Message
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Contact Type */}
                <div>
                  <label className="block text-[#4a90a4] text-sm font-semibold mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                    What can we help you with?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {contactTypes.map((type) => (
                      <label key={type.value} className="cursor-pointer">
                        <input
                          type="radio"
                          name="type"
                          value={type.value}
                          checked={formData.type === type.value}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="sr-only"
                        />
                        <div className={`p-3 rounded-lg border-2 transition-all flex items-center space-x-2 ${
                          formData.type === type.value
                            ? 'border-[#4a90a4] bg-[#4a90a4] bg-opacity-20'
                            : 'border-gray-600 border-opacity-30 hover:border-[#4a90a4] hover:border-opacity-50'
                        }`}>
                          {type.icon}
                          <span className="text-white text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {type.label}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Name and Email */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#4a90a4] text-sm font-semibold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Your Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                      placeholder="John Doe"
                      required
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[#4a90a4] text-sm font-semibold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                      placeholder="john@example.com"
                      required
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-[#4a90a4] text-sm font-semibold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                    placeholder="How can we help you?"
                    required
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-[#4a90a4] text-sm font-semibold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Message *
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors resize-none"
                    placeholder="Please describe your question or feedback in detail..."
                    rows={6}
                    required
                    minLength={10}
                    maxLength={2000}
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  />
                  <div className="text-right text-sm text-gray-400 mt-1">
                    {formData.message.length}/2000
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-[#4a90a4] to-[#5ba0b5] text-white font-bold py-4 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Contact Info Sidebar */}
          <div className="space-y-6">
            
            {/* Response Time */}
            <div className="card-gradient rounded-lg p-6">
              <h3 className="text-white text-xl font-bold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                Response Time
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full" />
                  <span className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Support: 2-6 hours
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-400 rounded-full" />
                  <span className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                    General: 24-48 hours
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-purple-400 rounded-full" />
                  <span className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Partnerships: 2-3 days
                  </span>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="card-gradient rounded-lg p-6">
              <h3 className="text-white text-xl font-bold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                Quick Help
              </h3>
              <div className="space-y-3">
                <div>
                  <h4 className="text-[#4a90a4] font-semibold text-sm mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Processing Issues?
                  </h4>
                  <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Try uploading a different file format (PDF, DOCX, TXT)
                  </p>
                </div>
                <div>
                  <h4 className="text-[#4a90a4] font-semibold text-sm mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Didn't receive email?
                  </h4>
                  <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Check spam folder or wait 2-3 minutes for delivery
                  </p>
                </div>
                <div>
                  <h4 className="text-[#4a90a4] font-semibold text-sm mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Payment Issues?
                  </h4>
                  <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Contact us with your transaction ID for quick resolution
                  </p>
                </div>
              </div>
            </div>

            {/* Alternative Contact */}
            <div className="card-gradient rounded-lg p-6">
              <h3 className="text-white text-xl font-bold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                Other Ways to Connect
              </h3>
              <div className="space-y-3">
                <Link 
                  href="/story"
                  className="block text-[#4a90a4] hover:text-white transition-colors text-sm"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  → Learn our story
                </Link>
                <Link 
                  href="/roadmap"
                  className="block text-[#4a90a4] hover:text-white transition-colors text-sm"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  → View product roadmap
                </Link>
                <a 
                  href="/"
                  className="block text-[#4a90a4] hover:text-white transition-colors text-sm"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  → Try free resume optimization
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}