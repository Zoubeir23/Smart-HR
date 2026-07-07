import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ConversationSidebar from './ConversationSidebar';

const baseProps = {
  newLabel: 'Nouvelle conversation',
  emptyLabel: 'Aucune conversation',
  deleteTitle: 'Supprimer cette conversation ?',
  deleteDescription: 'Cette action est irréversible.',
};

describe('ConversationSidebar', () => {
  it('affiche un état vide quand il n\'y a aucune conversation', () => {
    render(
      <ConversationSidebar
        {...baseProps}
        items={[]}
        activeId={null}
        onSelect={vi.fn()}
        onNew={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Aucune conversation')).toBeInTheDocument();
  });

  it('liste les conversations fournies', () => {
    render(
      <ConversationSidebar
        {...baseProps}
        items={[
          { id: 1, title: 'Congés annuels', updated_at: new Date().toISOString() },
          { id: 2, title: 'Question paie', updated_at: new Date().toISOString() },
        ]}
        activeId={null}
        onSelect={vi.fn()}
        onNew={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Congés annuels')).toBeInTheDocument();
    expect(screen.getByText('Question paie')).toBeInTheDocument();
  });

  it('appelle onSelect au clic sur une conversation', () => {
    const onSelect = vi.fn();
    render(
      <ConversationSidebar
        {...baseProps}
        items={[{ id: 42, title: 'Congés annuels', updated_at: new Date().toISOString() }]}
        activeId={null}
        onSelect={onSelect}
        onNew={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Congés annuels'));
    expect(onSelect).toHaveBeenCalledWith(42);
  });

  it('appelle onNew au clic sur le bouton nouvelle conversation', () => {
    const onNew = vi.fn();
    render(
      <ConversationSidebar
        {...baseProps}
        items={[]}
        activeId={null}
        onSelect={vi.fn()}
        onNew={onNew}
        onDelete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /nouvelle conversation/i }));
    expect(onNew).toHaveBeenCalled();
  });

  it('demande confirmation avant de supprimer, puis appelle onDelete', () => {
    const onDelete = vi.fn();
    render(
      <ConversationSidebar
        {...baseProps}
        items={[{ id: 7, title: 'Congés annuels', updated_at: new Date().toISOString() }]}
        activeId={null}
        onSelect={vi.fn()}
        onNew={vi.fn()}
        onDelete={onDelete}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /supprimer la conversation/i }));
    expect(screen.getByText('Supprimer cette conversation ?')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^supprimer$/i }));
    expect(onDelete).toHaveBeenCalledWith(7);
  });

  it('ne sélectionne pas la conversation quand on clique sur supprimer', () => {
    const onSelect = vi.fn();
    render(
      <ConversationSidebar
        {...baseProps}
        items={[{ id: 7, title: 'Congés annuels', updated_at: new Date().toISOString() }]}
        activeId={null}
        onSelect={onSelect}
        onNew={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /supprimer la conversation/i }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
