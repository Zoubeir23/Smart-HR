import api from './api';
import { LIST_ALL_PAGE_SIZE } from '@/lib/pagination';

export const employeeService = {
  getAll: async (params?: { department?: string; status?: string; search?: string }) => {
    const { data } = await api.get('/personnel/employees/', {
      params: { page_size: LIST_ALL_PAGE_SIZE, ...params },
    });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get(`/personnel/employees/${id}/`);
    return data;
  },

  getMe: async () => {
    const { data } = await api.get('/personnel/employees/me/');
    return data;
  },

  create: async (employeeData: Record<string, unknown>) => {
    const { data } = await api.post('/personnel/employees/', employeeData);
    return data;
  },

  update: async (id: number, employeeData: Record<string, unknown>) => {
    const { data } = await api.patch(`/personnel/employees/${id}/`, employeeData);
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/personnel/employees/${id}/`);
  },

  anonymize: async (id: number) => {
    const { data } = await api.post(`/personnel/employees/${id}/anonymize/`);
    return data;
  },

  getStats: async () => {
    const { data } = await api.get('/personnel/employees/stats/');
    return data;
  },

  getRetentionStats: async () => {
    const { data } = await api.get('/personnel/employees/retention-stats/');
    return data;
  },

  getAvailableUsers: async () => {
    const { data } = await api.get('/personnel/employees/available-users/');
    return data as Array<{ id: number; email: string; first_name: string; last_name: string; full_name: string; role: string }>;
  },

  getDepartments: async () => {
    const { data } = await api.get('/personnel/departments/');
    return data;
  },

  getPositions: async () => {
    const { data } = await api.get('/personnel/positions/');
    return data;
  },

  getFamilyMembers: async (employeeId: number) => {
    const { data } = await api.get('/personnel/family-members/', { params: { employee: employeeId } });
    return data?.results ?? data ?? [];
  },

  addFamilyMember: async (memberData: {
    employee: number;
    relationship: string;
    first_name: string;
    last_name: string;
    date_of_birth?: string;
    gender?: string;
  }) => {
    const { data } = await api.post('/personnel/family-members/', memberData);
    return data;
  },

  deleteFamilyMember: async (id: number) => {
    await api.delete(`/personnel/family-members/${id}/`);
  },

  // ── Import en masse ──────────────────────────────────────────────────────

  importEmployees: async (file: File): Promise<BulkImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/personnel/employees/import/', formData);
    return data;
  },

  downloadImportTemplate: async (): Promise<Blob> => {
    const { data } = await api.get('/personnel/employees/import/template/', { responseType: 'blob' });
    return data;
  },
};

export interface BulkImportRowError {
  row: number;
  email: string;
  reason: string;
}

export interface BulkImportResult {
  created: number;
  total_rows: number;
  errors: BulkImportRowError[];
}
