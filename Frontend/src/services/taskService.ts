import api from './api';

// Backend: /api/v1/tache/tasks/
// Backend: PATCH /api/v1/tache/tasks/{id}/update-status/

export const taskService = {
  getAll: async (params?: { status?: string; assignee?: number; priority?: string }) => {
    const { data } = await api.get('/tache/tasks/', { params });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get(`/tache/tasks/${id}/`);
    return data;
  },

  create: async (taskData: Record<string, unknown>) => {
    const { data } = await api.post('/tache/tasks/', taskData);
    return data;
  },

  update: async (id: number, taskData: Record<string, unknown>) => {
    const { data } = await api.patch(`/tache/tasks/${id}/`, taskData);
    return data;
  },

  updateStatus: async (id: number, status: string) => {
    const { data } = await api.patch(`/tache/tasks/${id}/update-status/`, { status });
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/tache/tasks/${id}/`);
  },
};
