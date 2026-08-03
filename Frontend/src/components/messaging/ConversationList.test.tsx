import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConversationList from './ConversationList';
import type { Conversation } from '@/services/messagingService';

function buildConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 1,
    kind: 'direct',
    subject: '',
    display_title: 'Awa Ndiaye',
    participants_detail: [],
    last_message: null,
    unread_count: 0,
    last_message_at: null,
    created_at: '2026-08-01T10:00:00Z',
    ...overrides,
  };
}

describe('ConversationList', () => {
  it('affiche un état vide quand aucune conversation', () => {
    render(
      <ConversationList
        conversations={[]}
        selectedConversationId={null}
        searchTerm=""
        isLoading={false}
        onSearchChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText(/Aucune conversation/)).toBeInTheDocument();
  });

  it('affiche le compteur de messages non lus', () => {
    render(
      <ConversationList
        conversations={[buildConversation({ unread_count: 3 })]}
        selectedConversationId={null}
        searchTerm=""
        isLoading={false}
        onSearchChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('propose de charger plus de conversations quand la fenêtre est tronquée', () => {
    const onLoadMore = vi.fn();
    render(
      <ConversationList
        conversations={[buildConversation()]}
        selectedConversationId={null}
        searchTerm=""
        isLoading={false}
        onSearchChange={vi.fn()}
        onSelect={vi.fn()}
        hasMore
        onLoadMore={onLoadMore}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /plus de conversations/i }));

    expect(onLoadMore).toHaveBeenCalled();
  });

  it('remonte la conversation sélectionnée', () => {
    const onSelect = vi.fn();
    render(
      <ConversationList
        conversations={[buildConversation({ id: 42 })]}
        selectedConversationId={null}
        searchTerm=""
        isLoading={false}
        onSearchChange={vi.fn()}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText('Awa Ndiaye'));

    expect(onSelect).toHaveBeenCalledWith(42);
  });
});
