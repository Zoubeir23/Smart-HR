import { describe, expect, it } from 'vitest';
import { getAuthErrorMessage } from '@/lib/authErrors';

const INVALID_CREDENTIALS = 'Email ou mot de passe incorrect';

describe('getAuthErrorMessage', () => {
  it("n'annonce PAS un mauvais mot de passe quand le serveur est en panne (502)", () => {
    /* Régression : nginx renvoie une page HTML sur un 502. L'ancien code
     * cherchait `data.detail`, ne le trouvait pas, et retombait sur
     * « Email ou mot de passe incorrect » — envoyant l'utilisateur chercher
     * un problème d'identifiants alors que le backend était simplement down. */
    const gatewayError = {
      response: { status: 502, data: '<html><body>502 Bad Gateway</body></html>' },
    };

    const message = getAuthErrorMessage(gatewayError, INVALID_CREDENTIALS);

    expect(message).not.toBe(INVALID_CREDENTIALS);
    expect(message).toContain('indisponible');
    expect(message).toContain('502');
  });

  it('signale un mauvais mot de passe sur un vrai rejet 400 sans détail', () => {
    const rejection = { response: { status: 400, data: {} } };

    expect(getAuthErrorMessage(rejection, INVALID_CREDENTIALS)).toBe(INVALID_CREDENTIALS);
  });

  it('privilégie toujours le message précis renvoyé par le backend', () => {
    const rejection = {
      response: { status: 403, data: { detail: "Votre email n'est pas encore vérifié." } },
    };

    expect(getAuthErrorMessage(rejection, INVALID_CREDENTIALS)).toBe(
      "Votre email n'est pas encore vérifié.",
    );
  });

  it('distingue le throttling (429) des identifiants invalides', () => {
    const throttled = { response: { status: 429, data: {} } };

    expect(getAuthErrorMessage(throttled, INVALID_CREDENTIALS)).toContain('Trop de tentatives');
  });

  it('signale une panne réseau quand aucune réponse ne revient', () => {
    const networkError = new Error('Network Error');

    expect(getAuthErrorMessage(networkError, INVALID_CREDENTIALS)).toContain('joindre le serveur');
  });

  it('traite une erreur 503 comme une indisponibilité, pas un souci de compte', () => {
    const unavailable = { response: { status: 503, data: '' } };

    expect(getAuthErrorMessage(unavailable, INVALID_CREDENTIALS)).not.toBe(INVALID_CREDENTIALS);
    expect(getAuthErrorMessage(unavailable, INVALID_CREDENTIALS)).toContain('indisponible');
  });
});
