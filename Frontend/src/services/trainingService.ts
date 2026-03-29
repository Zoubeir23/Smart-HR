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

  getMeetings: async () => {
    const { data } = await api.get('/formation/meetings/');
    return data;
  },

  createMeeting: async (meetingData: Record<string, unknown>) => {
    const { data } = await api.post('/formation/meetings/', meetingData);
    return data;
  },
};
