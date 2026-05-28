import api from './api';

// Backend: /api/v1/personnel/positions/

export interface Position {
  id: number;
  title: string;
  department: number | null;
  department_name: string;
  employee_count: number;
}

export interface PositionCreatePayload {
  title: string;
  department?: number | null;
}

export interface PositionUpdatePayload {
  title?: string;
  department?: number | null;
}

export const positionService = {
  getAll: async (): Promise<Position[]> => {
    const { data } = await api.get('/personnel/positions/');
    return data?.results ?? data;
  },

  getById: async (id: number): Promise<Position> => {
    const { data } = await api.get(`/personnel/positions/${id}/`);
    return data;
  },

  create: async (payload: PositionCreatePayload): Promise<Position> => {
    const { data } = await api.post('/personnel/positions/', payload);
    return data;
  },

  update: async (id: number, payload: PositionUpdatePayload): Promise<Position> => {
    const { data } = await api.patch(`/personnel/positions/${id}/`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/personnel/positions/${id}/`);
  },
};
