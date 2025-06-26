'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { API_ENDPOINTS } from '../../../constants';

interface NotificationProps {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}

function Notification({ type, message, onClose }: NotificationProps) {
  return (
    <div className={`fixed top-4 right-4 max-w-md p-4 rounded-lg border flex items-center space-x-3 z-50 text-white ${
      type === 'success' 
        ? 'bg-[#1a365d] border-[#4a90a4]' 
        : 'bg-red-900 border-red-500'
    }`}>
      {type === 'success' ? 
        <CheckCircle className="w-5 h-5 text-[#4a90a4]" /> : 
        <AlertCircle className="w-5 h-5 text-red-400" />
      }
      <span className="flex-1" style={{ fontFamily: 'Inter, sans-serif' }}>{message}</span>
      <button 
        onClick={onClose}
        className="text-gray-400 hover:text-white transition-colors"
      >
        ×
      </button>
    </div>
  );
}

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const router = useRouter();

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_AUTH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          action: 'login'
        })
      });

      const result = await response.json();

      if (result.success) {
        showNotification('success', 'Login successful! Redirecting...');
        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 1000);
      } else {
        showNotification('error', result.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      showNotification('error', 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative px-4 py-8 md:py-16 gradient-bg flex items-center justify-center">
      {notification && (
        <Notification 
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      
      <div className="max-w-md w-full">
        <div className="card-gradient rounded-lg p-8 border border-[#4a90a4] border-opacity-30">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Shield className="w-12 h-12 text-[#4a90a4] mr-3" />
              <h1 className="text-[#4a90a4] text-3xl font-bold" style={{ fontFamily: 'Crimson Text, serif' }}>
                Admin Portal
              </h1>
            </div>
            <p className="text-white text-lg font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
              Resume Vita Administration
            </p>
            <p className="text-gray-300 text-sm mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              Secure access to user management and analytics
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-white mb-2 font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-4 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                placeholder="Enter admin username"
                required
                autoComplete="username"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
            </div>

            <div>
              <label className="block text-white mb-2 font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-4 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4] transition-colors"
                placeholder="Enter admin password"
                required
                autoComplete="current-password"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#4a90a4] to-[#5ba0b5] text-white font-bold py-4 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-75 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                'Access Admin Dashboard'
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-8 p-4 bg-[#1a365d] bg-opacity-30 rounded-lg border border-[#4a90a4] border-opacity-20">
            <p className="text-gray-300 text-xs text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
              🔒 Secure admin access with session management<br/>
              Unauthorized access attempts are logged and monitored
            </p>
          </div>

          {/* Fun Reference */}
          <div className="mt-4 text-center">
            <p className="text-gray-500 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
              Hope you didn't open Pandora's box... 📦
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}