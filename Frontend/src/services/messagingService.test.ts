import { describe, expect, it, vi } from 'vitest';

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('./api', () => ({
  default: {
    get: getMock,
    post: postMock,
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { messagingService } from './messagingService';

describe('messagingService', () => {
  it('récupère les contacts autorisés et retourne un tableau vide si absent', async () => {
    getMock.mockResolvedValue({ data: {} });

    const contacts = await messagingService.listContacts({ search: 'diop' });

    expect(getMock).toHaveBeenCalledWith(
      '/messaging/contacts/',
      expect.objectContaining({ params: expect.objectContaining({ search: 'diop' }) }),
    );
    expect(contacts).toEqual([]);
  });

  it('ouvre une conversation via POST /messaging/conversations/', async () => {
    postMock.mockResolvedValue({ data: { id: 3 } });

    const conversation = await messagingService.startConversation({
      participant_id: 12,
      body: 'Votre candidature est retenue.',
    });

    expect(postMock).toHaveBeenCalledWith('/messaging/conversations/', {
      participant_id: 12,
      body: 'Votre candidature est retenue.',
    });
    expect(conversation.id).toBe(3);
  });

  it('envoie un message dans le fil ciblé', async () => {
    postMock.mockResolvedValue({ data: { id: 9, body: 'Merci' } });

    await messagingService.sendMessage(3, 'Merci');

    expect(postMock).toHaveBeenCalledWith('/messaging/conversations/3/messages/', { body: 'Merci' });
  });

  it('borne la fenêtre du fil et normalise la réponse', async () => {
    getMock.mockResolvedValue({ data: { results: [{ id: 1 }], total: 120, has_more: true } });

    const thread = await messagingService.listMessages(3, 50);

    expect(getMock).toHaveBeenCalledWith('/messaging/conversations/3/messages/', {
      params: { limit: 50 },
    });
    expect(thread).toEqual({ results: [{ id: 1 }], total: 120, has_more: true });
  });

  it('normalise un fil dont la réponse est incomplète', async () => {
    getMock.mockResolvedValue({ data: {} });

    await expect(messagingService.listMessages(3)).resolves.toEqual({
      results: [],
      total: 0,
      has_more: false,
    });
  });

  it('demande une page bornée de conversations', async () => {
    getMock.mockResolvedValue({ data: { results: [], unread_total: 0 } });

    await messagingService.listConversations({ pageSize: 50 });

    expect(getMock).toHaveBeenCalledWith('/messaging/conversations/', {
      params: { page_size: 50 },
    });
  });

  it('récupère une conversation à l\'unité pour les liens directs', async () => {
    getMock.mockResolvedValue({ data: { id: 7 } });

    const conversation = await messagingService.getConversation(7);

    expect(getMock).toHaveBeenCalledWith('/messaging/conversations/7/');
    expect(conversation.id).toBe(7);
  });

  it('retourne 0 quand le compteur de non-lus est absent de la réponse', async () => {
    getMock.mockResolvedValue({ data: {} });

    await expect(messagingService.getUnreadTotal()).resolves.toBe(0);
  });
});
