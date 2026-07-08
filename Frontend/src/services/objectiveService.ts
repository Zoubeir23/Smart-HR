import api from './api';

// Backend: /api/v1/personnel/objectives/

export interface KeyResult {
  id: number;
  title: string;
  unit: string;
  target_value: number;
  current_value: number;
  order: number;
  progress: number;
}

export interface Objective {
  id: number;
  employee: number;
  employee_full_name: string;
  title: string;
  description: string;
  period: string;
  status: 'not_started' | 'in_progress' | 'completed';
  status_display: string;
  progress: number;
  created_at: string;
  key_results: KeyResult[];
}

export interface CreateObjectivePayload {
  employee: number;
  title: string;
  description?: string;
  period: string;
  key_results: { title: string; unit?: string; target_value: number }[];
}

export const objectiveService = {
  getForEmployee: async (employeeId: number): Promise<Objective[]> => {
    const { data } = await api.get('/personnel/objectives/', { params: { employee: employeeId } });
    return data?.results ?? data ?? [];
  },

  create: async (payload: CreateObjectivePayload): Promise<Objective> => {
    const { data } = await api.post('/personnel/objectives/', payload);
    return data;
  },

  updateKeyResultProgress: async (objectiveId: number, keyResultId: number, currentValue: number): Promise<KeyResult> => {
    const { data } = await api.patch(`/personnel/objectives/${objectiveId}/key-results/${keyResultId}/`, {
      current_value: currentValue,
    });
    return data;
  },

  delete: async (objectiveId: number): Promise<void> => {
    await api.delete(`/personnel/objectives/${objectiveId}/`);
  },
};
