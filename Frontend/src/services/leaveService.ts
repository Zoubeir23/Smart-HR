import api from './api';

export const leaveService = {
  getAll: async (params?: { status?: string; employee?: number }) => {
    const { data } = await api.get('/conges/leaves/', { params });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get(`/conges/leaves/${id}/`);
    return data;
  },

  create: async (leaveData: { leave_type: string; start_date: string; end_date: string; reason: string }) => {
    const { data } = await api.post('/conges/leaves/', leaveData);
    return data;
  },

  approve: async (id: number) => {
    const { data } = await api.patch(`/conges/leaves/${id}/approve/`);
    return data;
  },

  reject: async (id: number) => {
    const { data } = await api.patch(`/conges/leaves/${id}/reject/`);
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/conges/leaves/${id}/`);
  },
};
