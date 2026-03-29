import api from './api';

// Backend: /api/v1/ai-engine/churn-predictions/
// Backend: POST /api/v1/ai-engine/churn-predictions/predict/{employee_id}/
// Backend: POST /api/v1/ai-engine/churn-predictions/predict-all/
// Backend: GET  /api/v1/ai-engine/churn-predictions/high-risk/

export const churnService = {
  predictEmployee: async (employeeId: number) => {
    const { data } = await api.post(`/ai-engine/churn-predictions/predict/${employeeId}/`);
    return data;
  },

  predictAll: async () => {
    const { data } = await api.post('/ai-engine/churn-predictions/predict-all/');
    return data;
  },

  getAllPredictions: async () => {
    const { data } = await api.get('/ai-engine/churn-predictions/');
    return data;
  },

  getHighRisk: async () => {
    const { data } = await api.get('/ai-engine/churn-predictions/high-risk/');
    return data;
  },
};
