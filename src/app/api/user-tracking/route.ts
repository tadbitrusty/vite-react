import { NextRequest, NextResponse } from 'next/server';
import { UserSession, WhitelistEntry, DEFAULT_WHITELIST, AbusePattern } from '@/types/tracking';

// In production, this would use a proper database (Supabase, PostgreSQL, etc.)
// For now, using in-memory storage for rapid development
let userSessions: UserSession[] = [];
let whitelistEntries: WhitelistEntry[] = [];
let abusePatterns: AbusePattern[] = [];

// Initialize default whitelist entries
function initializeWhitelist() {
  if (whitelistEntries.length === 0) {
    whitelistEntries = DEFAULT_WHITELIST.map((entry, index) => ({
      ...entry,
      id: `default-${index}`,
      addedDate: new Date()
    }));
  }
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = forwarded?.split(',')[0] || realIP || 'unknown';
  return clientIP;
}

// Parse user agent for device/browser info
function parseUserAgent(userAgent: string) {
  const device = /Mobile|Android|iPhone|iPad/.test(userAgent) ? 'mobile' : 'desktop';
  let browser = 'unknown';
  
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  
  return { device, browser };
}

// Check if email matches whitelist entry
function checkWhitelistStatus(email: string, ipAddress: string): WhitelistEntry | null {
  initializeWhitelist();
  
  for (const entry of whitelistEntries) {
    if (!entry.active) continue;
    
    if (entry.type === 'email' && entry.value.toLowerCase() === email.toLowerCase()) {
      return entry;
    }
    
    if (entry.type === 'domain') {
      const domain = email.split('@')[1];
      const pattern = entry.value.replace('*', '.*').replace(/\./g, '\\.');
      const regex = new RegExp(`^${pattern}$`, 'i');
      if (regex.test(domain)) {
        return entry;
      }
    }
  }
  
  return null;
}

// Check for abuse patterns
function detectAbusePatterns(email: string, ipAddress: string): string[] {
  const issues: string[] = [];
  
  // Check for multiple emails from same IP
  const sameIPUsers = userSessions.filter(session => 
    session.ipAddress === ipAddress && session.email !== email
  );
  if (sameIPUsers.length >= 3) {
    issues.push(`Multiple accounts (${sameIPUsers.length + 1}) from same IP`);
  }
  
  // Check for disposable email patterns
  const disposableDomains = ['10minutemail', 'tempmail', 'guerrillamail', 'mailinator'];
  const emailDomain = email.split('@')[1]?.toLowerCase() || '';
  if (disposableDomains.some(domain => emailDomain.includes(domain))) {
    issues.push('Disposable email detected');
  }
  
  // Check for rapid usage (more than 5 requests in last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentSessions = userSessions.filter(session => 
    (session.ipAddress === ipAddress || session.email === email) && 
    session.lastActivity > oneHourAgo
  );
  if (recentSessions.length > 5) {
    issues.push('Excessive usage in short timeframe');
  }
  
  return issues;
}

// Get or create user session
function getOrCreateUserSession(
  email: string, 
  fullName: string | undefined,
  ipAddress: string, 
  userAgent: string,
  referrer?: string
): UserSession {
  // Find existing session
  let session = userSessions.find(s => s.email.toLowerCase() === email.toLowerCase());
  
  const { device, browser } = parseUserAgent(userAgent);
  const whitelistEntry = checkWhitelistStatus(email, ipAddress);
  const abuseIssues = detectAbusePatterns(email, ipAddress);
  
  if (session) {
    // Update existing session
    session.lastActivity = new Date();
    session.ipAddress = ipAddress; // Update IP in case it changed
    session.userAgent = userAgent;
    if (fullName) session.fullName = fullName;
    session.device = device;
    session.browser = browser;
    
    // Update whitelist status
    if (whitelistEntry) {
      session.accountType = whitelistEntry.accountType;
      session.whitelistStatus = whitelistEntry.notes || 'Whitelisted';
      session.discountPercent = whitelistEntry.privilege.discountPercent;
    }
    
    // Update abuse flags
    if (abuseIssues.length > 0 && !session.flagged) {
      session.flagged = true;
      session.flaggedReason = abuseIssues.join('; ');
    }
  } else {
    // Create new session
    session = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: email.toLowerCase(),
      fullName,
      ipAddress,
      userAgent,
      device,
      browser,
      referrer,
      sessionStart: new Date(),
      lastActivity: new Date(),
      resumesGenerated: 0,
      freeResumesUsed: 0,
      accountType: whitelistEntry?.accountType || 'regular',
      whitelistStatus: whitelistEntry?.notes,
      discountPercent: whitelistEntry?.privilege.discountPercent,
      flagged: abuseIssues.length > 0,
      flaggedReason: abuseIssues.length > 0 ? abuseIssues.join('; ') : undefined
    };
    
    userSessions.push(session);
  }
  
  return session;
}

// Check if user can use free service
function canUseFreeService(session: UserSession): { allowed: boolean; reason?: string } {
  const whitelistEntry = checkWhitelistStatus(session.email, session.ipAddress);
  
  // Whitelisted users with unlimited access
  if (whitelistEntry && whitelistEntry.privilege.freeResumes === 'unlimited') {
    return { allowed: true };
  }
  
  // Whitelisted users with limited access
  if (whitelistEntry && typeof whitelistEntry.privilege.freeResumes === 'number') {
    if (session.freeResumesUsed < whitelistEntry.privilege.freeResumes) {
      return { allowed: true };
    } else {
      return { 
        allowed: false, 
        reason: `Whitelist limit reached (${whitelistEntry.privilege.freeResumes} free resumes)` 
      };
    }
  }
  
  // Regular users get 1 free resume
  if (session.freeResumesUsed < 1) {
    return { allowed: true };
  }
  
  return { 
    allowed: false, 
    reason: 'Free resume limit reached (1 per user)' 
  };
}

// POST: Track user and check eligibility
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, fullName, action = 'check_eligibility' } = body;
    
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }
    
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referrer = request.headers.get('referer');
    
    const session = getOrCreateUserSession(email, fullName, ipAddress, userAgent, referrer);
    
    if (action === 'check_eligibility') {
      const eligibility = canUseFreeService(session);
      const whitelistEntry = checkWhitelistStatus(email, ipAddress);
      
      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          email: session.email,
          accountType: session.accountType,
          whitelistStatus: session.whitelistStatus,
          freeResumesUsed: session.freeResumesUsed,
          discountPercent: session.discountPercent,
          flagged: session.flagged,
          flaggedReason: session.flaggedReason
        },
        eligibility: {
          canUseFree: eligibility.allowed,
          reason: eligibility.reason,
          whitelistType: whitelistEntry?.type,
          privilegeLevel: whitelistEntry?.privilege
        }
      });
    }
    
    if (action === 'record_usage') {
      session.resumesGenerated++;
      session.freeResumesUsed++;
      session.lastActivity = new Date();
      
      return NextResponse.json({
        success: true,
        message: 'Usage recorded',
        session: {
          id: session.id,
          resumesGenerated: session.resumesGenerated,
          freeResumesUsed: session.freeResumesUsed
        }
      });
    }
    
    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('User tracking error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Retrieve user statistics (admin only)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    
    if (action === 'stats') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const stats = {
        totalUsers: userSessions.length,
        activeToday: userSessions.filter(s => s.lastActivity >= today).length,
        freeResumesToday: userSessions.filter(s => s.lastActivity >= today).reduce((sum, s) => sum + s.freeResumesUsed, 0),
        flaggedUsers: userSessions.filter(s => s.flagged).length,
        whitelistEntries: whitelistEntries.filter(e => e.active).length
      };
      
      return NextResponse.json({ success: true, stats });
    }
    
    if (action === 'users') {
      return NextResponse.json({ 
        success: true, 
        users: userSessions.map(s => ({
          id: s.id,
          email: s.email,
          fullName: s.fullName,
          accountType: s.accountType,
          resumesGenerated: s.resumesGenerated,
          freeResumesUsed: s.freeResumesUsed,
          lastActivity: s.lastActivity,
          flagged: s.flagged,
          flaggedReason: s.flaggedReason,
          ipAddress: s.ipAddress,
          country: s.country,
          device: s.device,
          browser: s.browser
        }))
      });
    }
    
    if (action === 'whitelist') {
      return NextResponse.json({ 
        success: true, 
        whitelist: whitelistEntries 
      });
    }
    
    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('User tracking GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}