'use client';

import React, { useState, useEffect } from 'react';
import { Target, Menu, X, Home, FileText, Heart, MapPin, Mail, Settings, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationProps {
  isTransparent?: boolean;
}

export default function Navigation({ isTransparent = false }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const navigationItems = [
    {
      href: '/',
      label: 'Resume Optimizer',
      icon: <Home className="w-5 h-5" />,
      description: 'AI-powered resume optimization'
    },
    {
      href: '/builder',
      label: 'Resume Builder',
      icon: <FileText className="w-5 h-5" />,
      description: 'Build from scratch'
    },
    {
      href: '/story',
      label: 'Our Story',
      icon: <Heart className="w-5 h-5" />,
      description: 'Why we built this'
    },
    {
      href: '/roadmap',
      label: 'Roadmap',
      icon: <MapPin className="w-5 h-5" />,
      description: 'Future features'
    },
    {
      href: '/learn',
      label: 'Learn',
      icon: <BookOpen className="w-5 h-5" />,
      description: 'Resume help & guides'
    },
    {
      href: '/contact',
      label: 'Contact',
      icon: <Mail className="w-5 h-5" />,
      description: 'Get in touch'
    }
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const navbarClasses = `fixed top-0 w-full z-40 transition-all duration-300 ${
    isTransparent && !isScrolled && !isMenuOpen
      ? 'bg-transparent'
      : 'bg-[#0f172a] bg-opacity-95 backdrop-blur-md border-b border-[#4a90a4] border-opacity-20'
  }`;

  return (
    <>
      <nav className={navbarClasses}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <Link 
              href="/"
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <Target className="w-8 h-8 text-[#4a90a4]" />
              <span 
                className="text-[#4a90a4] text-xl font-bold hidden sm:block"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                Resume Vita
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive(item.href)
                      ? 'bg-[#4a90a4] bg-opacity-20 text-[#4a90a4]'
                      : 'text-gray-300 hover:text-white hover:bg-[#4a90a4] hover:bg-opacity-10'
                  }`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Hamburger Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#4a90a4] hover:bg-opacity-20 transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed top-0 left-0 right-0 bg-[#0f172a] border-b border-[#4a90a4] border-opacity-20">
            
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700 border-opacity-30">
              <Link 
                href="/"
                className="flex items-center space-x-3"
                onClick={() => setIsMenuOpen(false)}
              >
                <Target className="w-8 h-8 text-[#4a90a4]" />
                <span 
                  className="text-[#4a90a4] text-xl font-bold"
                  style={{ fontFamily: 'Crimson Text, serif' }}
                >
                  Resume Vita
                </span>
              </Link>
              
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#4a90a4] hover:bg-opacity-20 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="p-4 space-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center space-x-4 p-4 rounded-lg transition-all ${
                    isActive(item.href)
                      ? 'bg-[#4a90a4] bg-opacity-20 text-[#4a90a4]'
                      : 'text-gray-300 hover:text-white hover:bg-[#4a90a4] hover:bg-opacity-10'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    isActive(item.href)
                      ? 'bg-[#4a90a4] bg-opacity-30'
                      : 'bg-gray-700 bg-opacity-30'
                  }`}>
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <div 
                      className="font-medium text-base"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {item.label}
                    </div>
                    <div 
                      className="text-sm opacity-70"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {item.description}
                    </div>
                  </div>
                  {isActive(item.href) && (
                    <div className="w-2 h-2 bg-[#4a90a4] rounded-full" />
                  )}
                </Link>
              ))}
            </div>

            {/* Menu Footer */}
            <div className="p-4 border-t border-gray-700 border-opacity-30">
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Breathing Life Into Your Resume
                </p>
                <p className="text-gray-500 text-xs mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                  © 2024 Resume Vita. All rights reserved.
                </p>
                {/* Admin Access Link */}
                <Link
                  href="/admin/login"
                  className="inline-flex items-center space-x-1 text-gray-600 hover:text-[#4a90a4] transition-colors text-xs"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Settings className="w-3 h-3" />
                  <span>Admin</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spacer to prevent content from hiding behind fixed navbar */}
      <div className="h-16" />
    </>
  );
}