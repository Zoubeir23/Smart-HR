import api from './api';

// Backend: /api/v1/paiement/payrolls/

export const payrollService = {
  getAll: async (params?: { month?: string; status?: string; employee?: number }) => {
    const { data } = await api.get('/paiement/payrolls/', { params });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get(`/paiement/payrolls/${id}/`);
    return data;
  },

  create: async (payrollData: Record<string, unknown>) => {
    const { data } = await api.post('/paiement/payrolls/', payrollData);
    return data;
  },

  update: async (id: number, payrollData: Record<string, unknown>) => {
    const { data } = await api.patch(`/paiement/payrolls/${id}/`, payrollData);
    return data;
  },
};
