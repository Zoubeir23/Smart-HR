import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import LandingPage from '../LandingPage';

const { useAuthMock, navigateMock, getJobsMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(() => ({ isAuthenticated: false })),
  navigateMock: vi.fn(),
  getJobsMock: vi.fn().mockResolvedValue({ results: [] }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: useAuthMock,
}));

vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

vi.mock('@/services/recruitmentService', () => ({
  recruitmentService: {
    getJobs: getJobsMock,
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderLandingPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('LandingPage', () => {
  it("affiche Connexion et Inscription pour un visiteur non connecté", () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false });
    renderLandingPage();

    expect(screen.getAllByText('Connexion').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inscription').length).toBeGreaterThan(0);
    expect(screen.queryByText('Tableau de bord')).not.toBeInTheDocument();
  });

  it("affiche un lien Tableau de bord au lieu de Connexion/Inscription pour un utilisateur connecté", () => {
    /* Régression : la page d'accueil ignorait complètement l'état
     * d'authentification et affichait toujours Connexion/Inscription,
     * même pour un utilisateur déjà connecté. */
    useAuthMock.mockReturnValue({ isAuthenticated: true });
    renderLandingPage();

    expect(screen.getAllByText('Tableau de bord').length).toBeGreaterThan(0);
    expect(screen.queryByText('Connexion')).not.toBeInTheDocument();
    expect(screen.queryByText('Inscription')).not.toBeInTheDocument();
  });

  it("le lien Tableau de bord pointe vers /dashboard", () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true });
    renderLandingPage();

    const dashboardLinks = screen.getAllByText('Tableau de bord');
    dashboardLinks.forEach((link) => {
      expect(link.closest('a')).toHaveAttribute('href', '/dashboard');
    });
  });

  describe("Section Offres d'emploi — offres publiques", () => {
    it('affiche les offres publiées sans authentification', async () => {
      useAuthMock.mockReturnValue({ isAuthenticated: false });
      getJobsMock.mockResolvedValueOnce({
        results: [
          { id: 42, title: 'Développeur Backend Django', department: 'Informatique', location: 'Dakar, Sénégal', job_type: 'full_time', description: 'Rejoignez notre équipe technique.' },
        ],
      });
      renderLandingPage();

      expect(await screen.findByText('Développeur Backend Django')).toBeInTheDocument();
      expect(screen.getByText('Informatique')).toBeInTheDocument();
      expect(screen.getByText('Dakar, Sénégal')).toBeInTheDocument();
    });

    it("affiche un état vide quand aucune offre n'est ouverte", async () => {
      useAuthMock.mockReturnValue({ isAuthenticated: false });
      getJobsMock.mockResolvedValueOnce({ results: [] });
      renderLandingPage();

      expect(await screen.findByText('Aucune offre ouverte pour le moment')).toBeInTheDocument();
    });

    it("redirige un visiteur non connecté vers /login avec le retour vers la candidature", async () => {
      useAuthMock.mockReturnValue({ isAuthenticated: false });
      getJobsMock.mockResolvedValueOnce({
        results: [{ id: 7, title: 'Chargé de recrutement', department: 'RH', location: 'Abidjan', job_type: 'contract', description: 'Pilotez le recrutement.' }],
      });
      renderLandingPage();

      const applyButton = await screen.findByRole('button', { name: /Postuler/i });
      fireEvent.click(applyButton);

      expect(navigateMock).toHaveBeenCalledWith('/login', {
        state: { from: { pathname: '/jobs/7/apply' } },
      });
    });

    it('envoie un candidat connecté directement vers la page de candidature', async () => {
      useAuthMock.mockReturnValue({ isAuthenticated: true, user: { role: 'CANDIDATE' } });
      getJobsMock.mockResolvedValueOnce({
        results: [{ id: 9, title: 'Analyste RH', department: 'RH', location: 'Dakar', job_type: 'internship', description: 'Stage analyse RH.' }],
      });
      renderLandingPage();

      const applyButton = await screen.findByRole('button', { name: /Postuler/i });
      fireEvent.click(applyButton);

      await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/jobs/9/apply'));
    });

    it("envoie un utilisateur connecté non-candidat vers l'espace offres protégé", async () => {
      useAuthMock.mockReturnValue({ isAuthenticated: true, user: { role: 'RH' } });
      getJobsMock.mockResolvedValueOnce({
        results: [{ id: 11, title: 'Comptable', department: 'Finance', location: 'Dakar', job_type: 'full_time', description: 'Gestion comptable.' }],
      });
      renderLandingPage();

      const applyButton = await screen.findByRole('button', { name: /Postuler/i });
      fireEvent.click(applyButton);

      await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/jobs'));
    });
  });
});
