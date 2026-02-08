import api from './api';

export const payrollService = {
  getAll: async (params?: { month?: string; status?: string; employee?: number }) => {
    const { data } = await api.get('/paiements/payroll/', { params });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get(`/paiements/payroll/${id}/`);
    return data;
  },

  create: async (payrollData: Record<string, unknown>) => {
    const { data } = await api.post('/paiements/payroll/', payrollData);
    return data;
  },

  update: async (id: number, payrollData: Record<string, unknown>) => {
    const { data } = await api.patch(`/paiements/payroll/${id}/`, payrollData);
    return data;
  },
};
