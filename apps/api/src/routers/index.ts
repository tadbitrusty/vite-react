import { createTRPCRouter } from '../lib/trpc';
import { resumeRouter } from './resume';
import { userRouter } from './user';
import { paymentRouter } from './payment';
import { healthRouter } from './health';
import { metricsRouter } from './metrics';
import { docsRouter } from './docs';

export const appRouter = createTRPCRouter({
  health: healthRouter,
  user: userRouter,
  resume: resumeRouter,
  payment: paymentRouter,
  metrics: metricsRouter,
  docs: docsRouter,
});

export type AppRouter = typeof appRouter;