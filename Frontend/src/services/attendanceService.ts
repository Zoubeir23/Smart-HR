import api from './api';

export const attendanceService = {
  getAll: async (params?: { date?: string; employee?: number; status?: string }) => {
    const { data } = await api.get('/presences/attendance/', { params });
    return data;
  },

  getToday: async () => {
    const { data } = await api.get('/presences/attendance/today/');
    return data;
  },

  create: async (attendanceData: Record<string, unknown>) => {
    const { data } = await api.post('/presences/attendance/', attendanceData);
    return data;
  },

  update: async (id: number, attendanceData: Record<string, unknown>) => {
    const { data } = await api.patch(`/presences/attendance/${id}/`, attendanceData);
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/presences/attendance/${id}/`);
  },
};
