import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('propose de charger les messages plus anciens quand le fil est tronqué', () => {
    const onLoadOlderMessages = vi.fn();
    render(
      <MessageThread
        messages={[buildMessage()]}
        isLoading={false}
        hasOlderMessages
        onLoadOlderMessages={onLoadOlderMessages}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /messages plus anciens/i }));

    expect(onLoadOlderMessages).toHaveBeenCalled();
  });

  it('remplace le bouton par une explication à la fenêtre maximale', () => {
    render(
      <MessageThread
        messages={[buildMessage()]}
        isLoading={false}
        hasOlderMessages
        canLoadOlderMessages={false}
      />,
    );

    expect(screen.queryByRole('button', { name: /messages plus anciens/i })).not.toBeInTheDocument();
    expect(screen.getByText(/les plus récents sont affichés/)).toBeInTheDocument();
  });

  it("n'affiche aucune commande quand le fil est complet", () => {
    render(<MessageThread messages={[buildMessage()]} isLoading={false} />);

    expect(screen.queryByRole('button', { name: /messages plus anciens/i })).not.toBeInTheDocument();
  });
});
