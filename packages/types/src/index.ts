import { z } from 'zod';

// User types
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  isFirstTime: z.boolean(),
  emailVerified: z.boolean(),
  hasCompletedProfile: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date().nullable(),
});

export type User = z.infer<typeof UserSchema>;

// Resume types
export const ResumeStatusSchema = z.enum(['UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED']);
export type ResumeStatus = z.infer<typeof ResumeStatusSchema>;

export const ResumeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fileName: z.string(),
  originalName: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  contentHash: z.string(),
  extractedText: z.string().nullable(),
  parsedData: z.any().nullable(),
  status: ResumeStatusSchema,
  processedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Resume = z.infer<typeof ResumeSchema>;

// Personal Information (from original spec)
export const PersonalInfoSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone number is required'),
  location: z.string().min(1, 'Location is required'),
  linkedin: z.string().url().optional().or(z.literal('')),
  portfolio: z.string().url().optional().or(z.literal('')),
});

export type PersonalInfo = z.infer<typeof PersonalInfoSchema>;

// Work Experience
export const WorkExperienceSchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1, 'Company is required'),
  position: z.string().min(1, 'Position is required'),
  location: z.string().min(1, 'Location is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  isCurrentRole: z.boolean().default(false),
  achievements: z.array(z.string()).min(1, 'At least one achievement is required'),
});

export type WorkExperience = z.infer<typeof WorkExperienceSchema>;

// Education
export const EducationSchema = z.object({
  id: z.string().optional(),
  institution: z.string().min(1, 'Institution is required'),
  degree: z.string().min(1, 'Degree is required'),
  field: z.string().min(1, 'Field of study is required'),
  location: z.string().min(1, 'Location is required'),
  graduationDate: z.string().min(1, 'Graduation date is required'),
  gpa: z.string().optional(),
  honors: z.string().optional(),
});

export type Education = z.infer<typeof EducationSchema>;

// Resume Builder Data
export const ResumeBuilderDataSchema = z.object({
  personalInfo: PersonalInfoSchema,
  professionalSummary: z.string().min(50, 'Professional summary must be at least 50 characters'),
  workExperience: z.array(WorkExperienceSchema).min(1, 'At least one work experience is required'),
  education: z.array(EducationSchema).min(1, 'At least one education entry is required'),
  skills: z.array(z.string()).min(3, 'At least 3 skills are required'),
  certifications: z.array(z.string()).optional(),
});

export type ResumeBuilderData = z.infer<typeof ResumeBuilderDataSchema>;

// Template types
export const TemplateTypeSchema = z.enum([
  'ats-optimized',
  'entry-clean', 
  'tech-focus',
  'professional-plus',
  'executive-format'
]);

export type TemplateType = z.infer<typeof TemplateTypeSchema>;

export const TemplateInfoSchema = z.object({
  id: TemplateTypeSchema,
  name: z.string(),
  description: z.string(),
  price: z.number(),
  icon: z.string(),
  isFree: z.boolean(),
  stripeProductId: z.string().optional(),
});

export type TemplateInfo = z.infer<typeof TemplateInfoSchema>;

// Payment types
export const PaymentStatusSchema = z.enum([
  'PENDING',
  'PROCESSING', 
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
  'PARTIAL_REFUND'
]);

export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const PaymentRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  stripeSessionId: z.string().nullable(),
  stripePaymentIntentId: z.string().nullable(),
  stripeCustomerId: z.string().nullable(),
  amount: z.number(),
  currency: z.string(),
  status: PaymentStatusSchema,
  productType: z.string(),
  productId: z.string(),
  description: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  paidAt: z.date().nullable(),
  refundedAt: z.date().nullable(),
});

export type PaymentRecord = z.infer<typeof PaymentRecordSchema>;

// Job processing types
export const JobTypeSchema = z.enum([
  'RESUME_OPTIMIZATION',
  'TEMPLATE_GENERATION',
  'PDF_CREATION',
  'EMAIL_DELIVERY',
  'BACKGROUND_ANALYSIS'
]);

export type JobType = z.infer<typeof JobTypeSchema>;

export const JobStatusSchema = z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'RETRY']);
export type JobStatus = z.infer<typeof JobStatusSchema>;

// API Request/Response types
export const FileUploadSchema = z.object({
  file: z.any(), // File object
  jobDescription: z.string().min(10, 'Job description must be at least 10 characters'),
  email: z.string().email('Valid email is required'),
  templateId: TemplateTypeSchema,
  isFirstTime: z.boolean().default(true),
});

export type FileUploadRequest = z.infer<typeof FileUploadSchema>;

export const ProcessResumeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.object({
    jobId: z.string(),
    estimatedTime: z.number(),
    templateInfo: TemplateInfoSchema,
  }).optional(),
  error: z.string().optional(),
  errorCode: z.string().optional(),
  requiresPayment: z.boolean().optional(),
  paymentUrl: z.string().optional(),
  requestId: z.string(),
  timestamp: z.string(),
});

export type ProcessResumeResponse = z.infer<typeof ProcessResumeResponseSchema>;

// User flow types
export const UserFlowTypeSchema = z.enum(['first-time', 'returning']);
export type UserFlowType = z.infer<typeof UserFlowTypeSchema>;

// Notification types
export const NotificationTypeSchema = z.enum(['success', 'error', 'info', 'warning']);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationSchema = z.object({
  id: z.string(),
  type: NotificationTypeSchema,
  title: z.string(),
  message: z.string(),
  duration: z.number().optional(),
  persistent: z.boolean().default(false),
});

export type Notification = z.infer<typeof NotificationSchema>;

// Error types
export const AppErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
  statusCode: z.number().optional(),
});

export type AppError = z.infer<typeof AppErrorSchema>;

// Analytics types
export const AnalyticsEventSchema = z.object({
  event: z.string(),
  properties: z.record(z.any()).optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  timestamp: z.date().default(() => new Date()),
});

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

// Configuration types
export const FeatureFlagsSchema = z.object({
  maintenanceMode: z.boolean(),
  newUserFreeTemplate: z.boolean(),
  advancedFraudDetection: z.boolean(),
  emailNotifications: z.boolean(),
  analyticsTracking: z.boolean(),
  redisCache: z.boolean(),
  backgroundJobs: z.boolean(),
});

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

// Export all schemas for runtime validation
export const schemas = {
  User: UserSchema,
  Resume: ResumeSchema,
  PersonalInfo: PersonalInfoSchema,
  WorkExperience: WorkExperienceSchema,
  Education: EducationSchema,
  ResumeBuilderData: ResumeBuilderDataSchema,
  TemplateInfo: TemplateInfoSchema,
  PaymentRecord: PaymentRecordSchema,
  FileUpload: FileUploadSchema,
  ProcessResumeResponse: ProcessResumeResponseSchema,
  Notification: NotificationSchema,
  AppError: AppErrorSchema,
  AnalyticsEvent: AnalyticsEventSchema,
  FeatureFlags: FeatureFlagsSchema,
} as const;