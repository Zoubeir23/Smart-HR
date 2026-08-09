import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GoogleAuthButton } from './GoogleAuthButton';

const { useGoogleLoginSpy, startLoginSpy } = vi.hoisted(() => ({
  useGoogleLoginSpy: vi.fn(),
  startLoginSpy: vi.fn(),
}));

vi.mock('@react-oauth/google', () => ({
  useGoogleLogin: (options: Record<string, unknown>) => {
    useGoogleLoginSpy(options);
    return startLoginSpy;
  },
}));

/** Récupère les options passées à useGoogleLogin lors du dernier rendu. */
function lastGoogleOptions() {
  return useGoogleLoginSpy.mock.calls.at(-1)?.[0] as Record<string, unknown>;
}

describe('GoogleAuthButton', () => {
  beforeEach(() => {
    useGoogleLoginSpy.mockClear();
    startLoginSpy.mockClear();
  });

  it('demande systématiquement à Google quel compte utiliser', () => {
    /* Régression : le bouton Google Identity Services affichait un bouton
     * « personnalisé » verrouillé sur la session ouverte, sans possibilité
     * évidente de choisir un autre compte. `prompt: 'select_account'` force
     * Google à présenter le sélecteur de compte à chaque connexion. */
    render(<GoogleAuthButton onAuthorizationCode={vi.fn()} onFailure={vi.fn()} />);

    expect(lastGoogleOptions().prompt).toBe('select_account');
  });

  it("utilise le flux code d'autorisation, échangé côté serveur", () => {
    /* Le flux implicite renverrait un access_token exploitable depuis n'importe
     * quelle application Google : le backend ne pourrait pas garantir que
     * l'identité vient bien de la nôtre. Le code, lui, est échangé côté serveur
     * avec le client_secret. */
    render(<GoogleAuthButton onAuthorizationCode={vi.fn()} onFailure={vi.fn()} />);

    expect(lastGoogleOptions().flow).toBe('auth-code');
  });

  it('ouvre la fenêtre Google au clic', () => {
    render(<GoogleAuthButton onAuthorizationCode={vi.fn()} onFailure={vi.fn()} />);

    fireEvent.click(screen.getByRole('button'));

    expect(startLoginSpy).toHaveBeenCalled();
  });

  it("transmet le code d'autorisation au parent", () => {
    const onAuthorizationCode = vi.fn();
    render(<GoogleAuthButton onAuthorizationCode={onAuthorizationCode} onFailure={vi.fn()} />);

    (lastGoogleOptions().onSuccess as (r: { code: string }) => void)({ code: 'code-google' });

    expect(onAuthorizationCode).toHaveBeenCalledWith('code-google');
  });

  it('signale un échec lisible quand Google ne renvoie aucun code', () => {
    const onFailure = vi.fn();
    render(<GoogleAuthButton onAuthorizationCode={vi.fn()} onFailure={onFailure} />);

    (lastGoogleOptions().onSuccess as (r: { code?: string }) => void)({ code: undefined });

    expect(onFailure).toHaveBeenCalledWith(expect.stringMatching(/code/i));
  });

  it("n'alerte pas l'utilisateur quand il ferme lui-même la fenêtre Google", () => {
    /* Fermer la popup est un abandon volontaire, pas une panne : afficher une
     * alerte rouge dans ce cas serait du bruit. */
    const onFailure = vi.fn();
    render(<GoogleAuthButton onAuthorizationCode={vi.fn()} onFailure={onFailure} />);

    (lastGoogleOptions().onNonOAuthError as () => void)();

    expect(onFailure).not.toHaveBeenCalled();
  });

  it('affiche le libellé demandé et se désactive pendant la connexion', () => {
    const { rerender } = render(
      <GoogleAuthButton
        label="S'inscrire avec Google"
        onAuthorizationCode={vi.fn()}
        onFailure={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /s'inscrire avec google/i })).toBeEnabled();

    rerender(
      <GoogleAuthButton
        label="S'inscrire avec Google"
        isBusy
        onAuthorizationCode={vi.fn()}
        onFailure={vi.fn()}
      />,
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
