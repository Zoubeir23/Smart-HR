import api from './api';

// Backend: /api/v1/presence/attendances/

export const attendanceService = {
  getAll: async (params?: { date?: string; date_start?: string; date_end?: string; employee_id?: number; department_id?: number; status?: string }) => {
    const { data } = await api.get('/presence/attendances/', { params });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get(`/presence/attendances/${id}/`);
    return data;
  },

  getToday: async () => {
    const { data } = await api.get('/presence/attendances/today/');
    return data;
  },

  getMonthlyStats: async (year: number, month: number) => {
    const { data } = await api.get('/presence/attendances/monthly-stats/', { params: { year, month } });
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

  checkIn: async (employee_id: number, note?: string) => {
    const { data } = await api.post('/presence/attendances/check-in/', { employee_id, note });
    return data;
  },

  checkOut: async (id: number, note?: string) => {
    const { data } = await api.post(`/presence/attendances/${id}/check-out/`, { note });
    return data;
  },
};
