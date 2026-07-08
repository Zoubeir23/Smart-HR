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

  generateJobOffer: async (jobDescription: string): Promise<GeneratedJobOfferDraft> => {
    const { data } = await api.post('/recruitment/job-offers/generate/', { job_description: jobDescription });
    return data;
  },

  getApplications: async (params?: { job_offer?: number; status?: string; min_score?: number; ordering?: string }) => {
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

  createInterview: async (applicationId: number, options?: { duration?: string; interview_type?: string }) => {
    const { data } = await api.post(`/recruitment/applications/${applicationId}/create-interview/`, options ?? {});
    return data;
  },

  onboardCandidate: async (applicationId: number) => {
    const { data } = await api.post(`/recruitment/applications/${applicationId}/onboard/`);
    return data;
  },

  getApplicationDocuments: async (applicationId: number) => {
    const { data } = await api.get('/recruitment/application-documents/', { params: { application: applicationId } });
    return data;
  },

  uploadApplicationDocument: async (applicationId: number, formData: FormData) => {
    formData.append('application', String(applicationId));
    const { data } = await api.post('/recruitment/application-documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  deleteApplicationDocument: async (documentId: number) => {
    await api.delete(`/recruitment/application-documents/${documentId}/`);
  },

  bulkUploadCvs: async (jobOfferId: number, files: File[]): Promise<BulkCvUploadResult> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('cvs', file));
    // Chaque CV déclenche 2 appels IA séquentiels côté serveur (identité + scoring) :
    // le timeout par défaut (15s) est insuffisant dès qu'il y a plus d'un fichier.
    const { data } = await api.post(`/recruitment/job-offers/${jobOfferId}/bulk-upload-cvs/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return data;
  },
};

export interface BulkCvUploadResult {
  created: number;
  total_files: number;
  errors: { filename: string; reason: string }[];
}

export interface GeneratedJobOfferDraft {
  title: string;
  department: string;
  location: string;
  job_type: string;
  description: string;
  requirements: string;
  salary_range: string;
}
