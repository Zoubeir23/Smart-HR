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
  kind: 'direct' | 'group';
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
}

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

  listConversations: async (params?: { search?: string }): Promise<ConversationListResponse> => {
    const { data } = await api.get('/messaging/conversations/', { params });
    return data;
  },

  startConversation: async (payload: StartConversationPayload): Promise<Conversation> => {
    const { data } = await api.post('/messaging/conversations/', payload);
    return data;
  },

  listMessages: async (conversationId: number): Promise<ChatMessage[]> => {
    const { data } = await api.get(`/messaging/conversations/${conversationId}/messages/`);
    return data.results ?? [];
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
