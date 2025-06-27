import { NextRequest, NextResponse } from 'next/server';
import { 
  getUserByEmail, 
  createOrUpdateUser, 
  getAllUsers, 
  getAllWhitelist, 
  getWhitelistByEmail,
  createAbusePattern,
  getStats,
  UserSession,
  WhitelistEntry,
  AbusePattern
} from '../../../lib/supabase';

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
async function checkWhitelistStatus(email: string, ipAddress: string): Promise<WhitelistEntry | null> {
  try {
    const whitelistEntry = await getWhitelistByEmail(email);
    return whitelistEntry;
  } catch (error) {
    console.error('[USER_TRACKING] Error checking whitelist status:', error);
    return null;
  }
}

// Check for abuse patterns
async function detectAbusePatterns(email: string, ipAddress: string): Promise<string[]> {
  const issues: string[] = [];
  
  try {
    // For now, implementing basic abuse detection
    // In production, this would query the database for more sophisticated patterns
    
    // Check for disposable email patterns
    const disposableDomains = ['10minutemail', 'tempmail', 'guerrillamail', 'mailinator'];
    const emailDomain = email.split('@')[1]?.toLowerCase() || '';
    if (disposableDomains.some(domain => emailDomain.includes(domain))) {
      issues.push('Disposable email detected');
      
      // Log abuse pattern
      await createAbusePattern({
        pattern_type: 'email_pattern',
        pattern_value: emailDomain,
        severity: 'medium',
        occurrences: 1,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString()
      });
    }
    
    // Additional abuse patterns can be added here
    
  } catch (error) {
    console.error('[USER_TRACKING] Error detecting abuse patterns:', error);
  }
  
  return issues;
}

// Get or create user session
async function getOrCreateUserSession(
  email: string, 
  fullName: string | undefined,
  ipAddress: string, 
  userAgent: string,
  referrer?: string
): Promise<UserSession | null> {
  try {
    console.log(`[USER_TRACKING] Getting/creating session for: ${email}`);
    
    // Find existing session
    let session = await getUserByEmail(email);
    
    const { device, browser } = parseUserAgent(userAgent);
    const whitelistEntry = await checkWhitelistStatus(email, ipAddress);
    const abuseIssues = await detectAbusePatterns(email, ipAddress);
    
    const now = new Date().toISOString();
    
    if (session) {
      console.log(`[USER_TRACKING] Updating existing session for: ${email}`);
      
      // Update existing session
      const updatedSession = await createOrUpdateUser({
        id: session.id,
        email: session.email,
        full_name: fullName || session.full_name,
        ip_address: ipAddress,
        device,
        browser,
        last_activity: now,
        account_type: whitelistEntry?.account_type || session.account_type,
        resumes_generated: session.resumes_generated,
        free_resumes_used: session.free_resumes_used,
        flagged: abuseIssues.length > 0 || session.flagged,
        flagged_reason: abuseIssues.length > 0 ? abuseIssues.join('; ') : session.flagged_reason,
        country: session.country,
        created_at: session.created_at,
        updated_at: now
      });
      
      return updatedSession;
    } else {
      console.log(`[USER_TRACKING] Creating new session for: ${email}`);
      
      // Create new session
      const newSession = await createOrUpdateUser({
        email: email.toLowerCase(),
        full_name: fullName,
        ip_address: ipAddress,
        device,
        browser,
        last_activity: now,
        account_type: whitelistEntry?.account_type || 'standard',
        resumes_generated: 0,
        free_resumes_used: 0,
        flagged: abuseIssues.length > 0,
        flagged_reason: abuseIssues.length > 0 ? abuseIssues.join('; ') : undefined,
        country: undefined, // Can be enhanced with IP geolocation
        created_at: now,
        updated_at: now
      });
      
      return newSession;
    }
  } catch (error) {
    console.error('[USER_TRACKING] Error getting/creating user session:', error);
    return null;
  }
}

// Check if user can use free service
async function canUseFreeService(session: UserSession): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const whitelistEntry = await getWhitelistByEmail(session.email);
    
    // Whitelisted users with unlimited access
    if (whitelistEntry && whitelistEntry.privilege.free_resumes === 'unlimited') {
      console.log(`[USER_TRACKING] User ${session.email} has unlimited free access`);
      return { allowed: true };
    }
    
    // Whitelisted users with limited access
    if (whitelistEntry && typeof whitelistEntry.privilege.free_resumes === 'number') {
      if (session.free_resumes_used < whitelistEntry.privilege.free_resumes) {
        console.log(`[USER_TRACKING] User ${session.email} has whitelist access: ${session.free_resumes_used}/${whitelistEntry.privilege.free_resumes}`);
        return { allowed: true };
      } else {
        console.log(`[USER_TRACKING] User ${session.email} reached whitelist limit: ${whitelistEntry.privilege.free_resumes}`);
        return { 
          allowed: false, 
          reason: `Whitelist limit reached (${whitelistEntry.privilege.free_resumes} free resumes)` 
        };
      }
    }
    
    // Regular users get 1 free resume
    if (session.free_resumes_used < 1) {
      console.log(`[USER_TRACKING] User ${session.email} can use free service: ${session.free_resumes_used}/1`);
      return { allowed: true };
    }
    
    console.log(`[USER_TRACKING] User ${session.email} exceeded free limit: ${session.free_resumes_used}/1`);
    return { 
      allowed: false, 
      reason: 'Free resume limit reached (1 per user)' 
    };
  } catch (error) {
    console.error('[USER_TRACKING] Error checking free service eligibility:', error);
    return { allowed: false, reason: 'Error checking eligibility' };
  }
}

// POST: Track user and check eligibility
export async function POST(request: NextRequest) {
  try {
    console.log('[USER_TRACKING] POST request received');
    console.log('[USER_TRACKING] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('[USER_TRACKING] Environment check - Supabase configured:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    const body = await request.json();
    const { email, fullName, action = 'check_eligibility' } = body;
    
    console.log(`[USER_TRACKING] Processing - Email: ${email}, Action: ${action}`);
    
    if (!email) {
      console.log('[USER_TRACKING] No email provided');
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }
    
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referrer = request.headers.get('referer');
    
    console.log(`[USER_TRACKING] Processing action: ${action} for email: ${email}`);
    
    const session = await getOrCreateUserSession(email, fullName, ipAddress, userAgent, referrer);
    
    if (!session) {
      console.error('[USER_TRACKING] Failed to create/get user session');
      console.error('[USER_TRACKING] This indicates a Supabase connection or configuration issue');
      return NextResponse.json(
        { success: false, message: 'Database connection failed - check Supabase configuration' },
        { status: 500 }
      );
    }
    
    console.log(`[USER_TRACKING] Session retrieved/created successfully for ${email}`);
    
    if (action === 'check_eligibility') {
      const eligibility = await canUseFreeService(session);
      const whitelistEntry = await getWhitelistByEmail(email);
      
      console.log(`[USER_TRACKING] Eligibility check for ${email}: ${eligibility.allowed}`);
      
      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          email: session.email,
          accountType: session.account_type,
          freeResumesUsed: session.free_resumes_used,
          flagged: session.flagged,
          flaggedReason: session.flagged_reason
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
      console.log(`[USER_TRACKING] Recording usage for ${email}`);
      
      // Update usage counts
      const updatedSession = await createOrUpdateUser({
        id: session.id,
        email: session.email,
        full_name: session.full_name,
        ip_address: session.ip_address,
        device: session.device,
        browser: session.browser,
        last_activity: new Date().toISOString(),
        account_type: session.account_type,
        resumes_generated: session.resumes_generated + 1,
        free_resumes_used: session.free_resumes_used + 1,
        flagged: session.flagged,
        flagged_reason: session.flagged_reason,
        country: session.country,
        created_at: session.created_at,
        updated_at: new Date().toISOString()
      });
      
      if (!updatedSession) {
        console.error('[USER_TRACKING] Failed to update user session');
        return NextResponse.json(
          { success: false, message: 'Failed to record usage' },
          { status: 500 }
        );
      }
      
      console.log(`[USER_TRACKING] Usage recorded for ${email}: ${updatedSession.resumes_generated} total, ${updatedSession.free_resumes_used} free`);
      
      return NextResponse.json({
        success: true,
        message: 'Usage recorded',
        session: {
          id: updatedSession.id,
          resumesGenerated: updatedSession.resumes_generated,
          freeResumesUsed: updatedSession.free_resumes_used
        }
      });
    }
    
    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('[USER_TRACKING] POST error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Retrieve user statistics (admin only)
export async function GET(request: NextRequest) {
  try {
    console.log('[USER_TRACKING] GET request received');
    
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    
    console.log(`[USER_TRACKING] GET action: ${action}`);
    
    if (action === 'stats') {
      const stats = await getStats();
      console.log(`[USER_TRACKING] Stats retrieved:`, stats);
      return NextResponse.json({ success: true, stats });
    }
    
    if (action === 'users') {
      const users = await getAllUsers();
      console.log(`[USER_TRACKING] Retrieved ${users.length} users`);
      
      return NextResponse.json({ 
        success: true, 
        users: users.map(s => ({
          id: s.id,
          email: s.email,
          fullName: s.full_name,
          accountType: s.account_type,
          resumesGenerated: s.resumes_generated,
          freeResumesUsed: s.free_resumes_used,
          lastActivity: s.last_activity,
          flagged: s.flagged,
          flaggedReason: s.flagged_reason,
          ipAddress: s.ip_address,
          country: s.country,
          device: s.device,
          browser: s.browser
        }))
      });
    }
    
    if (action === 'whitelist') {
      const whitelist = await getAllWhitelist();
      console.log(`[USER_TRACKING] Retrieved ${whitelist.length} whitelist entries`);
      
      return NextResponse.json({ 
        success: true, 
        whitelist: whitelist.map(entry => ({
          id: entry.id,
          type: entry.type,
          value: entry.value,
          privilege: entry.privilege,
          accountType: entry.account_type,
          notes: entry.notes,
          active: entry.active
        }))
      });
    }
    
    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('[USER_TRACKING] GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}