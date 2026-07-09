import api from './api';
import { LIST_ALL_PAGE_SIZE } from '@/lib/pagination';

// Backend: /api/v1/personnel/career-paths/
// Backend: /api/v1/personnel/succession-plans/

export interface CareerPathStep {
  id: number;
  position: number;
  position_title: string;
  order: number;
}

export interface CareerPath {
  id: number;
  title: string;
  description: string;
  created_at: string;
  steps: CareerPathStep[];
}

export interface CreateCareerPathPayload {
  title: string;
  description?: string;
  steps: { position: number; order?: number }[];
}

export type SuccessionReadiness = 'ready_now' | 'ready_1_2_years' | 'ready_3_5_years';

export interface SuccessionCandidate {
  id: number;
  employee: number;
  employee_full_name: string;
  readiness: SuccessionReadiness;
  readiness_display: string;
  notes: string;
}

export interface SuccessionPlan {
  id: number;
  position: number;
  position_title: string;
  notes: string;
  created_at: string;
  candidates: SuccessionCandidate[];
}

export const READINESS_OPTIONS: { value: SuccessionReadiness; label: string }[] = [
  { value: 'ready_now', label: 'Prêt immédiatement' },
  { value: 'ready_1_2_years', label: 'Prêt dans 1-2 ans' },
  { value: 'ready_3_5_years', label: 'Prêt dans 3-5 ans' },
];

export const talentService = {
  // ── Parcours de carrière ─────────────────────────────────────────
  getAllCareerPaths: async (): Promise<CareerPath[]> => {
    const { data } = await api.get('/personnel/career-paths/', { params: { page_size: LIST_ALL_PAGE_SIZE } });
    return data?.results ?? data ?? [];
  },

  createCareerPath: async (payload: CreateCareerPathPayload): Promise<CareerPath> => {
    const { data } = await api.post('/personnel/career-paths/', payload);
    return data;
  },

  deleteCareerPath: async (id: number): Promise<void> => {
    await api.delete(`/personnel/career-paths/${id}/`);
  },

  // ── Plans de succession ──────────────────────────────────────────
  getAllSuccessionPlans: async (): Promise<SuccessionPlan[]> => {
    const { data } = await api.get('/personnel/succession-plans/', { params: { page_size: LIST_ALL_PAGE_SIZE } });
    return data?.results ?? data ?? [];
  },

  createSuccessionPlan: async (payload: { position: number; notes?: string }): Promise<SuccessionPlan> => {
    const { data } = await api.post('/personnel/succession-plans/', payload);
    return data;
  },

  deleteSuccessionPlan: async (id: number): Promise<void> => {
    await api.delete(`/personnel/succession-plans/${id}/`);
  },

  addSuccessionCandidate: async (
    planId: number,
    payload: { employee: number; readiness: SuccessionReadiness; notes?: string },
  ): Promise<SuccessionCandidate> => {
    const { data } = await api.post(`/personnel/succession-plans/${planId}/candidates/`, payload);
    return data;
  },
};
