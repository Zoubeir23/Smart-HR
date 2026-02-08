import api from './api';

export const taskService = {
  getAll: async (params?: { status?: string; assignee?: number; priority?: string }) => {
    const { data } = await api.get('/taches/tasks/', { params });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get(`/taches/tasks/${id}/`);
    return data;
  },

  create: async (taskData: Record<string, unknown>) => {
    const { data } = await api.post('/taches/tasks/', taskData);
    return data;
  },

  update: async (id: number, taskData: Record<string, unknown>) => {
    const { data } = await api.patch(`/taches/tasks/${id}/`, taskData);
    return data;
  },

  updateStatus: async (id: number, status: string) => {
    const { data } = await api.patch(`/taches/tasks/${id}/update-status/`, { status });
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/taches/tasks/${id}/`);
  },
};
