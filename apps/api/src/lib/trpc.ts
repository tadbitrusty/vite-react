import { TRPCError, initTRPC } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { prisma } from './prisma';
import { config } from '@resume-vita/config';

// Context creation
export const createTRPCContext = async (opts: CreateNextContextOptions | { req: NextRequest }) => {
  const req = opts.req;
  
  // Get user from session/auth header if needed
  const getUser = async () => {
    // TODO: Implement authentication logic
    // For now, return null for unauthenticated requests
    return null;
  };

  return {
    prisma,
    user: await getUser(),
    req,
    config,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

// tRPC initialization
const t = initTRPC.context<Context>().create({
  transformer: {
    serialize: (object) => JSON.stringify(object),
    deserialize: (object) => JSON.parse(object),
  },
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Middleware for authentication
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

// Middleware for rate limiting
const rateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  // TODO: Implement rate limiting logic
  // For now, just pass through
  return next();
});

export const rateLimitedProcedure = publicProcedure.use(rateLimitMiddleware);

// Middleware for logging
const loggingMiddleware = t.middleware(async ({ path, type, next, ctx }) => {
  const start = Date.now();
  
  try {
    const result = await next();
    const durationMs = Date.now() - start;
    
    console.log(`[TRPC] ${type} ${path} - ${durationMs}ms`);
    
    return result;
  } catch (error) {
    const durationMs = Date.now() - start;
    
    console.error(`[TRPC] ${type} ${path} - ${durationMs}ms - ERROR:`, error);
    
    throw error;
  }
});

export const loggedProcedure = publicProcedure.use(loggingMiddleware);

// Combine middlewares
export const baseProcedure = publicProcedure.use(loggingMiddleware).use(rateLimitMiddleware);