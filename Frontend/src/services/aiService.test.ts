import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeApiBaseUrl } from './aiService';

describe('normalizeApiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("retombe sur un chemin relatif '/api/v1' quand VITE_API_URL est vide", () => {
    /* Même régression que services/api.ts : ne jamais retomber sur un hôte
     * absolu type localhost pour le client public (candidats, sessions
     * d'entretien) — nginx.vps.conf route déjà /api/ vers Django. */
    vi.stubEnv('VITE_API_URL', '');
    expect(normalizeApiBaseUrl()).toBe('/api/v1');
    expect(normalizeApiBaseUrl()).not.toContain('localhost');
  });

  it('conserve une URL absolue explicitement fournie', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.smart-hr.tech/api/v1');
    expect(normalizeApiBaseUrl()).toBe('https://api.smart-hr.tech/api/v1');
  });

  it("ajoute '/v1' si l'URL se termine par '/api'", () => {
    vi.stubEnv('VITE_API_URL', 'https://api.smart-hr.tech/api');
    expect(normalizeApiBaseUrl()).toBe('https://api.smart-hr.tech/api/v1');
  });
});
