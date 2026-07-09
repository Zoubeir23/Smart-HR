import api from './api';
import { LIST_ALL_PAGE_SIZE } from '@/lib/pagination';

// Backend: /api/v1/document/documents/

export const documentService = {
  getAll: async (params?: { employee?: number; document_type?: string }) => {
    const { data } = await api.get('/document/documents/', {
      params: { page_size: LIST_ALL_PAGE_SIZE, ...params },
    });
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

// Backend: /api/v1/document/signatures/, /api/v1/document/signature-requests/

export interface Signature {
  id: number;
  image_data: string;
  created_at: string;
  updated_at: string;
}

export type SignatureRequestStatus = 'pending' | 'signed' | 'declined';

export interface SignatureRequest {
  id: number;
  document: number;
  document_name: string;
  requested_by: number | null;
  requested_by_name: string;
  signatory: number;
  signatory_name: string;
  status: SignatureRequestStatus;
  status_display: string;
  signed_at: string | null;
  comment: string;
  created_at: string;
}

export const signatureService = {
  getMine: async (): Promise<Signature | null> => {
    try {
      const { data } = await api.get('/document/signatures/me/');
      return data;
    } catch {
      return null;
    }
  },

  saveMine: async (imageData: string): Promise<Signature> => {
    const { data } = await api.put('/document/signatures/me/', { image_data: imageData });
    return data;
  },

  getAllRequests: async () => {
    const { data } = await api.get('/document/signature-requests/', { params: { page_size: LIST_ALL_PAGE_SIZE } });
    return data;
  },

  createRequest: async (payload: { document: number; signatory: number }): Promise<SignatureRequest> => {
    const { data } = await api.post('/document/signature-requests/', payload);
    return data;
  },

  sign: async (id: number): Promise<SignatureRequest> => {
    const { data } = await api.post(`/document/signature-requests/${id}/sign/`);
    return data;
  },

  decline: async (id: number, comment?: string): Promise<SignatureRequest> => {
    const { data } = await api.post(`/document/signature-requests/${id}/decline/`, { comment });
    return data;
  },
};
