import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageThread from './MessageThread';
import type { ChatMessage } from '@/services/messagingService';

function buildMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 1,
    conversation: 1,
    sender: 4,
    sender_name: 'Awa Ndiaye',
    sender_role: 'RH',
    body: 'Votre candidature est retenue.',
    is_mine: false,
    created_at: '2026-08-01T10:00:00Z',
    ...overrides,
  };
}

describe('MessageThread', () => {
  it("affiche un état vide explicite quand il n'y a aucun message", () => {
    render(<MessageThread messages={[]} isLoading={false} />);

    expect(screen.getByText(/Aucun message/)).toBeInTheDocument();
  });

  it('affiche le nom de l\'expéditeur pour les messages reçus', () => {
    render(<MessageThread messages={[buildMessage()]} isLoading={false} />);

    expect(screen.getByText(/Awa Ndiaye/)).toBeInTheDocument();
    expect(screen.getByText('Votre candidature est retenue.')).toBeInTheDocument();
  });

  it('affiche « Vous » pour les messages envoyés par l\'utilisateur courant', () => {
    render(<MessageThread messages={[buildMessage({ is_mine: true })]} isLoading={false} />);

    expect(screen.getByText(/^Vous ·/)).toBeInTheDocument();
  });
});
