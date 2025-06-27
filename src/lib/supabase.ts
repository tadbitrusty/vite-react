import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database schema types
export interface UserSession {
  id: string;
  email: string;
  full_name?: string;
  account_type: string;
  resumes_generated: number;
  free_resumes_used: number;
  last_activity: string;
  flagged: boolean;
  flagged_reason?: string;
  ip_address: string;
  country?: string;
  device: string;
  browser: string;
  created_at: string;
  updated_at: string;
}

export interface WhitelistEntry {
  id: string;
  type: 'email' | 'domain' | 'ip_range';
  value: string;
  privilege: {
    free_resumes: number | string; // 'unlimited' or number
    discount_percent?: number;
    premium_access?: boolean;
  };
  account_type: string;
  notes?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AbusePattern {
  id: string;
  pattern_type: 'rapid_requests' | 'email_pattern' | 'ip_suspicious' | 'device_fingerprint';
  pattern_value: string;
  severity: 'low' | 'medium' | 'high';
  occurrences: number;
  first_seen: string;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface AdminSession {
  id: string;
  username: string;
  token: string;
  expires_at: string;
  created_at: string;
}

// Database helper functions
export async function getUserByEmail(email: string): Promise<UserSession | null> {
  console.log(`[DB] Getting user by email: ${email}`);
  
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error && error.code !== 'PGRST116') { // Not found is ok
    console.error('[DB] Error getting user by email:', error);
    return null;
  }
  
  return data;
}

export async function createOrUpdateUser(userSession: Partial<UserSession>): Promise<UserSession | null> {
  console.log(`[DB] Creating/updating user: ${userSession.email}`);
  
  const now = new Date().toISOString();
  const userData = {
    ...userSession,
    updated_at: now,
    created_at: userSession.created_at || now
  };
  
  const { data, error } = await supabase
    .from('user_sessions')
    .upsert(userData, { onConflict: 'email' })
    .select()
    .single();
  
  if (error) {
    console.error('[DB] Error creating/updating user:', error);
    return null;
  }
  
  console.log(`[DB] User created/updated successfully: ${data.email}`);
  return data;
}

export async function getAllUsers(): Promise<UserSession[]> {
  console.log('[DB] Getting all users');
  
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .order('last_activity', { ascending: false });
  
  if (error) {
    console.error('[DB] Error getting all users:', error);
    return [];
  }
  
  console.log(`[DB] Retrieved ${data.length} users`);
  return data;
}

export async function getAllWhitelist(): Promise<WhitelistEntry[]> {
  console.log('[DB] Getting all whitelist entries');
  
  const { data, error } = await supabase
    .from('whitelist_entries')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('[DB] Error getting whitelist entries:', error);
    return [];
  }
  
  console.log(`[DB] Retrieved ${data.length} whitelist entries`);
  return data;
}

export async function getWhitelistByEmail(email: string): Promise<WhitelistEntry | null> {
  console.log(`[DB] Checking whitelist for email: ${email}`);
  
  const { data, error } = await supabase
    .from('whitelist_entries')
    .select('*')
    .or(`value.eq.${email},value.eq.${email.split('@')[1]}`)
    .eq('active', true)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('[DB] Error checking whitelist:', error);
    return null;
  }
  
  if (data) {
    console.log(`[DB] Whitelist entry found for ${email}: ${data.account_type}`);
  }
  
  return data;
}

export async function createWhitelistEntry(entry: Partial<WhitelistEntry>): Promise<WhitelistEntry | null> {
  console.log(`[DB] Creating whitelist entry: ${entry.value}`);
  
  const now = new Date().toISOString();
  const entryData = {
    ...entry,
    created_at: now,
    updated_at: now
  };
  
  const { data, error } = await supabase
    .from('whitelist_entries')
    .insert(entryData)
    .select()
    .single();
  
  if (error) {
    console.error('[DB] Error creating whitelist entry:', error);
    return null;
  }
  
  console.log(`[DB] Whitelist entry created: ${data.value}`);
  return data;
}

export async function createAbusePattern(pattern: Partial<AbusePattern>): Promise<AbusePattern | null> {
  console.log(`[DB] Creating abuse pattern: ${pattern.pattern_type}:${pattern.pattern_value}`);
  
  const now = new Date().toISOString();
  const patternData = {
    ...pattern,
    created_at: now,
    updated_at: now
  };
  
  const { data, error } = await supabase
    .from('abuse_patterns')
    .insert(patternData)
    .select()
    .single();
  
  if (error) {
    console.error('[DB] Error creating abuse pattern:', error);
    return null;
  }
  
  console.log(`[DB] Abuse pattern created: ${data.pattern_type}`);
  return data;
}

export async function getAdminSession(token: string): Promise<AdminSession | null> {
  console.log('[DB] Validating admin session');
  
  const { data, error } = await supabase
    .from('admin_sessions')
    .select('*')
    .eq('token', token)
    .gte('expires_at', new Date().toISOString())
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('[DB] Error getting admin session:', error);
    return null;
  }
  
  return data;
}

export async function createAdminSession(username: string, token: string, expiresAt: string): Promise<AdminSession | null> {
  console.log(`[DB] Creating admin session for: ${username}`);
  
  const now = new Date().toISOString();
  const sessionData: Partial<AdminSession> = {
    username,
    token,
    expires_at: expiresAt,
    created_at: now
  };
  
  const { data, error } = await supabase
    .from('admin_sessions')
    .insert(sessionData)
    .select()
    .single();
  
  if (error) {
    console.error('[DB] Error creating admin session:', error);
    return null;
  }
  
  console.log(`[DB] Admin session created for: ${username}`);
  return data;
}

export async function deleteAdminSession(token: string): Promise<boolean> {
  console.log('[DB] Deleting admin session');
  
  const { error } = await supabase
    .from('admin_sessions')
    .delete()
    .eq('token', token);
  
  if (error) {
    console.error('[DB] Error deleting admin session:', error);
    return false;
  }
  
  console.log('[DB] Admin session deleted');
  return true;
}

// Statistics functions
export async function getStats() {
  console.log('[DB] Getting statistics');
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    
    const [usersResult, todayUsersResult, whitelistResult] = await Promise.all([
      supabase.from('user_sessions').select('id, flagged', { count: 'exact' }),
      supabase.from('user_sessions').select('id', { count: 'exact' }).gte('last_activity', todayISO),
      supabase.from('whitelist_entries').select('id', { count: 'exact' })
    ]);
    
    const totalUsers = usersResult.count || 0;
    const activeToday = todayUsersResult.count || 0;
    const whitelistEntries = whitelistResult.count || 0;
    const flaggedUsers = usersResult.data?.filter(u => u.flagged).length || 0;
    
    // Get free resumes today count
    const { data: freeResumesData } = await supabase
      .from('user_sessions')
      .select('free_resumes_used')
      .gte('last_activity', todayISO);
    
    const freeResumesToday = freeResumesData?.reduce((sum, user) => sum + (user.free_resumes_used || 0), 0) || 0;
    
    const stats = {
      totalUsers,
      activeToday,
      freeResumesToday,
      flaggedUsers,
      whitelistEntries
    };
    
    console.log('[DB] Statistics retrieved:', stats);
    return stats;
  } catch (error) {
    console.error('[DB] Error getting statistics:', error);
    return {
      totalUsers: 0,
      activeToday: 0,
      freeResumesToday: 0,
      flaggedUsers: 0,
      whitelistEntries: 0
    };
  }
}