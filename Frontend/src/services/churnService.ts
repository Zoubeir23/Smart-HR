import api from './api';

export const churnService = {
  predictEmployee: async (employeeId: number) => {
    const { data } = await api.post(`/ai-engine/predict/${employeeId}/`);
    return data;
  },

  predictAll: async () => {
    const { data } = await api.post('/ai-engine/predict-all/');
    return data;
  },

  getAllPredictions: async () => {
    const { data } = await api.get('/ai-engine/predictions/');
    return data;
  },

  getHighRisk: async () => {
    const { data } = await api.get('/ai-engine/high-risk/');
    return data;
  },
};
