import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LandingPage from '../LandingPage';

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(() => ({ isAuthenticated: false })),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: useAuthMock,
}));

vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

function renderLandingPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
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
});
