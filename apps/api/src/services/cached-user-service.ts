import { User, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { CachedService } from '../middleware/cache-middleware';
import { CacheKeys, CacheTTL } from '../lib/cache';
import { TRPCError } from '@trpc/server';

export class CachedUserService extends CachedService {
  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    try {
      // Check if user already exists (with cache)
      const existingUser = await this.getUserByEmail(data.email);
      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists',
        });
      }

      // Create user in database
      const user = await prisma.user.create({ data });

      // Cache the new user
      await Promise.all([
        this.cacheSet(CacheKeys.user(user.id), user, CacheTTL.LONG),
        this.cacheSet(CacheKeys.userByEmail(user.email), user, CacheTTL.LONG),
      ]);

      return user;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      
      console.error('Create user error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create user',
      });
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      // Try cache first
      const cached = await this.cacheGet<User>(CacheKeys.user(id));
      if (cached) {
        return cached;
      }

      // Fallback to database
      const user = await prisma.user.findUnique({
        where: { id },
      });

      // Cache if found
      if (user) {
        await Promise.all([
          this.cacheSet(CacheKeys.user(user.id), user, CacheTTL.LONG),
          this.cacheSet(CacheKeys.userByEmail(user.email), user, CacheTTL.LONG),
        ]);
      }

      return user;
    } catch (error) {
      console.error('Get user by ID error:', error);
      // Fallback to database on cache error
      return prisma.user.findUnique({ where: { id } });
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      // Try cache first
      const cached = await this.cacheGet<User>(CacheKeys.userByEmail(email));
      if (cached) {
        return cached;
      }

      // Fallback to database
      const user = await prisma.user.findUnique({
        where: { email },
      });

      // Cache if found
      if (user) {
        await Promise.all([
          this.cacheSet(CacheKeys.user(user.id), user, CacheTTL.LONG),
          this.cacheSet(CacheKeys.userByEmail(user.email), user, CacheTTL.LONG),
        ]);
      }

      return user;
    } catch (error) {
      console.error('Get user by email error:', error);
      // Fallback to database on cache error
      return prisma.user.findUnique({ where: { email } });
    }
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    try {
      // Update in database
      const user = await prisma.user.update({
        where: { id },
        data,
      });

      // Update cache
      await Promise.all([
        this.cacheSet(CacheKeys.user(user.id), user, CacheTTL.LONG),
        this.cacheSet(CacheKeys.userByEmail(user.email), user, CacheTTL.LONG),
      ]);

      return user;
    } catch (error) {
      console.error('Update user error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update user',
      });
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      // Get user first to get email for cache invalidation
      const user = await this.getUserById(id);
      
      // Delete from database
      await prisma.user.delete({
        where: { id },
      });

      // Remove from cache
      await Promise.all([
        this.cacheDel(CacheKeys.user(id)),
        user ? this.cacheDel(CacheKeys.userByEmail(user.email)) : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Delete user error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete user',
      });
    }
  }

  async checkEmailExists(email: string): Promise<boolean> {
    try {
      // Check cache first
      const cached = await this.cacheGet<User>(CacheKeys.userByEmail(email));
      if (cached) {
        return true;
      }

      // Check database
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true }, // Only select minimal fields
      });

      return !!user;
    } catch (error) {
      console.error('Check email exists error:', error);
      // Fallback to database query
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      return !!user;
    }
  }

  async markEmailVerified(id: string): Promise<User> {
    try {
      const user = await this.updateUser(id, {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      });

      return user;
    } catch (error) {
      console.error('Mark email verified error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to verify email',
      });
    }
  }

  async updateLastLogin(id: string): Promise<User> {
    try {
      const user = await this.updateUser(id, {
        lastLoginAt: new Date(),
        isFirstTime: false,
      });

      return user;
    } catch (error) {
      console.error('Update last login error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update last login',
      });
    }
  }

  async getUserStats(id: string): Promise<{
    totalResumes: number;
    totalPayments: number;
    totalRevenue: number;
    lastActivity: Date | null;
  }> {
    try {
      // Try cache first
      const cacheKey = `user_stats:${id}`;
      const cached = await this.cacheGet<any>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get stats from database
      const [resumeCount, paymentStats] = await Promise.all([
        prisma.resume.count({
          where: { userId: id },
        }),
        prisma.paymentRecord.aggregate({
          where: {
            userId: id,
            status: 'COMPLETED',
          },
          _count: { id: true },
          _sum: { amount: true },
        }),
      ]);

      // Get last activity
      const [lastResume, lastPayment] = await Promise.all([
        prisma.resume.findFirst({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
        prisma.paymentRecord.findFirst({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ]);

      const lastActivity = [lastResume?.createdAt, lastPayment?.createdAt]
        .filter(Boolean)
        .sort((a, b) => b!.getTime() - a!.getTime())[0] || null;

      const stats = {
        totalResumes: resumeCount,
        totalPayments: paymentStats._count.id,
        totalRevenue: paymentStats._sum.amount || 0,
        lastActivity,
      };

      // Cache for shorter time since it's dynamic data
      await this.cacheSet(cacheKey, stats, CacheTTL.SHORT);

      return stats;
    } catch (error) {
      console.error('Get user stats error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get user statistics',
      });
    }
  }

  async searchUsers(
    query: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<User[]> {
    try {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      });

      return users;
    } catch (error) {
      console.error('Search users error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to search users',
      });
    }
  }

  async invalidateUserCache(id: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: { email: true },
      });

      await Promise.all([
        this.cacheDel(CacheKeys.user(id)),
        user ? this.cacheDel(CacheKeys.userByEmail(user.email)) : Promise.resolve(),
        this.cacheDel(`user_stats:${id}`),
      ]);
    } catch (error) {
      console.error('Invalidate user cache error:', error);
    }
  }
}

export const cachedUserService = new CachedUserService();