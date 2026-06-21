import api from './api';

// Backend: /api/v1/performance/skills/
// Backend: /api/v1/performance/evaluations/
// Backend: /api/v1/formation/participations/

export interface SkillPayload {
  employee: number;
  name: string;
  category: string;
  level: number;
  notes?: string;
}

export interface EvaluationPayload {
  employee: number;
  year: number;
  objectives: string;
  achievements?: string;
  global_score?: number | null;
  status?: string;
  comments?: string;
}

export interface ParticipationPayload {
  employee: number;
  formation: number;
  status?: string;
  completed_at?: string | null;
  notes?: string;
}

export const performanceService = {
  // ── Skills ───────────────────────────────────────────────────────
  getAllSkills: async (params?: { employee_id?: number; category?: string; search?: string }) => {
    const { data } = await api.get('/performance/skills/', { params });
    return data;
  },

  createSkill: async (payload: SkillPayload) => {
    const { data } = await api.post('/performance/skills/', payload);
    return data;
  },

  updateSkill: async (id: number, payload: Partial<SkillPayload>) => {
    const { data } = await api.patch(`/performance/skills/${id}/`, payload);
    return data;
  },

  deleteSkill: async (id: number) => {
    await api.delete(`/performance/skills/${id}/`);
  },

  // ── Evaluations ───────────────────────────────────────────────────
  getAllEvaluations: async (params?: { year?: number; status?: string; employee_id?: number; search?: string }) => {
    const { data } = await api.get('/performance/evaluations/', { params });
    return data;
  },

  createEvaluation: async (payload: EvaluationPayload) => {
    const { data } = await api.post('/performance/evaluations/', payload);
    return data;
  },

  updateEvaluation: async (id: number, payload: Partial<EvaluationPayload>) => {
    const { data } = await api.patch(`/performance/evaluations/${id}/`, payload);
    return data;
  },

  deleteEvaluation: async (id: number) => {
    await api.delete(`/performance/evaluations/${id}/`);
  },

  getStats: async () => {
    const { data } = await api.get('/performance/evaluations/stats/');
    return data;
  },

  // ── Participations (dans formation app) ──────────────────────────
  getAllParticipations: async (params?: { formation_id?: number; employee_id?: number }) => {
    const { data } = await api.get('/formation/participations/', { params });
    return data;
  },

  createParticipation: async (payload: ParticipationPayload) => {
    const { data } = await api.post('/formation/participations/', payload);
    return data;
  },

  updateParticipation: async (id: number, payload: Partial<ParticipationPayload>) => {
    const { data } = await api.patch(`/formation/participations/${id}/`, payload);
    return data;
  },

  deleteParticipation: async (id: number) => {
    await api.delete(`/formation/participations/${id}/`);
  },
};
