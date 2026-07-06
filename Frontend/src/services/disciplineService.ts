import api from './api';
import { LIST_ALL_PAGE_SIZE } from '@/lib/pagination';

// Backend: /api/v1/discipline/actions/

export interface DisciplinaryActionPayload {
  employee: number;
  action_type: string;
  reason: string;
  description?: string;
  incident_date: string;
  issued_date: string;
  suspension_start?: string | null;
  suspension_end?: string | null;
  notes?: string;
}

export const disciplineService = {
  getAll: async (params?: { employee_id?: number; action_type?: string }) => {
    const { data } = await api.get('/discipline/actions/', {
      params: { page_size: LIST_ALL_PAGE_SIZE, ...params },
    });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get(`/discipline/actions/${id}/`);
    return data;
  },

  create: async (payload: DisciplinaryActionPayload) => {
    const { data } = await api.post('/discipline/actions/', payload);
    return data;
  },

  update: async (id: number, payload: Partial<DisciplinaryActionPayload>) => {
    const { data } = await api.patch(`/discipline/actions/${id}/`, payload);
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/discipline/actions/${id}/`);
  },

  getStats: async () => {
    const { data } = await api.get('/discipline/actions/stats/');
    return data;
  },
};
