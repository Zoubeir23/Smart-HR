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

  it('retourne 0 quand le compteur de non-lus est absent de la réponse', async () => {
    getMock.mockResolvedValue({ data: {} });

    await expect(messagingService.getUnreadTotal()).resolves.toBe(0);
  });
});
