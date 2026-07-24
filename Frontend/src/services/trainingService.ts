import api from './api';

// Backend: /api/v1/formation/formations/
// Backend: /api/v1/formation/meetings/

export const trainingService = {
  getFormations: async () => {
    const { data } = await api.get('/formation/formations/');
    return data;
  },

  getFormationById: async (id: number) => {
    const { data } = await api.get(`/formation/formations/${id}/`);
    return data;
  },

  createFormation: async (formationData: Record<string, unknown>) => {
    const { data } = await api.post('/formation/formations/', formationData);
    return data;
  },

  updateFormation: async (id: number, formationData: Record<string, unknown>) => {
    const { data } = await api.patch(`/formation/formations/${id}/`, formationData);
    return data;
  },

  deleteFormation: async (id: number) => {
    await api.delete(`/formation/formations/${id}/`);
  },

  getMeetings: async () => {
    const { data } = await api.get('/formation/meetings/');
    return data;
  },

  createMeeting: async (meetingData: Record<string, unknown>) => {
    const { data } = await api.post('/formation/meetings/', meetingData);
    return data;
  },

  updateMeeting: async (id: number, meetingData: Record<string, unknown>) => {
    const { data } = await api.patch(`/formation/meetings/${id}/`, meetingData);
    return data;
  },

  deleteMeeting: async (id: number) => {
    await api.delete(`/formation/meetings/${id}/`);
  },

  getCompletionStats: async (): Promise<CompletionStats> => {
    const { data } = await api.get('/formation/formations/completion-stats/');
    return data;
  },
};

export interface FormationCompletionStat {
  id: number;
  title: string;
  total_participations: number;
  completed: number;
  completion_rate: number;
  cost: number;
}

export interface CompletionStats {
  global: {
    total_participations: number;
    completed: number;
    completion_rate: number;
    total_cost: number;
    average_cost: number;
  };
  by_formation: FormationCompletionStat[];
}
