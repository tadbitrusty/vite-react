import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../lib/trpc';
import { UserSchema } from '@resume-vita/types';

export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }),

  create: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
        phone: z.string().optional(),
        location: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        return existingUser;
      }

      // Create new user
      const user = await ctx.prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          phone: input.phone,
          location: input.location,
        },
      });

      return user;
    }),

  checkEmailExists: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true, isFirstTime: true },
      });

      return {
        exists: !!user,
        isFirstTime: user?.isFirstTime ?? true,
      };
    }),
});