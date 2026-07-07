import api from './api';

// Backend: /api/v1/personnel/departments/

export const departmentService = {
  getAll: async () => {
    const { data } = await api.get('/personnel/departments/');
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get(`/personnel/departments/${id}/`);
    return data;
  },

  getStats: async () => {
    const { data } = await api.get('/personnel/departments/stats/');
    return data;
  },

  getOrganigramme: async (): Promise<OrganigrammeDepartment[]> => {
    const { data } = await api.get('/personnel/departments/organigramme/');
    return data;
  },

  create: async (departmentData: { name: string; description?: string }) => {
    const { data } = await api.post('/personnel/departments/', departmentData);
    return data;
  },

  update: async (id: number, departmentData: { name?: string; description?: string }) => {
    const { data } = await api.patch(`/personnel/departments/${id}/`, departmentData);
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/personnel/departments/${id}/`);
  },
};

export interface OrganigrammePosition {
  id: number;
  title: string;
  employee_count: number;
}

export interface OrganigrammeService {
  id: number;
  name: string;
  employee_count: number;
  positions: OrganigrammePosition[];
}

export interface OrganigrammeDepartment {
  id: number;
  name: string;
  employee_count: number;
  manager_name: string | null;
  services: OrganigrammeService[];
}
