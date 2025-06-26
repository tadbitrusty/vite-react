'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, Users, Award, AlertTriangle, Plus, Search, 
  Mail, MapPin, Globe, Clock, Flag, CheckCircle,
  LogOut, BarChart3, Settings, Download
} from 'lucide-react';
import { API_ENDPOINTS } from '../../../constants';

interface User {
  id: string;
  email: string;
  fullName?: string;
  accountType: string;
  resumesGenerated: number;
  freeResumesUsed: number;
  lastActivity: string;
  flagged: boolean;
  flaggedReason?: string;
  ipAddress: string;
  country?: string;
  device: string;
  browser: string;
}

interface WhitelistEntry {
  id: string;
  type: 'email' | 'domain' | 'ip_range';
  value: string;
  privilege: {
    freeResumes: number | 'unlimited';
    discountPercent?: number;
    premiumAccess?: boolean;
  };
  accountType: string;
  notes?: string;
  active: boolean;
}

interface Stats {
  totalUsers: number;
  activeToday: number;
  freeResumesToday: number;
  flaggedUsers: number;
  whitelistEntries: number;
}

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'whitelist' | 'influencers'>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddInfluencer, setShowAddInfluencer] = useState(false);
  const [newInfluencerEmail, setNewInfluencerEmail] = useState('');
  const [newInfluencerLimit, setNewInfluencerLimit] = useState(20);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadData();
    }
  }, [authenticated, activeTab]);

  const checkAuth = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_AUTH);
      const result = await response.json();
      
      if (result.success && result.authenticated) {
        setAuthenticated(true);
      } else {
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      if (activeTab === 'overview' || activeTab === 'users') {
        const [statsRes, usersRes] = await Promise.all([
          fetch(`${API_ENDPOINTS.USER_TRACKING}?action=stats`),
          fetch(`${API_ENDPOINTS.USER_TRACKING}?action=users`)
        ]);
        
        const statsData = await statsRes.json();
        const usersData = await usersRes.json();
        
        if (statsData.success) setStats(statsData.stats);
        if (usersData.success) setUsers(usersData.users);
      }
      
      if (activeTab === 'whitelist' || activeTab === 'influencers') {
        const whitelistRes = await fetch(`${API_ENDPOINTS.USER_TRACKING}?action=whitelist`);
        const whitelistData = await whitelistRes.json();
        
        if (whitelistData.success) setWhitelist(whitelistData.whitelist);
      }
    } catch (error) {
      console.error('Data loading error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(API_ENDPOINTS.ADMIN_AUTH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/admin/login');
    }
  };

  const addInfluencer = async () => {
    if (!newInfluencerEmail.trim()) return;
    
    try {
      // In a real implementation, this would call an API to add the influencer
      const newEntry: WhitelistEntry = {
        id: `influencer-${Date.now()}`,
        type: 'email',
        value: newInfluencerEmail.toLowerCase(),
        privilege: { freeResumes: newInfluencerLimit },
        accountType: 'influencer',
        notes: `Influencer - ${newInfluencerLimit} free resumes`,
        active: true
      };
      
      setWhitelist([...whitelist, newEntry]);
      setNewInfluencerEmail('');
      setNewInfluencerLimit(20);
      setShowAddInfluencer(false);
    } catch (error) {
      console.error('Add influencer error:', error);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.ipAddress.includes(searchTerm)
  );

  const influencers = whitelist.filter(entry => entry.accountType === 'influencer');

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-white text-xl">Loading admin dashboard...</div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="border-b border-[#4a90a4] border-opacity-30 bg-[#1a365d] bg-opacity-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Shield className="w-8 h-8 text-[#4a90a4]" />
            <div>
              <h1 className="text-white text-xl font-bold" style={{ fontFamily: 'Crimson Text, serif' }}>
                Resume Vita Admin
              </h1>
              <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                User Management & Analytics
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
              Welcome, tadbitrusty
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-red-400 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span style={{ fontFamily: 'Inter, sans-serif' }}>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-[#1a365d] bg-opacity-20 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'whitelist', label: 'Whitelist', icon: Shield },
            { id: 'influencers', label: 'Influencers', icon: Award }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#4a90a4] text-white'
                  : 'text-gray-300 hover:text-white hover:bg-[#1a365d] hover:bg-opacity-30'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span style={{ fontFamily: 'Inter, sans-serif' }}>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="card-gradient rounded-lg p-6 border border-[#4a90a4] border-opacity-30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>Total Users</p>
                    <p className="text-white text-3xl font-bold">{stats.totalUsers}</p>
                  </div>
                  <Users className="w-8 h-8 text-[#4a90a4]" />
                </div>
              </div>
              
              <div className="card-gradient rounded-lg p-6 border border-[#4a90a4] border-opacity-30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>Active Today</p>
                    <p className="text-white text-3xl font-bold">{stats.activeToday}</p>
                  </div>
                  <Clock className="w-8 h-8 text-green-400" />
                </div>
              </div>
              
              <div className="card-gradient rounded-lg p-6 border border-[#4a90a4] border-opacity-30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>Free Resumes Today</p>
                    <p className="text-white text-3xl font-bold">{stats.freeResumesToday}</p>
                  </div>
                  <Download className="w-8 h-8 text-blue-400" />
                </div>
              </div>
              
              <div className="card-gradient rounded-lg p-6 border border-[#4a90a4] border-opacity-30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>Flagged Users</p>
                    <p className="text-white text-3xl font-bold">{stats.flaggedUsers}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card-gradient rounded-lg p-6 border border-[#4a90a4] border-opacity-30">
              <h3 className="text-[#4a90a4] text-xl font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                Recent User Activity
              </h3>
              <div className="space-y-3">
                {users.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-[#1a365d] bg-opacity-20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${user.flagged ? 'bg-red-400' : 'bg-green-400'}`} />
                      <div>
                        <p className="text-white font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {user.fullName || user.email}
                        </p>
                        <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {user.resumesGenerated} resumes • {user.accountType}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {new Date(user.lastActivity).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[#4a90a4] text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>
                User Management
              </h2>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4]"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  />
                </div>
              </div>
            </div>

            <div className="card-gradient rounded-lg border border-[#4a90a4] border-opacity-30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#1a365d] bg-opacity-30">
                    <tr>
                      <th className="px-6 py-3 text-left text-[#4a90a4] font-semibold">User</th>
                      <th className="px-6 py-3 text-left text-[#4a90a4] font-semibold">Type</th>
                      <th className="px-6 py-3 text-left text-[#4a90a4] font-semibold">Usage</th>
                      <th className="px-6 py-3 text-left text-[#4a90a4] font-semibold">Location</th>
                      <th className="px-6 py-3 text-left text-[#4a90a4] font-semibold">Status</th>
                      <th className="px-6 py-3 text-left text-[#4a90a4] font-semibold">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-t border-[#4a90a4] border-opacity-20 hover:bg-[#1a365d] hover:bg-opacity-10">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-white font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                              {user.fullName || 'Anonymous'}
                            </p>
                            <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                              {user.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.accountType === 'admin' ? 'bg-purple-900 text-purple-200' :
                            user.accountType === 'influencer' ? 'bg-yellow-900 text-yellow-200' :
                            user.accountType === 'partner' ? 'bg-blue-900 text-blue-200' :
                            'bg-gray-700 text-gray-300'
                          }`} style={{ fontFamily: 'Inter, sans-serif' }}>
                            {user.accountType}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {user.resumesGenerated} total
                          </p>
                          <p className="text-gray-300 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {user.freeResumesUsed} free used
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2 text-gray-300 text-sm">
                            <MapPin className="w-3 h-3" />
                            <span style={{ fontFamily: 'Inter, sans-serif' }}>
                              {user.country || 'Unknown'}
                            </span>
                          </div>
                          <p className="text-gray-400 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {user.device} • {user.browser}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          {user.flagged ? (
                            <div className="flex items-center space-x-2">
                              <Flag className="w-4 h-4 text-red-400" />
                              <span className="text-red-400 text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                                Flagged
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              <span className="text-green-400 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                                Active
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {new Date(user.lastActivity).toLocaleDateString()}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Influencers Tab */}
        {activeTab === 'influencers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[#4a90a4] text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>
                Influencer Management
              </h2>
              <button
                onClick={() => setShowAddInfluencer(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-[#4a90a4] to-[#5ba0b5] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                <span style={{ fontFamily: 'Inter, sans-serif' }}>Add Influencer</span>
              </button>
            </div>

            {/* Add Influencer Modal */}
            {showAddInfluencer && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="card-gradient rounded-lg p-6 border border-[#4a90a4] border-opacity-30 max-w-md w-full mx-4">
                  <h3 className="text-[#4a90a4] text-xl font-bold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Add New Influencer
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={newInfluencerEmail}
                        onChange={(e) => setNewInfluencerEmail(e.target.value)}
                        className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4]"
                        placeholder="influencer@example.com"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      />
                    </div>
                    <div>
                      <label className="block text-white mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Free Resume Limit
                      </label>
                      <input
                        type="number"
                        value={newInfluencerLimit}
                        onChange={(e) => setNewInfluencerLimit(parseInt(e.target.value) || 20)}
                        className="w-full bg-[#1a365d] bg-opacity-20 text-white border border-[#4a90a4] border-opacity-30 rounded-lg p-3 focus:border-[#4a90a4] focus:ring-1 focus:ring-[#4a90a4]"
                        min="1"
                        max="100"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={addInfluencer}
                        className="flex-1 bg-gradient-to-r from-[#4a90a4] to-[#5ba0b5] text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        Add Influencer
                      </button>
                      <button
                        onClick={() => setShowAddInfluencer(false)}
                        className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4">
              {influencers.map((influencer) => (
                <div key={influencer.id} className="card-gradient rounded-lg p-6 border border-[#4a90a4] border-opacity-30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-[#4a90a4] to-[#5ba0b5] rounded-full flex items-center justify-center">
                        <Award className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {influencer.value}
                        </p>
                        <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {influencer.privilege.freeResumes} free resumes allowed
                        </p>
                        {influencer.notes && (
                          <p className="text-gray-400 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {influencer.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        influencer.active ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                      }`} style={{ fontFamily: 'Inter, sans-serif' }}>
                        {influencer.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {influencers.length === 0 && (
                <div className="text-center py-12">
                  <Award className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
                    No influencers added yet
                  </p>
                  <p className="text-gray-500 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Add influencers to give them special access with multiple free resumes
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Whitelist Tab */}
        {activeTab === 'whitelist' && (
          <div className="space-y-6">
            <h2 className="text-[#4a90a4] text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>
              Whitelist Management
            </h2>
            
            <div className="grid gap-4">
              {whitelist.filter(entry => entry.accountType !== 'influencer').map((entry) => (
                <div key={entry.id} className="card-gradient rounded-lg p-6 border border-[#4a90a4] border-opacity-30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        entry.accountType === 'admin' ? 'bg-purple-900' :
                        entry.accountType === 'partner' ? 'bg-blue-900' :
                        entry.accountType === 'beta' ? 'bg-green-900' :
                        'bg-gray-700'
                      }`}>
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="text-white font-semibold text-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {entry.value}
                          </p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry.accountType === 'admin' ? 'bg-purple-900 text-purple-200' :
                            entry.accountType === 'partner' ? 'bg-blue-900 text-blue-200' :
                            entry.accountType === 'beta' ? 'bg-green-900 text-green-200' :
                            'bg-gray-700 text-gray-300'
                          }`} style={{ fontFamily: 'Inter, sans-serif' }}>
                            {entry.accountType}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {entry.privilege.freeResumes === 'unlimited' ? 'Unlimited' : entry.privilege.freeResumes} free resumes
                          {entry.privilege.discountPercent && ` • ${entry.privilege.discountPercent}% discount`}
                        </p>
                        {entry.notes && (
                          <p className="text-gray-400 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {entry.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        entry.active ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                      }`} style={{ fontFamily: 'Inter, sans-serif' }}>
                        {entry.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}