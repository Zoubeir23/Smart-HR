import { describe, expect, it, vi } from 'vitest';
import api from './api';
import { aiService } from './aiService';

vi.mock('./api', () => ({
  default: { get: vi.fn() },
}));

describe('aiService.getSupportedActions', () => {
  it('retourne la liste des actions renvoyée par le backend', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { actions: [{ intent: 'job_offer_creation', label: "Créer une offre d'emploi", example: 'Crée une offre...' }] },
    });

    const actions = await aiService.getSupportedActions();

    expect(api.get).toHaveBeenCalledWith('/ai/actions/');
    expect(actions).toEqual([
      { intent: 'job_offer_creation', label: "Créer une offre d'emploi", example: 'Crée une offre...' },
    ]);
  });

  it('retourne un tableau vide si la réponse ne contient pas de champ actions', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: {} });
    const actions = await aiService.getSupportedActions();
    expect(actions).toEqual([]);
  });

  it('propage une erreur explicite en cas d\'échec réseau', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('network down'));
    await expect(aiService.getSupportedActions()).rejects.toThrow('network down');
  });
});
