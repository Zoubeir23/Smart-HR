import api from './api';

// Backend: /api/v1/formation/training-providers/

export interface TrainingProvider {
  id: number;
  name: string;
  provider_type: 'internal' | 'external';
  provider_type_display: string;
  contact_name: string;
  phone: string;
  email: string;
  website: string;
  specialties: string;
}

export interface TrainingProviderPayload {
  name: string;
  provider_type: 'internal' | 'external';
  contact_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  specialties?: string;
}

export const trainingProviderService = {
  getAll: async (params?: { provider_type?: string; search?: string }) => {
    const { data } = await api.get('/formation/training-providers/', { params });
    return data;
  },

  create: async (payload: TrainingProviderPayload): Promise<TrainingProvider> => {
    const { data } = await api.post('/formation/training-providers/', payload);
    return data;
  },

  update: async (id: number, payload: Partial<TrainingProviderPayload>): Promise<TrainingProvider> => {
    const { data } = await api.patch(`/formation/training-providers/${id}/`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/formation/training-providers/${id}/`);
  },
};
