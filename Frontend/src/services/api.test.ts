import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { refreshAccessToken } from './api';

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
      refreshAccessToken('refresh-abc'),
      refreshAccessToken('refresh-abc'),
      refreshAccessToken('refresh-abc'),
    ]);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(first).toBe('new-access-token');
    expect(second).toBe('new-access-token');
    expect(third).toBe('new-access-token');
  });

  it('stores the refreshed access token in localStorage', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'stored-token' } });

    await refreshAccessToken('refresh-abc');

    expect(localStorage.getItem('access_token')).toBe('stored-token');
  });

  it('allows a new refresh request once the previous one has resolved', async () => {
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'new-access-token' } });

    await refreshAccessToken('refresh-abc');
    await refreshAccessToken('refresh-abc');

    expect(postSpy).toHaveBeenCalledTimes(2);
  });

  it('propagates the error and clears the in-flight promise on failure', async () => {
    vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('refresh expired'));

    await expect(refreshAccessToken('refresh-abc')).rejects.toThrow('refresh expired');

    vi.spyOn(axios, 'post').mockResolvedValueOnce({ data: { access: 'recovered-token' } });
    await expect(refreshAccessToken('refresh-abc')).resolves.toBe('recovered-token');
  });
});
