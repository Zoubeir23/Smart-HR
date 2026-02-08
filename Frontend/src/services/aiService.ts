import api from './api';

export const aiService = {
  chat: async (question: string) => {
    const { data } = await api.post('/genai/chat/', { question });
    return data;
  },

  getChatHistory: async () => {
    const { data } = await api.get('/genai/history/');
    return data;
  },

  voiceAsk: async (query: string, voice: string = 'nova') => {
    const { data } = await api.post('/agents/voice/ask/', { query, voice });
    return data;
  },
};
