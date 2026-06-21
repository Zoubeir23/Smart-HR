import api from './api';

// Backend: /api/v1/personnel/positions/

export interface Position {
  id: number;
  title: string;
  service: number | null;
  service_name: string;
  department_id: number | null;
  department_name: string;
  profile_type: 'cadre' | 'non_cadre';
  indicative_salary: number;
  employee_count: number;
}

export interface PositionCreatePayload {
  title: string;
  service?: number | null;
  profile_type?: 'cadre' | 'non_cadre';
  indicative_salary?: number;
}

export interface PositionUpdatePayload {
  title?: string;
  service?: number | null;
  profile_type?: 'cadre' | 'non_cadre';
  indicative_salary?: number;
}

export const positionService = {
  getAll: async (serviceId?: number, departmentId?: number): Promise<Position[]> => {
    const params: Record<string, number> = {};
    if (serviceId) params.service = serviceId;
    if (departmentId) params.department = departmentId;
    const { data } = await api.get('/personnel/positions/', { params });
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
