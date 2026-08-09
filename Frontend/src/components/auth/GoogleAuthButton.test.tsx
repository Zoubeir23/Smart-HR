import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GoogleAuthButton } from './GoogleAuthButton';

const { googleLoginPropsSpy } = vi.hoisted(() => ({
  googleLoginPropsSpy: vi.fn(),
}));

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: (props: Record<string, unknown>) => {
    googleLoginPropsSpy(props);
    return (
      <button
        type="button"
        onClick={() => (props.onSuccess as (r: unknown) => void)({ credential: 'jeton-google' })}
      >
        Google
      </button>
    );
  },
}));

describe('GoogleAuthButton', () => {
  beforeEach(() => {
    googleLoginPropsSpy.mockClear();
  });

  it('impose une largeur explicite au bouton Google', () => {
    /* Régression : sans prop `width`, Google dimensionne le bouton en fonction
     * de son texte. Il ne s'alignait donc pas sur le bouton pleine largeur du
     * formulaire juste au-dessus — la mise en page paraissait décalée.
     * Google Identity Services n'accepte qu'une largeur en pixels. */
    render(<GoogleAuthButton onCredential={vi.fn()} onFailure={vi.fn()} />);

    const passedProps = googleLoginPropsSpy.mock.calls.at(-1)?.[0];
    expect(typeof passedProps.width).toBe('number');
    expect(passedProps.width).toBeGreaterThan(0);
    expect(passedProps.width).toBeLessThanOrEqual(400);
  });

  it("transmet l'ID token au parent lorsque Google authentifie l'utilisateur", () => {
    const onCredential = vi.fn();
    render(<GoogleAuthButton onCredential={onCredential} onFailure={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /google/i }));

    expect(onCredential).toHaveBeenCalledWith('jeton-google');
  });

  it('signale un échec lisible quand Google ne renvoie aucun jeton', () => {
    const onFailure = vi.fn();
    render(<GoogleAuthButton onCredential={vi.fn()} onFailure={onFailure} />);

    const passedProps = googleLoginPropsSpy.mock.calls.at(-1)?.[0];
    (passedProps.onSuccess as (r: unknown) => void)({ credential: undefined });

    expect(onFailure).toHaveBeenCalledWith(expect.stringMatching(/jeton/i));
  });

  it('signale un échec lisible quand Google interrompt la connexion', () => {
    const onFailure = vi.fn();
    render(<GoogleAuthButton onCredential={vi.fn()} onFailure={onFailure} />);

    const passedProps = googleLoginPropsSpy.mock.calls.at(-1)?.[0];
    (passedProps.onError as () => void)();

    expect(onFailure).toHaveBeenCalledWith(expect.stringMatching(/réessayez/i));
  });

  it('utilise le libellé demandé (connexion ou inscription)', () => {
    render(<GoogleAuthButton text="signup_with" onCredential={vi.fn()} onFailure={vi.fn()} />);

    expect(googleLoginPropsSpy.mock.calls.at(-1)?.[0].text).toBe('signup_with');
  });
});
