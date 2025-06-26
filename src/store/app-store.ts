'use client';

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { UserFlowType, TemplateType } from '../../lib/shared';

interface AppState {
  // UI State
  isLoading: boolean;
  currentStep: number;
  totalSteps: number;
  
  // User Flow
  userFlowType: UserFlowType | null;
  selectedTemplate: TemplateType | null;
  
  // Feature Flags
  maintenanceMode: boolean;
  
  // Actions
  setLoading: (loading: boolean) => void;
  setCurrentStep: (step: number) => void;
  setUserFlowType: (flowType: UserFlowType) => void;
  setSelectedTemplate: (template: TemplateType) => void;
  resetFlow: () => void;
  nextStep: () => void;
  previousStep: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        isLoading: false,
        currentStep: 1,
        totalSteps: 5,
        userFlowType: null,
        selectedTemplate: null,
        maintenanceMode: false,

        // Actions
        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
          }),

        setCurrentStep: (step) =>
          set((state) => {
            state.currentStep = Math.max(1, Math.min(step, state.totalSteps));
          }),

        setUserFlowType: (flowType) =>
          set((state) => {
            state.userFlowType = flowType;
            state.selectedTemplate = flowType === 'first-time' ? 'ats-optimized' : null;
          }),

        setSelectedTemplate: (template) =>
          set((state) => {
            state.selectedTemplate = template;
          }),

        resetFlow: () =>
          set((state) => {
            state.currentStep = 1;
            state.userFlowType = null;
            state.selectedTemplate = null;
            state.isLoading = false;
          }),

        nextStep: () =>
          set((state) => {
            if (state.currentStep < state.totalSteps) {
              state.currentStep += 1;
            }
          }),

        previousStep: () =>
          set((state) => {
            if (state.currentStep > 1) {
              state.currentStep -= 1;
            }
          }),
      }))
    ),
    {
      name: 'app-store',
    }
  )
);

export type { AppState };