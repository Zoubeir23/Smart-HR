import api from './api';

// Backend: POST /api/v1/ai/chat/ — génère une réponse Gemini et sauvegarde l'échange
// Backend: GET  /api/v1/ai/chat/ — liste l'historique des conversations

export const aiService = {
  // Envoie une question et reçoit une réponse IA générée
  chat: async (question: string) => {
    const { data } = await api.post('/ai/chat/', { question });
    return data;
  },

  // Récupère l'historique des conversations de l'utilisateur connecté
  getChatHistory: async () => {
    const { data } = await api.get('/ai/chat/');
    return data;
  },
};
