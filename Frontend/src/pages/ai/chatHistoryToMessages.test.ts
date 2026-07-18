import { describe, expect, it } from 'vitest';
import { chatHistoryToMessages } from './chatHistoryToMessages';
import type { ChatHistoryEntry } from '@/services/aiService';

function buildEntry(overrides: Partial<ChatHistoryEntry> = {}): ChatHistoryEntry {
  return {
    id: 1,
    conversation: 1,
    question: 'Crée une offre d\'emploi pour un développeur Django',
    response: 'Voici votre offre. ✅ Offre d\'emploi créée : **Développeur Backend Django**.',
    action_type: 'job_offer_created',
    action_data: { title: 'Développeur Backend Django', department: 'Technique' },
    created_at: '2026-07-01T10:00:00Z',
    ...overrides,
  };
}

describe('chatHistoryToMessages', () => {
  it('propage action_type/action_data sur le message de réponse IA', () => {
    const messages = chatHistoryToMessages([buildEntry()]);
    const aiMessage = messages.find((message) => message.sender === 'ai');

    expect(aiMessage?.actionType).toBe('job_offer_created');
    expect(aiMessage?.actionData).toEqual({ title: 'Développeur Backend Django', department: 'Technique' });
  });

  it('ne propage aucun actionType quand action_type est une chaîne vide', () => {
    const messages = chatHistoryToMessages([buildEntry({ action_type: '', action_data: {} })]);
    const aiMessage = messages.find((message) => message.sender === 'ai');

    expect(aiMessage?.actionType).toBeUndefined();
  });

  it('conserve le message utilisateur sans champs action', () => {
    const messages = chatHistoryToMessages([buildEntry()]);
    const userMessage = messages.find((message) => message.sender === 'user');

    expect(userMessage?.actionType).toBeUndefined();
  });
});
