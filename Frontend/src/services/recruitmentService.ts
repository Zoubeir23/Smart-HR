import api from './api';

// Backend: /api/v1/recruitment/job-offers/
// Backend: /api/v1/recruitment/applications/
// Backend: PATCH /api/v1/recruitment/applications/{id}/update-status/

export const recruitmentService = {
  getJobs: async (params?: { status?: string }) => {
    const { data } = await api.get('/recruitment/job-offers/', { params });
    return data;
  },

  getJobById: async (id: number) => {
    const { data } = await api.get(`/recruitment/job-offers/${id}/`);
    return data;
  },

  createJob: async (jobData: Record<string, unknown>) => {
    const { data } = await api.post('/recruitment/job-offers/', jobData);
    return data;
  },

  updateJob: async (id: number, jobData: Record<string, unknown>) => {
    const { data } = await api.patch(`/recruitment/job-offers/${id}/`, jobData);
    return data;
  },

  getApplications: async (params?: { job_offer?: number; status?: string }) => {
    const { data } = await api.get('/recruitment/applications/', { params });
    return data;
  },

  apply: async (formData: FormData) => {
    const { data } = await api.post('/recruitment/applications/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  updateApplicationStatus: async (id: number, status: string) => {
    const { data } = await api.patch(`/recruitment/applications/${id}/update-status/`, { status });
    return data;
  },
};
