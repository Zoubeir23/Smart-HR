import api from './api';

export const aiService = {
  chat: async (question: string) => {
    const { data } = await api.post('/ai/chat/', { question });
    return data;
  },

  getChatHistory: async () => {
    const { data } = await api.get('/ai/chat/');
    return data;
  },

  voiceAsk: async (question: string, voice: 'nova' | 'alloy' | 'echo' = 'nova') => {
    const { data } = await api.post('/agents/voice/ask/', { question, voice });
    return data;
  },
};
