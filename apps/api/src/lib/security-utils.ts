import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { TRPCError } from '@trpc/server';

// Password security utilities
export class PasswordSecurity {
  private static readonly SALT_ROUNDS = 12;
  private static readonly MIN_PASSWORD_LENGTH = 8;
  private static readonly MAX_PASSWORD_LENGTH = 128;

  static async hashPassword(password: string): Promise<string> {
    this.validatePassword(password);
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) return false;
    return bcrypt.compare(password, hash);
  }

  static validatePassword(password: string): void {
    if (!password) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Password is required',
      });
    }

    if (password.length < this.MIN_PASSWORD_LENGTH) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Password must be at least ${this.MIN_PASSWORD_LENGTH} characters long`,
      });
    }

    if (password.length > this.MAX_PASSWORD_LENGTH) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Password must not exceed ${this.MAX_PASSWORD_LENGTH} characters`,
      });
    }

    // Check for basic complexity requirements
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      });
    }
  }

  static generateSecurePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one character from each required category
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

// JWT token utilities
export class TokenSecurity {
  private static readonly DEFAULT_EXPIRES_IN = '24h';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = '7d';

  static generateAccessToken(payload: any, expiresIn?: string): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: expiresIn || config.jwt.expiresIn || this.DEFAULT_EXPIRES_IN,
      issuer: 'resume-vita-api',
      audience: 'resume-vita-app',
    });
  }

  static generateRefreshToken(payload: any): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
      issuer: 'resume-vita-api',
      audience: 'resume-vita-app',
    });
  }

  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, config.jwt.secret, {
        issuer: 'resume-vita-api',
        audience: 'resume-vita-app',
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Token has expired',
        });
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid token',
        });
      }
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Token verification failed',
      });
    }
  }

  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    
    return parts[1];
  }

  static decodeTokenWithoutVerification(token: string): any {
    try {
      return jwt.decode(token);
    } catch {
      return null;
    }
  }
}

// Cryptographic utilities
export class CryptoSecurity {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  static generateSecureRandom(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static generateUUID(): string {
    return crypto.randomUUID();
  }

  static encrypt(text: string, key: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipher(this.ALGORITHM, key);
    cipher.setAutoPadding(true);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Note: In production, use a more robust encryption implementation
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: '', // Simplified for this implementation
    };
  }

  static decrypt(encryptedData: { encrypted: string; iv: string; tag: string }, key: string): string {
    try {
      const decipher = crypto.createDecipher(this.ALGORITHM, key);
      decipher.setAutoPadding(true);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Decryption failed',
      });
    }
  }

  static hash(data: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  static createHmac(data: string, secret: string, algorithm: string = 'sha256'): string {
    return crypto.createHmac(algorithm, secret).update(data).digest('hex');
  }

  static verifyHmac(data: string, signature: string, secret: string, algorithm: string = 'sha256'): boolean {
    const expectedSignature = this.createHmac(data, secret, algorithm);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  static generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    return { publicKey, privateKey };
  }
}

// Session security utilities
export class SessionSecurity {
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static readonly MAX_SESSIONS_PER_USER = 5;

  static generateSessionId(): string {
    return CryptoSecurity.generateSecureRandom(32);
  }

  static generateCSRFToken(): string {
    return CryptoSecurity.generateSecureRandom(16);
  }

  static validateSessionTimeout(lastActivity: Date): boolean {
    const now = new Date();
    const timeDiff = now.getTime() - lastActivity.getTime();
    return timeDiff < this.SESSION_TIMEOUT;
  }

  static sanitizeSessionData(sessionData: any): any {
    // Remove sensitive information from session data
    const sanitized = { ...sessionData };
    delete sanitized.password;
    delete sanitized.passwordHash;
    delete sanitized.privateKey;
    delete sanitized.secret;
    return sanitized;
  }
}

// Input validation and sanitization utilities
export class ValidationSecurity {
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.length >= 10 && phone.length <= 20;
  }

  static validateURL(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  static sanitizeHtml(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  static validateBase64(input: string): boolean {
    try {
      return Buffer.from(input, 'base64').toString('base64') === input;
    } catch {
      return false;
    }
  }

  static validateFileName(fileName: string): boolean {
    // Prevent path traversal and dangerous characters
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    const pathTraversal = /\.\./;
    
    return !dangerousChars.test(fileName) && 
           !pathTraversal.test(fileName) &&
           fileName.length > 0 &&
           fileName.length <= 255;
  }
}

// API key management
export class ApiKeySecurity {
  private static readonly API_KEY_PREFIX = 'rva_';
  private static readonly API_KEY_LENGTH = 32;

  static generateApiKey(): string {
    const randomPart = CryptoSecurity.generateSecureRandom(this.API_KEY_LENGTH);
    return `${this.API_KEY_PREFIX}${randomPart}`;
  }

  static validateApiKeyFormat(apiKey: string): boolean {
    return apiKey.startsWith(this.API_KEY_PREFIX) && 
           apiKey.length === this.API_KEY_PREFIX.length + (this.API_KEY_LENGTH * 2);
  }

  static hashApiKey(apiKey: string): string {
    return CryptoSecurity.hash(apiKey, 'sha256');
  }

  static verifyApiKey(apiKey: string, hashedKey: string): boolean {
    const computedHash = this.hashApiKey(apiKey);
    return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hashedKey));
  }
}

// Security audit utilities
export class SecurityAudit {
  static auditPasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 12) score += 2;
    else if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');

    // Character diversity
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Include numbers');

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    else feedback.push('Include special characters');

    // Common patterns (deduct points)
    if (/123|abc|qwe/i.test(password)) {
      score -= 2;
      feedback.push('Avoid common sequences');
    }

    const isStrong = score >= 5 && password.length >= 12;

    return {
      score: Math.max(0, Math.min(10, score)),
      feedback,
      isStrong,
    };
  }

  static auditApiKeyUsage(apiKey: string): {
    lastUsed: Date;
    usageCount: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  } {
    // This would typically connect to a usage tracking system
    // For now, return mock data
    return {
      lastUsed: new Date(),
      usageCount: 0,
      riskLevel: 'low',
      recommendations: [
        'Rotate API keys regularly',
        'Monitor usage patterns for anomalies',
        'Use least-privilege access controls',
      ],
    };
  }
}

// Security configuration manager
export class SecurityConfig {
  static getPasswordPolicy() {
    return {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
      preventReuse: 5, // Last 5 passwords
    };
  }

  static getSessionPolicy() {
    return {
      timeout: 30 * 60 * 1000, // 30 minutes
      maxConcurrentSessions: 5,
      requireReauthentication: 2 * 60 * 60 * 1000, // 2 hours
      enableCSRF: true,
      secureCookies: config.nodeEnv === 'production',
    };
  }

  static getRateLimitPolicy() {
    return {
      global: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 1000,
      },
      auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5, // 5 login attempts
      },
      api: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
      },
      upload: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 10,
      },
    };
  }
}