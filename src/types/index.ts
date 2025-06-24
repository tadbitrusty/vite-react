// Application types
export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
}

export interface WorkExperience {
  id: string;
  jobTitle: string;
  company: string;
  startDate: string;
  endDate: string;
  isCurrentJob: boolean;
  responsibilities: string;
}

export interface Education {
  id: string;
  degree: string;
  school: string;
  graduationDate: string;
  gpa?: string;
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: string;
  certifications: string;
}

export interface NotificationProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}

export interface ResumeTemplate {
  id: string;
  name: string;
  icon: string;
  price: number;
  freeForFirstTime?: boolean;
  description: string;
  tier: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error_code?: string;
  requires_payment?: boolean;
  payment_url?: string;
  timestamp: string;
  request_id: string;
}