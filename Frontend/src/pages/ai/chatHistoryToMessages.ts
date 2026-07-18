import type { ChatHistoryEntry } from '@/services/aiService';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  actionType?: string;
  actionData?: Record<string, unknown>;
}

export function chatHistoryToMessages(history: ChatHistoryEntry[]): Message[] {
  return history.flatMap((entry) => [
    { id: `${entry.id}-q`, text: entry.question, sender: 'user' as const, timestamp: new Date(entry.created_at) },
    {
      id: `${entry.id}-r`,
      text: entry.response,
      sender: 'ai' as const,
      timestamp: new Date(entry.created_at),
      actionType: entry.action_type || undefined,
      actionData: entry.action_data,
    },
  ]);
}
