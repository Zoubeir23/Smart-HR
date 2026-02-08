import api from './api';

export const recruitmentService = {
  getJobs: async (params?: { status?: string }) => {
    const { data } = await api.get('/recruitment/jobs/', { params });
    return data;
  },

  getJobById: async (id: number) => {
    const { data } = await api.get(`/recruitment/jobs/${id}/`);
    return data;
  },

  createJob: async (jobData: Record<string, unknown>) => {
    const { data } = await api.post('/recruitment/jobs/', jobData);
    return data;
  },

  updateJob: async (id: number, jobData: Record<string, unknown>) => {
    const { data } = await api.patch(`/recruitment/jobs/${id}/`, jobData);
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
    const { data } = await api.patch(`/recruitment/applications/${id}/update_status/`, { status });
    return data;
  },

  analyzeCv: async (applicationId: number) => {
    const { data } = await api.post('/agents/recruitment/analyze-cv/', { application_id: applicationId });
    return data;
  },

  processApplication: async (applicationId: number) => {
    const { data } = await api.post('/agents/recruitment/process-application/', { application_id: applicationId });
    return data;
  },
};
