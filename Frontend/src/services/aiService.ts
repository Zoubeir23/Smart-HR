import api from './api';

type ConversationRole = 'user' | 'assistant' | 'system';

export interface ConversationMessage {
  role: ConversationRole;
  content: string;
}

function getAxiosErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Erreur réseau inattendue.';
}

export const aiService = {
  chat: async (question: string) => {
    try {
      const { data } = await api.post('/ai/chat/', { question });
      return data;
    } catch (error: unknown) {
      throw new Error(getAxiosErrorMessage(error));
    }
  },

  getChatHistory: async () => {
    try {
      const { data } = await api.get('/ai/chat/');
      return data;
    } catch (error: unknown) {
      throw new Error(getAxiosErrorMessage(error));
    }
  },

  voiceAsk: async (question: string, voice: 'nova' | 'alloy' | 'echo' = 'nova') => {
    try {
      const { data } = await api.post('/agents/voice/ask/', { question, voice });
      return data;
    } catch (error: unknown) {
      throw new Error(getAxiosErrorMessage(error));
    }
  },

  generateInterviewQuestions: async (payload: {
    job_position: string;
    job_description: string;
    duration: string;
    interview_type: string;
  }) => {
    try {
      const { data } = await api.post('/ai/interview/questions/', payload);
      return data;
    } catch (error: unknown) {
      throw new Error(getAxiosErrorMessage(error));
    }
  },

  generateInterviewFeedback: async (conversation: ConversationMessage[]) => {
    try {
      const { data } = await api.post('/ai/interview/feedback/', { conversation });
      return data;
    } catch (error: unknown) {
      throw new Error(getAxiosErrorMessage(error));
    }
  },
};
