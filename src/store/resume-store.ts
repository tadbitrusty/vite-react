'use client';

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { 
  ResumeBuilderData, 
  WorkExperience, 
  Education, 
  TemplateInfo,
  JobStatus 
} from '../../lib/shared';

interface ResumeState {
  // Resume builder data
  resumeData: ResumeBuilderData | null;
  
  // Templates
  selectedTemplate: TemplateInfo | null;
  availableTemplates: TemplateInfo[];
  
  // Processing state
  isProcessing: boolean;
  processingStep: string;
  progress: number;
  jobId: string | null;
  jobStatus: JobStatus | null;
  
  // Preview
  showPreview: boolean;
  generatedPdfUrl: string | null;
  
  // Actions
  setResumeData: (data: ResumeBuilderData) => void;
  updatePersonalInfo: (info: Partial<ResumeBuilderData['personalInfo']>) => void;
  updateProfessionalSummary: (summary: string) => void;
  addWorkExperience: (experience: WorkExperience) => void;
  updateWorkExperience: (index: number, experience: WorkExperience) => void;
  removeWorkExperience: (index: number) => void;
  addEducation: (education: Education) => void;
  updateEducation: (index: number, education: Education) => void;
  removeEducation: (index: number) => void;
  updateSkills: (skills: string[]) => void;
  updateCertifications: (certifications: string[]) => void;
  setSelectedTemplate: (template: TemplateInfo) => void;
  setAvailableTemplates: (templates: TemplateInfo[]) => void;
  setProcessingState: (processing: boolean, step?: string, progress?: number) => void;
  setJobStatus: (jobId: string, status: JobStatus) => void;
  setShowPreview: (show: boolean) => void;
  setGeneratedPdfUrl: (url: string | null) => void;
  resetResumeData: () => void;
}

const initialResumeData: ResumeBuilderData = {
  personalInfo: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    portfolio: '',
  },
  professionalSummary: '',
  workExperience: [],
  education: [],
  skills: [],
  certifications: [],
};

export const useResumeStore = create<ResumeState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        resumeData: null,
        selectedTemplate: null,
        availableTemplates: [],
        isProcessing: false,
        processingStep: '',
        progress: 0,
        jobId: null,
        jobStatus: null,
        showPreview: false,
        generatedPdfUrl: null,

        // Actions
        setResumeData: (data) =>
          set((state) => {
            state.resumeData = data;
          }),

        updatePersonalInfo: (info) =>
          set((state) => {
            if (state.resumeData) {
              state.resumeData.personalInfo = {
                ...state.resumeData.personalInfo,
                ...info,
              };
            }
          }),

        updateProfessionalSummary: (summary) =>
          set((state) => {
            if (state.resumeData) {
              state.resumeData.professionalSummary = summary;
            }
          }),

        addWorkExperience: (experience) =>
          set((state) => {
            if (!state.resumeData) {
              state.resumeData = { ...initialResumeData };
            }
            state.resumeData.workExperience.push({
              ...experience,
              id: crypto.randomUUID(),
            });
          }),

        updateWorkExperience: (index, experience) =>
          set((state) => {
            if (state.resumeData && state.resumeData.workExperience[index]) {
              state.resumeData.workExperience[index] = experience;
            }
          }),

        removeWorkExperience: (index) =>
          set((state) => {
            if (state.resumeData) {
              state.resumeData.workExperience.splice(index, 1);
            }
          }),

        addEducation: (education) =>
          set((state) => {
            if (!state.resumeData) {
              state.resumeData = { ...initialResumeData };
            }
            state.resumeData.education.push({
              ...education,
              id: crypto.randomUUID(),
            });
          }),

        updateEducation: (index, education) =>
          set((state) => {
            if (state.resumeData && state.resumeData.education[index]) {
              state.resumeData.education[index] = education;
            }
          }),

        removeEducation: (index) =>
          set((state) => {
            if (state.resumeData) {
              state.resumeData.education.splice(index, 1);
            }
          }),

        updateSkills: (skills) =>
          set((state) => {
            if (state.resumeData) {
              state.resumeData.skills = skills;
            }
          }),

        updateCertifications: (certifications) =>
          set((state) => {
            if (state.resumeData) {
              state.resumeData.certifications = certifications;
            }
          }),

        setSelectedTemplate: (template) =>
          set((state) => {
            state.selectedTemplate = template;
          }),

        setAvailableTemplates: (templates) =>
          set((state) => {
            state.availableTemplates = templates;
          }),

        setProcessingState: (processing, step = '', progress = 0) =>
          set((state) => {
            state.isProcessing = processing;
            state.processingStep = step;
            state.progress = progress;
          }),

        setJobStatus: (jobId, status) =>
          set((state) => {
            state.jobId = jobId;
            state.jobStatus = status;
          }),

        setShowPreview: (show) =>
          set((state) => {
            state.showPreview = show;
          }),

        setGeneratedPdfUrl: (url) =>
          set((state) => {
            state.generatedPdfUrl = url;
          }),

        resetResumeData: () =>
          set((state) => {
            state.resumeData = null;
            state.selectedTemplate = null;
            state.isProcessing = false;
            state.processingStep = '';
            state.progress = 0;
            state.jobId = null;
            state.jobStatus = null;
            state.showPreview = false;
            state.generatedPdfUrl = null;
          }),
      }))
    ),
    {
      name: 'resume-store',
    }
  )
);

export type { ResumeState };