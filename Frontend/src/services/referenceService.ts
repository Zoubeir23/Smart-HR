import api from './api';

// Backend: /api/v1/personnel/ref/

export interface ReferenceItem {
  id: number;
  name?: string;
  label?: string;
  created_at: string;
  updated_at: string;
}

export const referenceService = {
  nationalities: {
    getAll: async (): Promise<ReferenceItem[]> => {
      const { data } = await api.get('/personnel/ref/nationalities/');
      return data?.results ?? data;
    },
    create: async (name: string): Promise<ReferenceItem> => {
      const { data } = await api.post('/personnel/ref/nationalities/', { name });
      return data;
    },
    update: async (id: number, name: string): Promise<ReferenceItem> => {
      const { data } = await api.patch(`/personnel/ref/nationalities/${id}/`, { name });
      return data;
    },
    delete: async (id: number): Promise<void> => {
      await api.delete(`/personnel/ref/nationalities/${id}/`);
    },
  },

  familyStatuses: {
    getAll: async (): Promise<ReferenceItem[]> => {
      const { data } = await api.get('/personnel/ref/family-statuses/');
      return data?.results ?? data;
    },
    create: async (label: string): Promise<ReferenceItem> => {
      const { data } = await api.post('/personnel/ref/family-statuses/', { label });
      return data;
    },
    update: async (id: number, label: string): Promise<ReferenceItem> => {
      const { data } = await api.patch(`/personnel/ref/family-statuses/${id}/`, { label });
      return data;
    },
    delete: async (id: number): Promise<void> => {
      await api.delete(`/personnel/ref/family-statuses/${id}/`);
    },
  },

  diplomas: {
    getAll: async (): Promise<ReferenceItem[]> => {
      const { data } = await api.get('/personnel/ref/diplomas/');
      return data?.results ?? data;
    },
    create: async (label: string): Promise<ReferenceItem> => {
      const { data } = await api.post('/personnel/ref/diplomas/', { label });
      return data;
    },
    update: async (id: number, label: string): Promise<ReferenceItem> => {
      const { data } = await api.patch(`/personnel/ref/diplomas/${id}/`, { label });
      return data;
    },
    delete: async (id: number): Promise<void> => {
      await api.delete(`/personnel/ref/diplomas/${id}/`);
    },
  },

  departureReasons: {
    getAll: async (): Promise<ReferenceItem[]> => {
      const { data } = await api.get('/personnel/ref/departure-reasons/');
      return data?.results ?? data;
    },
    create: async (label: string): Promise<ReferenceItem> => {
      const { data } = await api.post('/personnel/ref/departure-reasons/', { label });
      return data;
    },
    update: async (id: number, label: string): Promise<ReferenceItem> => {
      const { data } = await api.patch(`/personnel/ref/departure-reasons/${id}/`, { label });
      return data;
    },
    delete: async (id: number): Promise<void> => {
      await api.delete(`/personnel/ref/departure-reasons/${id}/`);
    },
  },
};
