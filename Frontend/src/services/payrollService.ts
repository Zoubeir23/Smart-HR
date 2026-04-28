import api from './api';

// Backend: /api/v1/paiement/payrolls/

export const payrollService = {
  getAll: async (params?: { month?: string; status?: string; employee_id?: number; department_id?: number }) => {
    const { data } = await api.get('/paiement/payrolls/', { params });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get(`/paiement/payrolls/${id}/`);
    return data;
  },

  getStats: async (month?: string) => {
    const { data } = await api.get('/paiement/payrolls/stats/', { params: month ? { month } : {} });
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

  delete: async (id: number) => {
    await api.delete(`/paiement/payrolls/${id}/`);
  },

  markPaid: async (id: number) => {
    const { data } = await api.post(`/paiement/payrolls/${id}/mark-paid/`);
    return data;
  },

  bulkGenerate: async (month: string, department_id?: number) => {
    const { data } = await api.post('/paiement/payrolls/bulk-generate/', { month, department_id });
    return data;
  },
};
