'use client';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { User, PersonalInfo } from '@resume-vita/types';

interface UserState {
  // User data
  user: User | null;
  personalInfo: PersonalInfo | null;
  
  // Authentication state
  isAuthenticated: boolean;
  isFirstTime: boolean;
  
  // Form data
  email: string;
  jobDescription: string;
  uploadedFile: File | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setPersonalInfo: (info: PersonalInfo) => void;
  setEmail: (email: string) => void;
  setJobDescription: (description: string) => void;
  setUploadedFile: (file: File | null) => void;
  setIsFirstTime: (isFirstTime: boolean) => void;
  clearUserData: () => void;
  updateUserProfile: (updates: Partial<User>) => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        user: null,
        personalInfo: null,
        isAuthenticated: false,
        isFirstTime: true,
        email: '',
        jobDescription: '',
        uploadedFile: null,

        // Actions
        setUser: (user) =>
          set((state) => {
            state.user = user;
            state.isAuthenticated = !!user;
            if (user) {
              state.isFirstTime = user.isFirstTime;
              state.email = user.email;
            }
          }),

        setPersonalInfo: (info) =>
          set((state) => {
            state.personalInfo = info;
            state.email = info.email;
          }),

        setEmail: (email) =>
          set((state) => {
            state.email = email;
          }),

        setJobDescription: (description) =>
          set((state) => {
            state.jobDescription = description;
          }),

        setUploadedFile: (file) =>
          set((state) => {
            state.uploadedFile = file;
          }),

        setIsFirstTime: (isFirstTime) =>
          set((state) => {
            state.isFirstTime = isFirstTime;
          }),

        clearUserData: () =>
          set((state) => {
            state.user = null;
            state.personalInfo = null;
            state.isAuthenticated = false;
            state.email = '';
            state.jobDescription = '';
            state.uploadedFile = null;
          }),

        updateUserProfile: (updates) =>
          set((state) => {
            if (state.user) {
              state.user = { ...state.user, ...updates };
            }
          }),
      })),
      {
        name: 'user-store',
        partialize: (state) => ({
          user: state.user,
          isFirstTime: state.isFirstTime,
          email: state.email,
        }),
      }
    ),
    {
      name: 'user-store',
    }
  )
);

export type { UserState };