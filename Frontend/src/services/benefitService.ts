import api from './api';
import { LIST_ALL_PAGE_SIZE } from '@/lib/pagination';

// Backend: /api/v1/paiement/benefit-plans/, /api/v1/paiement/employee-benefits/

export const BENEFIT_CATEGORY_OPTIONS = [
  { value: 'health', label: 'Assurance santé' },
  { value: 'meal', label: 'Titres-restaurant' },
  { value: 'transport', label: 'Transport' },
  { value: 'housing', label: 'Logement' },
  { value: 'retirement', label: 'Retraite complémentaire' },
  { value: 'other', label: 'Autre' },
] as const;

export interface BenefitPlan {
  id: number;
  name: string;
  category: string;
  category_display: string;
  description: string;
  employer_contribution: number;
  employee_contribution: number;
  is_active: boolean;
  enrolled_count: number;
  created_at: string;
}

export interface CreateBenefitPlanPayload {
  name: string;
  category: string;
  description?: string;
  employer_contribution: number;
  employee_contribution: number;
  is_active?: boolean;
}

export type EmployeeBenefitStatus = 'active' | 'pending' | 'terminated';

export interface EmployeeBenefit {
  id: number;
  employee: number;
  employee_name: string;
  plan: number;
  plan_name: string;
  status: EmployeeBenefitStatus;
  status_display: string;
  enrolled_at: string;
  terminated_at: string | null;
}

export const benefitService = {
  getAllPlans: async (): Promise<BenefitPlan[]> => {
    const { data } = await api.get('/paiement/benefit-plans/', { params: { page_size: LIST_ALL_PAGE_SIZE } });
    return data?.results ?? data ?? [];
  },

  createPlan: async (payload: CreateBenefitPlanPayload): Promise<BenefitPlan> => {
    const { data } = await api.post('/paiement/benefit-plans/', payload);
    return data;
  },

  deletePlan: async (id: number): Promise<void> => {
    await api.delete(`/paiement/benefit-plans/${id}/`);
  },

  getAllEnrollments: async (employeeId?: number) => {
    const { data } = await api.get('/paiement/employee-benefits/', {
      params: { page_size: LIST_ALL_PAGE_SIZE, ...(employeeId ? { employee: employeeId } : {}) },
    });
    return data;
  },

  enrollEmployee: async (payload: { employee: number; plan: number; status?: EmployeeBenefitStatus }): Promise<EmployeeBenefit> => {
    const { data } = await api.post('/paiement/employee-benefits/', payload);
    return data;
  },

  updateEnrollmentStatus: async (id: number, status: EmployeeBenefitStatus): Promise<EmployeeBenefit> => {
    const { data } = await api.patch(`/paiement/employee-benefits/${id}/`, { status });
    return data;
  },
};
