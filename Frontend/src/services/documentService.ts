import api from './api';

export const documentService = {
  getAll: async (params?: { employee?: number; document_type?: string }) => {
    const { data } = await api.get('/documents/documents/', { params });
    return data;
  },

  upload: async (formData: FormData) => {
    const { data } = await api.post('/documents/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/documents/documents/${id}/`);
  },
};
