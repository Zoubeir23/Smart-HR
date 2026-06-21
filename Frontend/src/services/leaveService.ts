import api from './api';

// Backend: GET/POST /api/v1/conge/leave-requests/
// Backend: POST /api/v1/conge/leave-requests/{id}/approve/
// Backend: POST /api/v1/conge/leave-requests/{id}/reject/

export const leaveService = {
  getAll: async (params?: { status?: string; employee?: number }) => {
    const { data } = await api.get('/conge/leave-requests/', { params });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get(`/conge/leave-requests/${id}/`);
    return data;
  },

  create: async (leaveData: {
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
  }) => {
    const { data } = await api.post('/conge/leave-requests/', leaveData);
    return data;
  },

  approve: async (id: number) => {
    const { data } = await api.post(`/conge/leave-requests/${id}/approve/`);
    return data;
  },

  reject: async (id: number) => {
    const { data } = await api.post(`/conge/leave-requests/${id}/reject/`);
    return data;
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const { data: result } = await api.patch(`/conge/leave-requests/${id}/`, data);
    return result;
  },

  delete: async (id: number) => {
    await api.delete(`/conge/leave-requests/${id}/`);
  },

  getBalance: async (params?: { year?: number; employee_id?: number }) => {
    const { data } = await api.get('/conge/leave-requests/balance/', { params });
    return data as {
      year: number;
      annual_allowance: number;
      days_taken: number;
      days_pending: number;
      days_remaining: number;
    };
  },
};
