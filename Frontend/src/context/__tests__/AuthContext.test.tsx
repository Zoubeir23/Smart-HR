import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider } from '../AuthContext';

vi.mock('@/services/authService', () => ({
  authService: {
    getCurrentUser: vi.fn().mockRejectedValue(new Error('no token')),
    logout: vi.fn(),
  },
}));

function TestChild() {
  return <div>contenu protégé</div>;
}

describe('AuthProvider — protection contre le bfcache', () => {
  let reloadSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("recharge la page quand l'événement pageshow signale une restauration depuis le bfcache", () => {
    /* Régression : après une déconnexion, le bouton "Précédent" du
     * navigateur pouvait restaurer une page protégée depuis le bfcache
     * sans re-vérifier l'authentification, affichant furtivement l'ancien
     * contenu comme si l'utilisateur était toujours connecté. */
    render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    );

    const pageshowEvent = new Event('pageshow') as PageTransitionEvent & { persisted: boolean };
    Object.defineProperty(pageshowEvent, 'persisted', { value: true });
    window.dispatchEvent(pageshowEvent);

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it("ne recharge pas la page pour un chargement normal (non restauré du bfcache)", () => {
    render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    );

    const pageshowEvent = new Event('pageshow') as PageTransitionEvent & { persisted: boolean };
    Object.defineProperty(pageshowEvent, 'persisted', { value: false });
    window.dispatchEvent(pageshowEvent);

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('rend son contenu normalement', async () => {
    render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    );

    expect(await screen.findByText('contenu protégé')).toBeInTheDocument();
  });
});
