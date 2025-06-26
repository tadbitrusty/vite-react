'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ResumeState {
  currentResume: any;
  isGenerating: boolean;
  setCurrentResume: (resume: any) => void;
  setIsGenerating: (generating: boolean) => void;
}

export const useResumeStore = create<ResumeState>()(
  devtools(
    (set) => ({
      currentResume: null,
      isGenerating: false,
      setCurrentResume: (resume) => set({ currentResume: resume }),
      setIsGenerating: (generating) => set({ isGenerating: generating }),
    }),
    { name: 'resume-store' }
  )
);

export type { ResumeState };
