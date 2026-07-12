import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Navbar from './Navbar';

const { listMock } = vi.hoisted(() => ({ listMock: vi.fn() }));

vi.mock('@/services/notificationService', () => ({
  notificationService: {
    list: listMock,
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

vi.mock('@/context/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('@/context/AuthContext')>('@/context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: { id: 1, first_name: 'Awa', last_name: 'Diop', role: 'RH' },
      logout: vi.fn(),
    }),
  };
});

function renderNavbar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Navbar — boutons icône-seule identifiables au clavier et au lecteur d\'écran', () => {
  it('le bouton de thème porte un nom accessible explicite', async () => {
    listMock.mockResolvedValue({ results: [], unread_count: 0 });
    renderNavbar();

    expect(await screen.findByRole('button', { name: 'Passer en mode sombre' })).toBeInTheDocument();
  });

  it('le bouton notifications annonce le nombre de non-lues dans son nom accessible', async () => {
    listMock.mockResolvedValue({ results: [], unread_count: 3 });
    renderNavbar();

    expect(await screen.findByRole('button', { name: 'Notifications, 3 non lues' })).toBeInTheDocument();
  });

  it('le bouton notifications reste identifiable sans notification non lue', async () => {
    listMock.mockResolvedValue({ results: [], unread_count: 0 });
    renderNavbar();

    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it("le menu utilisateur porte un nom accessible incluant l'identité de l'utilisateur", async () => {
    listMock.mockResolvedValue({ results: [], unread_count: 0 });
    renderNavbar();

    expect(await screen.findByRole('button', { name: 'Menu du compte — Awa Diop' })).toBeInTheDocument();
  });
});
