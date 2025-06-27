import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getAdminSession, createAdminSession, deleteAdminSession } from '../../../../lib/supabase';

// Admin credentials (in production, store in secure database)
const ADMIN_CREDENTIALS = {
  username: 'tadbitrusty',
  email: 'admin@resumevita.com',
  passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LQ4lqe7hzO.JQvpqc4KJPHixOQ0l7qXQRzI9S' // Pandora8533!
};

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'resume-vita-admin-secret-key-2024';

// Hash password utility (for generating the hash above)
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate JWT token
function generateToken(username: string): string {
  return jwt.sign(
    { username, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Generate secure token for database storage
function generateSecureToken(): string {
  return `admin_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
}

// Verify JWT token
export function verifyAdminToken(token: string): { username: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

// POST: Admin login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, action = 'login' } = body;
    
    if (action === 'login') {
      if (!username || !password) {
        return NextResponse.json(
          { success: false, message: 'Username and password are required' },
          { status: 400 }
        );
      }
      
      // Check credentials
      if (username !== ADMIN_CREDENTIALS.username) {
        return NextResponse.json(
          { success: false, message: 'Invalid credentials' },
          { status: 401 }
        );
      }
      
      // For development speed, also allow direct password match
      const passwordMatch = password === 'Pandora8533!' || 
                           await verifyPassword(password, ADMIN_CREDENTIALS.passwordHash);
      
      if (!passwordMatch) {
        return NextResponse.json(
          { success: false, message: 'Invalid credentials' },
          { status: 401 }
        );
      }
      
      // Generate tokens
      const jwtToken = generateToken(username);
      const secureToken = generateSecureToken();
      
      // Store session in database
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
      const adminSession = await createAdminSession(username, secureToken, expiresAt);
      
      if (!adminSession) {
        console.error('[ADMIN_AUTH] Failed to create admin session in database');
        return NextResponse.json(
          { success: false, message: 'Failed to create session' },
          { status: 500 }
        );
      }
      
      console.log(`[ADMIN_AUTH] Admin session created for: ${username}`);
      
      // Set secure cookie
      const response = NextResponse.json({
        success: true,
        message: 'Login successful',
        user: {
          username: ADMIN_CREDENTIALS.username,
          email: ADMIN_CREDENTIALS.email,
          role: 'admin'
        }
      });
      
      response.cookies.set('admin-token', secureToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 // 24 hours
      });
      
      return response;
    }
    
    if (action === 'verify') {
      const token = request.cookies.get('admin-token')?.value ||
                   request.headers.get('authorization')?.replace('Bearer ', '');
      
      if (!token) {
        console.log('[ADMIN_AUTH] No token provided for verification');
        return NextResponse.json(
          { success: false, message: 'No token provided' },
          { status: 401 }
        );
      }
      
      // Check token in database
      const adminSession = await getAdminSession(token);
      
      if (!adminSession) {
        console.log('[ADMIN_AUTH] Invalid or expired admin session');
        return NextResponse.json(
          { success: false, message: 'Invalid or expired session' },
          { status: 401 }
        );
      }
      
      console.log(`[ADMIN_AUTH] Valid admin session verified for: ${adminSession.username}`);
      
      return NextResponse.json({
        success: true,
        user: {
          username: adminSession.username,
          role: 'admin'
        }
      });
    }
    
    if (action === 'logout') {
      const token = request.cookies.get('admin-token')?.value ||
                   request.headers.get('authorization')?.replace('Bearer ', '');
      
      if (token) {
        // Delete session from database
        const deleted = await deleteAdminSession(token);
        if (deleted) {
          console.log('[ADMIN_AUTH] Admin session deleted from database');
        }
      }
      
      const response = NextResponse.json({
        success: true,
        message: 'Logged out successfully'
      });
      
      response.cookies.delete('admin-token');
      return response;
    }
    
    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Check authentication status
export async function GET(request: NextRequest) {
  try {
    console.log('[ADMIN_AUTH] GET auth check request');
    
    const token = request.cookies.get('admin-token')?.value ||
                 request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('[ADMIN_AUTH] No token provided for auth check');
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Check token in database
    const adminSession = await getAdminSession(token);
    
    if (!adminSession) {
      console.log('[ADMIN_AUTH] Invalid or expired admin session in auth check');
      return NextResponse.json(
        { success: false, message: 'Invalid or expired session' },
        { status: 401 }
      );
    }
    
    console.log(`[ADMIN_AUTH] Valid admin session confirmed for: ${adminSession.username}`);
    
    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        username: adminSession.username,
        role: 'admin'
      }
    });
    
  } catch (error) {
    console.error('[ADMIN_AUTH] Auth check error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}