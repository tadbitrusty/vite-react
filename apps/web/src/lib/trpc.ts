import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@resume-vita/api';

export const trpc = createTRPCReact<AppRouter>();