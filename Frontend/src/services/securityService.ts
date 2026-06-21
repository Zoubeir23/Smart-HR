import api from './api';

export interface AuditLogEntry {
  id: number;
  action: string;
  model_name: string;
  object_id: string;
  object_repr: string;
  details: Record<string, unknown>;
  timestamp: string;
  performed_by: {
    id: number;
    email: string;
    full_name: string;
    role: string;
  } | null;
}

export interface AuditLogFilters {
  action?: string;
  model_name?: string;
  performed_by?: number;
  limit?: number;
}

export const securityService = {
  getAuditLogs: async (filters?: AuditLogFilters): Promise<{ count: number; results: AuditLogEntry[] }> => {
    const { data } = await api.get('/audit-logs/', { params: filters });
    return data;
  },

  anonymizeApplication: async (applicationId: number): Promise<{ detail: string; id: number }> => {
    const { data } = await api.post(`/recruitment/applications/${applicationId}/anonymize/`);
    return data;
  },

  anonymizeEmployee: async (employeeId: number): Promise<{ detail: string; id: number }> => {
    const { data } = await api.post(`/personnel/employees/${employeeId}/anonymize/`);
    return data;
  },

  getRejectedApplications: async (): Promise<{ results: unknown[] }> => {
    const { data } = await api.get('/recruitment/applications/', {
      params: { status: 'rejected' },
    });
    return data;
  },

  getInactiveEmployees: async (): Promise<{ results: unknown[] }> => {
    const { data } = await api.get('/personnel/employees/', {
      params: { status: 'inactive' },
    });
    return data;
  },
};
