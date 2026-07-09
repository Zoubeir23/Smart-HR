import axios from 'axios';
import api from './api';

type ConversationRole = 'user' | 'assistant' | 'system';

export interface ConversationMessage {
  role: ConversationRole;
  content: string;
}

export interface InterviewQuestion {
  question: string;
  type: string;
}

export interface InterviewSessionData {
  token: string;
  job_position: string;
  job_description: string;
  duration: string;
  interview_type: string;
  questions: InterviewQuestion[];
}

export interface CreateInterviewSessionPayload {
  job_position: string;
  job_description: string;
  duration: string;
  interview_type: string;
  questions: InterviewQuestion[];
}

export interface SubmitInterviewFeedbackPayload {
  candidate_name: string;
  candidate_email: string;
  conversation: ConversationMessage[];
}

export interface InterviewSessionFeedbackResponse {
  id: number;
  feedback: Record<string, unknown>;
  recommended: boolean;
}

export interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatHistoryEntry {
  id: number;
  conversation: number | null;
  question: string;
  response: string;
  action_type: string;
  action_data: Record<string, unknown>;
  created_at: string;
}

export interface VoiceSession {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface VoiceMessageEntry {
  id: number;
  session: number | null;
  question: string;
  response: string;
  audio_url: string;
  voice: string;
  created_at: string;
}

// Même logique de repli que services/api.ts : un chemin relatif (/api/v1) si
// VITE_API_URL est vide, jamais un hôte fixe type localhost — voir le
// commentaire détaillé dans api.ts pour le pourquoi (nginx.vps.conf en
// production, proxy Vite en dev).
export function normalizeApiBaseUrl(): string {
  const rawApiUrl = (import.meta.env.VITE_API_URL || '') as string;
  const trimmedApiUrl = rawApiUrl.trim().replace(/\/+$/, '');
  if (!trimmedApiUrl) return '/api/v1';
  if (trimmedApiUrl.endsWith('/api')) return `${trimmedApiUrl}/v1`;
  return trimmedApiUrl;
}

// Instance axios sans header Authorization — pour les endpoints publics
const publicApi = axios.create({
  baseURL: normalizeApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

function getAxiosErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Erreur réseau inattendue.';
}

export const aiService = {
  chat: async (question: string, conversationId?: number) => {
    try {
      const { data } = await api.post('/ai/chat/', {
        question,
        ...(conversationId ? { conversation: conversationId } : {}),
      });
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

  // ── Historique de conversations (chat) ──────────────────────────────────

  getConversations: async (): Promise<Conversation[]> => {
    try {
      const { data } = await api.get('/ai/conversations/');
      return data?.results ?? data ?? [];
    } catch (error: unknown) {
      throw new Error(getAxiosErrorMessage(error));
    }
  },

  getConversationMessages: async (conversationId: number): Promise<ChatHistoryEntry[]> => {
    try {
      const { data } = await api.get(`/ai/conversations/${conversationId}/messages/`);
      return data;
    } catch (error: unknown) {
      throw new Error(getAxiosErrorMessage(error));
    }
  },

  deleteConversation: async (conversationId: number): Promise<void> => {
    try {
      await api.delete(`/ai/conversations/${conversationId}/`);
    } catch (error: unknown) {
      throw new Error(getAxiosErrorMessage(error));
    }
  },

  voiceAsk: async (question: string, voice: 'nova' | 'alloy' | 'echo' = 'nova', sessionId?: number) => {
    try {
      const { data } = await api.post('/agents/voice/ask/', {
        question,
        voice,
        ...(sessionId ? { session: sessionId } : {}),
      });
      return data;
    } catch (error: unknown) {
      throw new Error(getAxiosErrorMessage(error));
    }
  },

  // ── Historique de sessions (assistant vocal) ────────────────────────────

  getVoiceSessions: async (): Promise<VoiceSession[]> => {
    try {
      const { data } = await api.get('/agents/voice/sessions/');
      return data?.results ?? data ?? [];
    } catch (error: unknown) {
      throw new Error(getAxiosErrorMessage(error));
    }
  },

  getVoiceSessionMessages: async (sessionId: number): Promise<VoiceMessageEntry[]> => {
    try {
      const { data } = await api.get(`/agents/voice/sessions/${sessionId}/messages/`);
      return data;
    } catch (error: unknown) {
      throw new Error(getAxiosErrorMessage(error));
    }
  },

  deleteVoiceSession: async (sessionId: number): Promise<void> => {
    try {
      await api.delete(`/agents/voice/sessions/${sessionId}/`);
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

  // ── Gestion des sessions partagées (lien candidat) ──────────────────────

  createInterviewSession: async (
    payload: CreateInterviewSessionPayload
  ): Promise<{ token: string; job_position: string; duration: string; interview_type: string; questions_count: number; created_at: string }> => {
    try {
      const { data } = await api.post('/ai/interview/sessions/create/', payload);
      return data;
    } catch (error: unknown) {
      throw new Error(getAxiosErrorMessage(error));
    }
  },

  // Appel public — pas de JWT
  getInterviewSession: async (token: string): Promise<InterviewSessionData> => {
    try {
      const { data } = await publicApi.get(`/ai/interview/sessions/${token}/`);
      return data;
    } catch (error: unknown) {
      throw new Error(getAxiosErrorMessage(error));
    }
  },

  // Appel public — pas de JWT
  submitInterviewFeedback: async (
    token: string,
    payload: SubmitInterviewFeedbackPayload
  ): Promise<InterviewSessionFeedbackResponse> => {
    try {
      const { data } = await publicApi.post(`/ai/interview/sessions/${token}/feedback/`, payload);
      return data;
    } catch (error: unknown) {
      throw new Error(getAxiosErrorMessage(error));
    }
  },

  listInterviewSessions: async () => {
    try {
      const { data } = await api.get('/ai/interview/sessions/');
      return data;
    } catch (error: unknown) {
      throw new Error(getAxiosErrorMessage(error));
    }
  },
};
