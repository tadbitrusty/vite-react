import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface AuthProps {
  onSuccess?: () => void;
}

interface NotificationProps {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}

function Notification({ type, message, onClose }: NotificationProps) {
  return (
    <div className={`fixed top-4 right-4 max-w-md p-4 rounded-lg border flex items-center space-x-3 z-50 ${
      type === 'success' 
        ? 'bg-[#1a365d] border-[#4a90a4] text-white' 
        : 'bg-red-900 border-red-500 text-white'
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

export function Auth({ onSuccess }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        showNotification('success', 'Account created! You can now sign in.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onSuccess?.();
      }
    } catch (error) {
      showNotification('error', (error as any)?.message || 'Authentication failed');
    } finally {
      setLoading(false);
      setEmail('');
      setPassword('');
    }
  };

  return (
    <>
      {notification && (
        <Notification 
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="bg-[#1a365d] bg-opacity-20 p-6 rounded-lg border border-[#4a90a4] border-opacity-30 max-w-md w-full mx-auto backdrop-filter backdrop-blur-sm">
      <h2 className="text-[#4a90a4] text-2xl mb-6 font-bold text-center" style={{ fontFamily: 'Crimson Text, serif' }}>
        {isSignUp ? 'Create Account' : 'Sign In'}
      </h2>
      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <label className="block text-white mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#2A2A2A] text-white border border-[#444] rounded p-2 focus:border-[#00FF99] focus:ring-1 focus:ring-[#00FF99]"
            required
          />
        </div>
        <div>
          <label className="block text-white mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#2A2A2A] text-white border border-[#444] rounded p-2 focus:border-[#00FF99] focus:ring-1 focus:ring-[#00FF99]"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#00FF99] text-black font-bold py-2 px-4 rounded hover:bg-[#00CC7A] transition-colors"
        >
          {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
      </form>
      <button
        onClick={() => setIsSignUp(!isSignUp)}
        className="w-full text-[#4a90a4] mt-4 hover:text-[#5ba0b5] transition-colors"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
      </button>
      </div>
    </>
  );
}

export default Auth;