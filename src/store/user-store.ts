'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UserState {
  email: string;
  setEmail: (email: string) => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    (set) => ({
      email: '',
      setEmail: (email) => set({ email }),
    }),
    { name: 'user-store' }
  )
);

export type { UserState };
