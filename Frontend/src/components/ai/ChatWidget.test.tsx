import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChatWidget from './ChatWidget';

const { navigateMock, chatMock, useAuthMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  chatMock: vi.fn(),
  useAuthMock: vi.fn(() => ({ user: { first_name: 'Awa', role: 'EMPLOYEE' } })),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: useAuthMock,
}));

vi.mock('@/services/aiService', () => ({
  aiService: { chat: chatMock },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderWidget(initialPath = '/dashboard') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <ChatWidget />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ChatWidget', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({ user: { first_name: 'Awa', role: 'EMPLOYEE' } });
  });

  it('affiche le bouton flottant fermé par défaut', () => {
    renderWidget();
    expect(screen.getByRole('button', { name: /ouvrir l'assistant ia/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/posez votre question/i)).not.toBeInTheDocument();
  });

  it('ne s\'affiche pas sur la page /ai-chat', () => {
    const { container } = renderWidget('/ai-chat');
    expect(container).toBeEmptyDOMElement();
  });

  it('ouvre le panneau au clic sur le bouton flottant', () => {
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /ouvrir l'assistant ia/i }));
    expect(screen.getByPlaceholderText(/posez votre question/i)).toBeInTheDocument();
    expect(screen.getByText(/bonjour awa/i)).toBeInTheDocument();
  });

  it('envoie une question et affiche la réponse de l\'IA', async () => {
    chatMock.mockResolvedValue({ response: '✅ Congé validé.', conversation: 12 });
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /ouvrir l'assistant ia/i }));

    const textarea = screen.getByPlaceholderText(/posez votre question/i);
    fireEvent.change(textarea, { target: { value: 'Valide le congé de Awa Diallo' } });
    fireEvent.click(screen.getByRole('button', { name: /envoyer/i }));

    expect(screen.getByText('Valide le congé de Awa Diallo')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/congé validé/i)).toBeInTheDocument());
    expect(chatMock).toHaveBeenCalledWith('Valide le congé de Awa Diallo', undefined);
  });

  it('adapte le message de bienvenue au rôle : employé → poser son propre congé', () => {
    useAuthMock.mockReturnValue({ user: { first_name: 'Amadou', role: 'EMPLOYEE' } });
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /ouvrir l'assistant ia/i }));

    expect(screen.getByText(/pose un congé du 12 au 15 août/i)).toBeInTheDocument();
    expect(screen.queryByText(/valide le congé de awa diallo/i)).not.toBeInTheDocument();
  });

  it('adapte le message de bienvenue au rôle : RH → valider un congé', () => {
    useAuthMock.mockReturnValue({ user: { first_name: 'Fatou', role: 'RH' } });
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /ouvrir l'assistant ia/i }));

    expect(screen.getByText(/valide le congé de awa diallo/i)).toBeInTheDocument();
  });

  it('adapte le message de bienvenue au rôle : candidat → aucune action proposée', () => {
    useAuthMock.mockReturnValue({ user: { first_name: 'Moussa', role: 'CANDIDATE' } });
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /ouvrir l'assistant ia/i }));

    expect(screen.getByText(/où en est ma candidature/i)).toBeInTheDocument();
    expect(screen.queryByText(/demandez-moi d'agir/i)).not.toBeInTheDocument();
  });

  it('navigue vers /ai-chat au clic sur "plein écran"', () => {
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /ouvrir l'assistant ia/i }));
    fireEvent.click(screen.getByRole('button', { name: /ouvrir en plein écran/i }));
    expect(navigateMock).toHaveBeenCalledWith('/ai-chat');
  });

  it('personnalise le message de bienvenue une fois l\'utilisateur chargé (auth asynchrone)', () => {
    useAuthMock.mockReturnValue({ user: null });
    const { rerender } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <ChatWidget />
        </MemoryRouter>
      </QueryClientProvider>
    );

    useAuthMock.mockReturnValue({ user: { first_name: 'Awa', role: 'EMPLOYEE' } });
    rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <ChatWidget />
        </MemoryRouter>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /ouvrir l'assistant ia/i }));
    expect(screen.getByText(/bonjour awa/i)).toBeInTheDocument();
  });
});
