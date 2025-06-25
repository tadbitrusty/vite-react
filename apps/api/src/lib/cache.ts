import Redis from 'ioredis';
import { config } from './config';

export interface CacheConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string;
}

class CacheManager {
  private redis: Redis | null = null;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;

  constructor(private cacheConfig: CacheConfig = {}) {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    try {
      const redisUrl = config.redis.url;
      
      if (!redisUrl) {
        console.warn('Redis URL not configured, cache will be disabled');
        return;
      }

      const redisConfig: CacheConfig = {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keyPrefix: config.redis.keyPrefix || 'resume-vita:',
        ...this.cacheConfig
      };

      this.redis = new Redis(redisUrl, redisConfig);

      this.redis.on('connect', () => {
        this.isConnected = true;
        this.connectionAttempts = 0;
        console.log('✅ Redis connected successfully');
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        this.connectionAttempts++;
        console.error('❌ Redis connection error:', error);
        
        if (this.connectionAttempts >= this.maxConnectionAttempts) {
          console.warn('🔄 Max Redis connection attempts reached, disabling cache');
          this.redis = null;
        }
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        console.log('🔌 Redis connection closed');
      });

      this.redis.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
      this.redis = null;
    }
  }

  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    if (!this.redis || !this.isConnected) {
      return null;
    }

    try {
      const fullKey = this.buildKey(key, options.namespace);
      const value = await this.redis.get(fullKey);
      
      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error('❌ Cache get error:', error);
      return null;
    }
  }

  async set(
    key: string, 
    value: any, 
    options: CacheOptions = {}
  ): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, options.namespace);
      const serializedValue = JSON.stringify(value);
      
      if (options.ttl) {
        await this.redis.setex(fullKey, options.ttl, serializedValue);
      } else {
        await this.redis.set(fullKey, serializedValue);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Cache set error:', error);
      return false;
    }
  }

  async del(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, options.namespace);
      const result = await this.redis.del(fullKey);
      return result > 0;
    } catch (error) {
      console.error('❌ Cache delete error:', error);
      return false;
    }
  }

  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, options.namespace);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error('❌ Cache exists error:', error);
      return false;
    }
  }

  async ttl(key: string, options: CacheOptions = {}): Promise<number> {
    if (!this.redis || !this.isConnected) {
      return -1;
    }

    try {
      const fullKey = this.buildKey(key, options.namespace);
      return await this.redis.ttl(fullKey);
    } catch (error) {
      console.error('❌ Cache TTL error:', error);
      return -1;
    }
  }

  async expire(key: string, seconds: number, options: CacheOptions = {}): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, options.namespace);
      const result = await this.redis.expire(fullKey, seconds);
      return result === 1;
    } catch (error) {
      console.error('❌ Cache expire error:', error);
      return false;
    }
  }

  async keys(pattern: string, options: CacheOptions = {}): Promise<string[]> {
    if (!this.redis || !this.isConnected) {
      return [];
    }

    try {
      const fullPattern = this.buildKey(pattern, options.namespace);
      return await this.redis.keys(fullPattern);
    } catch (error) {
      console.error('❌ Cache keys error:', error);
      return [];
    }
  }

  async mget<T = any>(keys: string[], options: CacheOptions = {}): Promise<(T | null)[]> {
    if (!this.redis || !this.isConnected || keys.length === 0) {
      return [];
    }

    try {
      const fullKeys = keys.map(key => this.buildKey(key, options.namespace));
      const values = await this.redis.mget(...fullKeys);
      
      return values.map(value => {
        if (value === null) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      console.error('❌ Cache mget error:', error);
      return [];
    }
  }

  async mset(keyValuePairs: Record<string, any>, options: CacheOptions = {}): Promise<boolean> {
    if (!this.redis || !this.isConnected || Object.keys(keyValuePairs).length === 0) {
      return false;
    }

    try {
      const pipeline = this.redis.pipeline();
      
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        const fullKey = this.buildKey(key, options.namespace);
        const serializedValue = JSON.stringify(value);
        
        if (options.ttl) {
          pipeline.setex(fullKey, options.ttl, serializedValue);
        } else {
          pipeline.set(fullKey, serializedValue);
        }
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('❌ Cache mset error:', error);
      return false;
    }
  }

  async increment(key: string, by: number = 1, options: CacheOptions = {}): Promise<number | null> {
    if (!this.redis || !this.isConnected) {
      return null;
    }

    try {
      const fullKey = this.buildKey(key, options.namespace);
      const result = await this.redis.incrby(fullKey, by);
      
      if (options.ttl) {
        await this.redis.expire(fullKey, options.ttl);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Cache increment error:', error);
      return null;
    }
  }

  async flush(pattern?: string): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      if (pattern) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        await this.redis.flushdb();
      }
      return true;
    } catch (error) {
      console.error('❌ Cache flush error:', error);
      return false;
    }
  }

  async getHealth(): Promise<{
    connected: boolean;
    latency?: number;
    memory?: any;
    info?: any;
  }> {
    if (!this.redis) {
      return { connected: false };
    }

    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      const memory = await this.redis.memory('usage');
      const info = await this.redis.info('memory');

      return {
        connected: this.isConnected,
        latency,
        memory,
        info
      };
    } catch (error) {
      console.error('❌ Cache health check error:', error);
      return { connected: false };
    }
  }

  private buildKey(key: string, namespace?: string): string {
    if (namespace) {
      return `${namespace}:${key}`;
    }
    return key;
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
      this.redis = null;
      this.isConnected = false;
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const cache = new CacheManager();

// Export utilities for specific use cases
export class CacheKeys {
  static readonly USER = 'user';
  static readonly RESUME = 'resume';
  static readonly TEMPLATE = 'template';
  static readonly JOB = 'job';
  static readonly PAYMENT = 'payment';
  static readonly RATE_LIMIT = 'rate_limit';
  static readonly SESSION = 'session';
  static readonly FRAUD_DETECTION = 'fraud';

  static user(id: string): string {
    return `${this.USER}:${id}`;
  }

  static userByEmail(email: string): string {
    return `${this.USER}:email:${email}`;
  }

  static resume(id: string): string {
    return `${this.RESUME}:${id}`;
  }

  static resumeJob(jobId: string): string {
    return `${this.JOB}:${jobId}`;
  }

  static templates(): string {
    return `${this.TEMPLATE}:list`;
  }

  static template(id: string): string {
    return `${this.TEMPLATE}:${id}`;
  }

  static paymentSession(sessionId: string): string {
    return `${this.PAYMENT}:session:${sessionId}`;
  }

  static rateLimit(ip: string, endpoint: string): string {
    return `${this.RATE_LIMIT}:${ip}:${endpoint}`;
  }

  static fraudCheck(email: string): string {
    return `${this.FRAUD_DETECTION}:email:${email}`;
  }

  static fraudIp(ip: string): string {
    return `${this.FRAUD_DETECTION}:ip:${ip}`;
  }
}

// TTL constants (in seconds)
export const CacheTTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  VERY_LONG: 86400, // 24 hours
  USER_SESSION: 3600,
  RATE_LIMIT: 900,
  TEMPLATES: 3600,
  JOB_STATUS: 300,
  FRAUD_CHECK: 1800,
} as const;