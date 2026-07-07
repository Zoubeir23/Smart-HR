import api from './api';

// Backend: /api/v1/personnel/onboarding-programs/

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  order: number;
  is_completed: boolean;
  completed_at: string | null;
}

export interface OnboardingProgram {
  id: number;
  employee: number;
  employee_full_name: string;
  program_type: 'onboarding' | 'offboarding';
  program_type_display: string;
  title: string;
  status: 'in_progress' | 'completed';
  status_display: string;
  completed_at: string | null;
  created_at: string;
  steps: OnboardingStep[];
}

export interface CreateOnboardingProgramPayload {
  employee: number;
  program_type: 'onboarding' | 'offboarding';
  title: string;
  steps: { title: string; description?: string }[];
}

export const onboardingService = {
  getForEmployee: async (employeeId: number): Promise<OnboardingProgram[]> => {
    const { data } = await api.get('/personnel/onboarding-programs/', { params: { employee: employeeId } });
    return data?.results ?? data ?? [];
  },

  create: async (payload: CreateOnboardingProgramPayload): Promise<OnboardingProgram> => {
    const { data } = await api.post('/personnel/onboarding-programs/', payload);
    return data;
  },

  toggleStep: async (programId: number, stepId: number): Promise<OnboardingProgram> => {
    const { data } = await api.post(`/personnel/onboarding-programs/${programId}/steps/${stepId}/toggle/`);
    return data;
  },

  delete: async (programId: number): Promise<void> => {
    await api.delete(`/personnel/onboarding-programs/${programId}/`);
  },
};
