import api from './api';

// Backend: /api/v1/personnel/services/

export interface Service {
  id: number;
  name: string;
  description: string;
  department: number;
  department_name: string;
  employee_count: number;
  position_count: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceCreatePayload {
  name: string;
  description?: string;
  department: number;
}

export interface ServiceUpdatePayload {
  name?: string;
  description?: string;
  department?: number;
}

export const serviceService = {
  getAll: async (departmentId?: number): Promise<Service[]> => {
    const params = departmentId ? { department: departmentId } : {};
    const { data } = await api.get('/personnel/services/', { params });
    return data?.results ?? data;
  },

  getById: async (id: number): Promise<Service> => {
    const { data } = await api.get(`/personnel/services/${id}/`);
    return data;
  },

  create: async (payload: ServiceCreatePayload): Promise<Service> => {
    const { data } = await api.post('/personnel/services/', payload);
    return data;
  },

  update: async (id: number, payload: ServiceUpdatePayload): Promise<Service> => {
    const { data } = await api.patch(`/personnel/services/${id}/`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/personnel/services/${id}/`);
  },
};
