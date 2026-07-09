import api from './api';
import { LIST_ALL_PAGE_SIZE } from '@/lib/pagination';

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
    const { data } = await api.get('/communication/messages/', {
      params: { page_size: LIST_ALL_PAGE_SIZE, ...params },
    });
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

// Backend: /api/v1/communication/distress-alerts/

export type DistressAlertStatus = 'new' | 'acknowledged' | 'in_progress' | 'resolved';

export interface DistressAlert {
  id: number;
  employee: number;
  employee_name: string;
  message: string;
  status: DistressAlertStatus;
  status_display: string;
  handled_by: number | null;
  handled_by_name: string;
  resolution_notes: string;
  resolved_at: string | null;
  created_at: string;
}

export const DISTRESS_ALERT_STATUS_OPTIONS: { value: DistressAlertStatus; label: string }[] = [
  { value: 'new', label: 'Nouveau' },
  { value: 'acknowledged', label: 'Pris en compte' },
  { value: 'in_progress', label: 'En traitement' },
  { value: 'resolved', label: 'Résolu' },
];

export const distressAlertService = {
  getAll: async (params?: { status?: DistressAlertStatus }) => {
    const { data } = await api.get('/communication/distress-alerts/', {
      params: { page_size: LIST_ALL_PAGE_SIZE, ...params },
    });
    return data;
  },

  create: async (message: string): Promise<DistressAlert> => {
    const { data } = await api.post('/communication/distress-alerts/', { message });
    return data;
  },

  updateStatus: async (id: number, status: DistressAlertStatus, resolution_notes?: string): Promise<DistressAlert> => {
    const { data } = await api.patch(`/communication/distress-alerts/${id}/`, { status, resolution_notes });
    return data;
  },
};
