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

  generateInterviewQuestions: async (payload: {
    job_position: string;
    job_description: string;
    duration: string;
    interview_type: string;
  }) => {
    const { data } = await api.post('/ai/interview/questions/', payload);
    return data;
  },

  generateInterviewFeedback: async (conversation: { role: string; content: string }[]) => {
    const { data } = await api.post('/ai/interview/feedback/', { conversation });
    return data;
  },
};
