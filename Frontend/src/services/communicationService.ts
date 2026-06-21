import api from './api';

// Backend: /api/v1/communication/messages/

export interface InternalMessagePayload {
  message_type: string;
  title: string;
  content: string;
  category?: string;
  target_audience: string;
  is_published?: boolean;
  published_at?: string | null;
}

export const communicationService = {
  getAll: async (params?: {
    message_type?: string;
    category?: string;
    year?: string;
    search?: string;
  }) => {
    const { data } = await api.get('/communication/messages/', { params });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get(`/communication/messages/${id}/`);
    return data;
  },

  create: async (payload: InternalMessagePayload) => {
    const { data } = await api.post('/communication/messages/', payload);
    return data;
  },

  update: async (id: number, payload: Partial<InternalMessagePayload>) => {
    const { data } = await api.patch(`/communication/messages/${id}/`, payload);
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/communication/messages/${id}/`);
  },

  getStats: async () => {
    const { data } = await api.get('/communication/messages/stats/');
    return data;
  },
};
