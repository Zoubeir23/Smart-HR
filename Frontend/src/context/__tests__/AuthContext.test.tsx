import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider } from '../AuthContext';

const { getCurrentUserMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
}));

vi.mock('@/services/authService', () => ({
  authService: {
    getCurrentUser: getCurrentUserMock,
    logout: vi.fn(),
  },
}));

function TestChild() {
  return <div>contenu protégé</div>;
}

function dispatchPageShow(persisted: boolean) {
  const pageshowEvent = new Event('pageshow') as PageTransitionEvent & { persisted: boolean };
  Object.defineProperty(pageshowEvent, 'persisted', { value: persisted });
  window.dispatchEvent(pageshowEvent);
}

describe('AuthProvider — protection contre le bfcache', () => {
  let reloadSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("recharge la page quand l'état d'authentification figé dans le cache ne correspond plus au token réel", async () => {
    /* Régression : après une déconnexion, le bouton "Précédent" du
     * navigateur pouvait restaurer une page protégée depuis le bfcache
     * sans re-vérifier l'authentification, affichant furtivement l'ancien
     * contenu comme si l'utilisateur était toujours connecté. On simule ici
     * une page mise en cache pendant que l'utilisateur était connecté, puis
     * une déconnexion (suppression du token) survenue entre-temps. */
    localStorage.setItem('access_token', 'fake-token');
    localStorage.setItem('refresh_token', 'fake-refresh');
    getCurrentUserMock.mockResolvedValue({ id: 1, email: 'rh@test.com', role: 'RH' });

    render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    );
    await waitFor(() => expect(getCurrentUserMock).toHaveBeenCalled());

    // Le token est supprimé (déconnexion survenue) sans que cette page,
    // restaurée depuis le bfcache, n'ait eu l'occasion de le constater.
    localStorage.removeItem('access_token');
    dispatchPageShow(true);

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it("ne recharge pas la page pour une navigation arrière normale (état d'authentification inchangé)", async () => {
    /* Un rechargement systématique sur chaque restauration bfcache casserait
     * l'intérêt du bfcache (retour instantané) pour toute navigation arrière
     * normale, sans lien avec une déconnexion — Sentry (finding réel, PR
     * #202) a signalé cette dégradation UX. */
    localStorage.setItem('access_token', 'fake-token');
    localStorage.setItem('refresh_token', 'fake-refresh');
    getCurrentUserMock.mockResolvedValue({ id: 1, email: 'rh@test.com', role: 'RH' });

    render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    );
    await waitFor(() => expect(getCurrentUserMock).toHaveBeenCalled());

    dispatchPageShow(true);

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("ne recharge pas la page pour un chargement normal (non restauré du bfcache)", async () => {
    getCurrentUserMock.mockRejectedValue(new Error('no token'));
    render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    );

    dispatchPageShow(false);

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('rend son contenu normalement', async () => {
    getCurrentUserMock.mockRejectedValue(new Error('no token'));
    render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    );

    expect(await screen.findByText('contenu protégé')).toBeInTheDocument();
  });
});
