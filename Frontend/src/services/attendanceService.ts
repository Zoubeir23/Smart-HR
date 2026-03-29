import api from './api';

// Backend: /api/v1/presence/attendances/
// Backend: GET /api/v1/presence/attendances/today/

export const attendanceService = {
  getAll: async (params?: { date?: string; employee?: number; status?: string }) => {
    const { data } = await api.get('/presence/attendances/', { params });
    return data;
  },

  getToday: async () => {
    const { data } = await api.get('/presence/attendances/today/');
    return data;
  },

  create: async (attendanceData: Record<string, unknown>) => {
    const { data } = await api.post('/presence/attendances/', attendanceData);
    return data;
  },

  update: async (id: number, attendanceData: Record<string, unknown>) => {
    const { data } = await api.patch(`/presence/attendances/${id}/`, attendanceData);
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/presence/attendances/${id}/`);
  },
};
