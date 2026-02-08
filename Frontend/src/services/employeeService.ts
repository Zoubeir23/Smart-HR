import api from './api';

export const employeeService = {
  getAll: async (params?: { department?: string; status?: string; search?: string }) => {
    const { data } = await api.get('/personnel/employees/', { params });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get(`/personnel/employees/${id}/`);
    return data;
  },

  getMe: async () => {
    const { data } = await api.get('/personnel/employees/me/');
    return data;
  },

  create: async (employeeData: Record<string, unknown>) => {
    const { data } = await api.post('/personnel/employees/', employeeData);
    return data;
  },

  update: async (id: number, employeeData: Record<string, unknown>) => {
    const { data } = await api.patch(`/personnel/employees/${id}/`, employeeData);
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/personnel/employees/${id}/`);
  },

  getStats: async () => {
    const { data } = await api.get('/personnel/employees/stats/');
    return data;
  },

  getRetentionStats: async () => {
    const { data } = await api.get('/personnel/employees/retention_stats/');
    return data;
  },

  getDepartments: async () => {
    const { data } = await api.get('/personnel/departments/');
    return data;
  },

  getPositions: async () => {
    const { data } = await api.get('/personnel/positions/');
    return data;
  },
};
