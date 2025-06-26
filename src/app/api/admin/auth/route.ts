import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

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
      
      // Generate token
      const token = generateToken(username);
      
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
      
      response.cookies.set('admin-token', token, {
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
        return NextResponse.json(
          { success: false, message: 'No token provided' },
          { status: 401 }
        );
      }
      
      const decoded = verifyAdminToken(token);
      
      if (!decoded) {
        return NextResponse.json(
          { success: false, message: 'Invalid token' },
          { status: 401 }
        );
      }
      
      return NextResponse.json({
        success: true,
        user: {
          username: decoded.username,
          role: decoded.role
        }
      });
    }
    
    if (action === 'logout') {
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
    const token = request.cookies.get('admin-token')?.value ||
                 request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const decoded = verifyAdminToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        username: decoded.username,
        role: decoded.role
      }
    });
    
  } catch (error) {
    console.error('Admin auth check error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}