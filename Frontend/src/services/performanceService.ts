import api from './api';
import { LIST_ALL_PAGE_SIZE } from '@/lib/pagination';

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

export interface SkillDefinitionPayload {
  name: string;
  category: string;
  description?: string;
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

export const FEEDBACK_360_TAGS = [
  { value: 'availability', label: 'Disponibilité' },
  { value: 'patience', label: 'Patience' },
  { value: 'anticipation', label: 'Anticipation' },
  { value: 'respect', label: 'Respect' },
  { value: 'emotional_intelligence', label: 'Intelligence émotionnelle' },
  { value: 'open_mindedness', label: "Ouverture d'esprit" },
] as const;

export interface Feedback360 {
  id: number;
  author: number;
  author_name: string;
  recipient: number;
  recipient_name: string;
  context: string;
  comment: string;
  tags: string[];
  created_at: string;
}

export interface Feedback360Payload {
  recipient: number;
  context?: string;
  comment: string;
  tags: string[];
}

export interface CoachingSession {
  id: number;
  coach: number;
  coach_name: string;
  coachee: number;
  coachee_name: string;
  scheduled_at: string;
  topic: string;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  status_display: string;
  created_at: string;
}

export interface CoachingSessionPayload {
  coach: number;
  coachee: number;
  scheduled_at: string;
  topic: string;
  notes?: string;
  status?: string;
}

export const performanceService = {
  // ── Skills ───────────────────────────────────────────────────────
  getAllSkills: async (params?: { employee_id?: number; category?: string; search?: string }) => {
    const { data } = await api.get('/performance/skills/', {
      params: { page_size: LIST_ALL_PAGE_SIZE, ...params },
    });
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

  // ── Référentiel de compétences ──────────────────────────────────────
  getAllSkillDefinitions: async (params?: { category?: string; search?: string }) => {
    const { data } = await api.get('/performance/skill-definitions/', {
      params: { page_size: LIST_ALL_PAGE_SIZE, ...params },
    });
    return data;
  },

  createSkillDefinition: async (payload: SkillDefinitionPayload) => {
    const { data } = await api.post('/performance/skill-definitions/', payload);
    return data;
  },

  deleteSkillDefinition: async (id: number) => {
    await api.delete(`/performance/skill-definitions/${id}/`);
  },

  // ── Evaluations ───────────────────────────────────────────────────
  getAllEvaluations: async (params?: { year?: number; status?: string; employee_id?: number; search?: string }) => {
    const { data } = await api.get('/performance/evaluations/', {
      params: { page_size: LIST_ALL_PAGE_SIZE, ...params },
    });
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

  // ── Feedback 360° ─────────────────────────────────────────────────
  getAllFeedback360: async (params?: { recipient?: number }) => {
    const { data } = await api.get('/performance/feedback-360/', {
      params: { page_size: LIST_ALL_PAGE_SIZE, ...params },
    });
    return data;
  },

  createFeedback360: async (payload: Feedback360Payload) => {
    const { data } = await api.post('/performance/feedback-360/', payload);
    return data;
  },

  // ── Coaching one-to-one ───────────────────────────────────────────
  getAllCoachingSessions: async () => {
    const { data } = await api.get('/performance/coaching-sessions/', {
      params: { page_size: LIST_ALL_PAGE_SIZE },
    });
    return data;
  },

  createCoachingSession: async (payload: CoachingSessionPayload) => {
    const { data } = await api.post('/performance/coaching-sessions/', payload);
    return data;
  },

  updateCoachingSession: async (id: number, payload: Partial<CoachingSessionPayload>) => {
    const { data } = await api.patch(`/performance/coaching-sessions/${id}/`, payload);
    return data;
  },

  deleteCoachingSession: async (id: number) => {
    await api.delete(`/performance/coaching-sessions/${id}/`);
  },
};
