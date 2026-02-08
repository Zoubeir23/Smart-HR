import api from './api';

export const trainingService = {
  getFormations: async () => {
    const { data } = await api.get('/formations/formations/');
    return data;
  },

  getFormationById: async (id: number) => {
    const { data } = await api.get(`/formations/formations/${id}/`);
    return data;
  },

  createFormation: async (formationData: Record<string, unknown>) => {
    const { data } = await api.post('/formations/formations/', formationData);
    return data;
  },

  getMeetings: async () => {
    const { data } = await api.get('/formations/meetings/');
    return data;
  },

  createMeeting: async (meetingData: Record<string, unknown>) => {
    const { data } = await api.post('/formations/meetings/', meetingData);
    return data;
  },
};
