import { createTRPCReact } from '@trpc/react-query';

// Define a basic router type for now
export type AppRouter = Record<string, any>;

export const trpc = createTRPCReact<AppRouter>();