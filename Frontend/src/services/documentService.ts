import api from './api';

// Backend: /api/v1/document/documents/

export const documentService = {
  getAll: async (params?: { employee?: number; document_type?: string }) => {
    const { data } = await api.get('/document/documents/', { params });
    return data;
  },

  upload: async (formData: FormData) => {
    const { data } = await api.post('/document/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/document/documents/${id}/`);
  },
};
