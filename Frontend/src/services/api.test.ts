import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import api, { normalizeApiUrl, refreshAccessToken } from './api';

describe('normalizeApiUrl', () => {
  it("retombe sur un chemin relatif '/api/v1' quand l'URL est vide", () => {
    /* Régression production : un fallback absolu (ex: http://localhost:8000/api/v1)
     * casse l'app pour tout visiteur réel si VITE_API_URL n'est pas défini au
     * build — son navigateur tente de joindre SON PROPRE localhost. Le chemin
     * relatif laisse nginx (prod) ou le proxy Vite (dev) router /api/. */
    expect(normalizeApiUrl('')).toBe('/api/v1');
    expect(normalizeApiUrl('   ')).toBe('/api/v1');
  });

  it('ne produit jamais de fallback vers localhost', () => {
    expect(normalizeApiUrl('')).not.toContain('localhost');
  });

  it('conserve une URL absolue explicitement fournie', () => {
    expect(normalizeApiUrl('https://api.smart-hr.tech/api/v1')).toBe('https://api.smart-hr.tech/api/v1');
  });

  it("ajoute '/v1' si l'URL se termine par '/api'", () => {
    expect(normalizeApiUrl('https://api.smart-hr.tech/api')).toBe('https://api.smart-hr.tech/api/v1');
  });

  it('retire les slashes de fin', () => {
    expect(normalizeApiUrl('https://api.smart-hr.tech/api/v1///')).toBe('https://api.smart-hr.tech/api/v1');
  });
});

describe('refreshAccessToken', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('deduplicates concurrent refresh calls into a single HTTP request', async () => {
    /* Régression : sans mutex, chaque requête 401 en parallèle déclenchait
     * son propre refresh. Avec ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION
     * côté backend, seul le premier refresh réussit et les autres blacklistent
     * un token déjà utilisé, déconnectant l'utilisateur au hasard. */
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'new-access-token' } });

    const [first, second, third] = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
      refreshAccessToken(),
    ]);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(first).toBe('new-access-token');
    expect(second).toBe('new-access-token');
    expect(third).toBe('new-access-token');
  });

  it('envoie un corps vide et les cookies, sans jamais transporter le refresh token', async () => {
    /* Régression : le refresh token était lu en localStorage et renvoyé dans le
     * corps, mais la rotation côté backend (ROTATE + BLACKLIST) le rendait
     * caduc dès le premier appel — la session sautait au refresh suivant. Il
     * vit désormais uniquement dans un cookie HttpOnly géré par le serveur. */
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'cookie-token' } });

    await refreshAccessToken();

    const [, requestBody, requestConfig] = postSpy.mock.calls[0];
    expect(requestBody).toEqual({});
    expect(requestConfig).toMatchObject({ withCredentials: true });
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('stores the refreshed access token in localStorage', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'stored-token' } });

    await refreshAccessToken();

    expect(localStorage.getItem('access_token')).toBe('stored-token');
  });

  it('allows a new refresh request once the previous one has resolved', async () => {
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'new-access-token' } });

    await refreshAccessToken();
    await refreshAccessToken();

    expect(postSpy).toHaveBeenCalledTimes(2);
  });

  it('propagates the error and clears the in-flight promise on failure', async () => {
    vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('refresh expired'));

    await expect(refreshAccessToken()).rejects.toThrow('refresh expired');

    vi.spyOn(axios, 'post').mockResolvedValueOnce({ data: { access: 'recovered-token' } });
    await expect(refreshAccessToken()).resolves.toBe('recovered-token');
  });
});

describe('FormData requests', () => {
  const originalAdapter = api.defaults.adapter;

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  it('n\'écrase pas un corps FormData en JSON malgré le Content-Type par défaut de l\'instance', async () => {
    /* Régression production (candidature à une offre d'emploi → 400) :
     * l'instance axios fixe 'Content-Type: application/json' par défaut.
     * Sans retirer ce header pour un corps FormData, axios sérialise le
     * FormData en JSON (transformRequest) au lieu de l'envoyer en
     * multipart/form-data — le CV et les autres champs disparaissent et le
     * backend répond 400. */
    let capturedConfig: { data: unknown; headers: { get: (name: string) => string | undefined } } | undefined;
    api.defaults.adapter = async (config) => {
      capturedConfig = config as typeof capturedConfig;
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };

    const formData = new FormData();
    formData.append('job_offer', '5');
    formData.append('cover_letter', 'Ma lettre de motivation');

    await api.post('/recruitment/applications/', formData);

    expect(capturedConfig?.data).toBeInstanceOf(FormData);
    expect(capturedConfig?.headers.get('Content-Type')).not.toContain('application/json');
  });

  it('conserve Content-Type: application/json pour un corps JSON classique', async () => {
    let capturedConfig: { headers: { get: (name: string) => string | undefined } } | undefined;
    api.defaults.adapter = async (config) => {
      capturedConfig = config as typeof capturedConfig;
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };

    await api.post('/recruitment/job-offers/', { title: 'Dev Backend' });

    expect(capturedConfig?.headers.get('Content-Type')).toContain('application/json');
  });
});
