import api from './api';
import { LIST_ALL_PAGE_SIZE } from '@/lib/pagination';

// Backend: /api/v1/messaging/

export type ContactRole = 'ADMIN' | 'RH' | 'EMPLOYEE' | 'CANDIDATE';

export interface Contact {
  id: number;
  full_name: string;
  email: string;
  role: ContactRole;
  role_display: string;
}

export interface ChatMessage {
  id: number;
  conversation: number;
  sender: number | null;
  sender_name: string;
  sender_role: string;
  body: string;
  is_mine: boolean;
  created_at: string;
}

export interface Conversation {
  id: number;
  subject: string;
  display_title: string;
  participants_detail: Contact[];
  last_message: ChatMessage | null;
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
}

export interface ConversationListResponse {
  results: Conversation[];
  unread_total: number;
  /** Absent quand la réponse n'est pas paginée. */
  count?: number;
  next?: string | null;
}

export interface MessageThreadResponse {
  results: ChatMessage[];
  total: number;
  /** `true` quand des messages plus anciens existent hors de la fenêtre chargée. */
  has_more: boolean;
}

/** Fenêtres alignées sur les bornes serveur (`MAX_THREAD_PAGE_SIZE`, `max_page_size`). */
export const DEFAULT_THREAD_WINDOW = 50;
export const MAX_THREAD_WINDOW = 200;
export const DEFAULT_CONVERSATIONS_WINDOW = 50;
export const MAX_CONVERSATIONS_WINDOW = 200;

export interface StartConversationPayload {
  participant_id: number;
  subject?: string;
  body?: string;
}

export const messagingService = {
  /** Annuaire des interlocuteurs autorisés pour le rôle de l'utilisateur courant. */
  listContacts: async (params?: { search?: string; role?: ContactRole }): Promise<Contact[]> => {
    const { data } = await api.get('/messaging/contacts/', {
      params: { page_size: LIST_ALL_PAGE_SIZE, ...params },
    });
    return data.results ?? [];
  },

  listConversations: async (params?: { search?: string; pageSize?: number }): Promise<ConversationListResponse> => {
    const { data } = await api.get('/messaging/conversations/', {
      params: {
        page_size: params?.pageSize ?? DEFAULT_CONVERSATIONS_WINDOW,
        ...(params?.search ? { search: params.search } : {}),
      },
    });
    return data;
  },

  getConversation: async (conversationId: number): Promise<Conversation> => {
    const { data } = await api.get(`/messaging/conversations/${conversationId}/`);
    return data;
  },

  startConversation: async (payload: StartConversationPayload): Promise<Conversation> => {
    const { data } = await api.post('/messaging/conversations/', payload);
    return data;
  },

  listMessages: async (conversationId: number, limit = DEFAULT_THREAD_WINDOW): Promise<MessageThreadResponse> => {
    const { data } = await api.get(`/messaging/conversations/${conversationId}/messages/`, {
      params: { limit },
    });
    return {
      results: data.results ?? [],
      total: data.total ?? 0,
      has_more: data.has_more ?? false,
    };
  },

  sendMessage: async (conversationId: number, body: string): Promise<ChatMessage> => {
    const { data } = await api.post(`/messaging/conversations/${conversationId}/messages/`, { body });
    return data;
  },

  markRead: async (conversationId: number): Promise<void> => {
    await api.post(`/messaging/conversations/${conversationId}/read/`);
  },

  getUnreadTotal: async (): Promise<number> => {
    const { data } = await api.get('/messaging/conversations/unread-count/');
    return data.unread_total ?? 0;
  },
};
