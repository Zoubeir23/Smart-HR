import { describe, expect, it, vi } from 'vitest';

const { patchMock, deleteMock } = vi.hoisted(() => ({
  patchMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: patchMock,
    delete: deleteMock,
  },
}));

import { leaveService } from './leaveService';

describe('leaveService — update/delete', () => {
  it('appelle PATCH /conge/leave-requests/{id}/ pour update', async () => {
    patchMock.mockResolvedValue({ data: { id: 10 } });

    await leaveService.update(10, { reason: 'Nouveau motif' });

    expect(patchMock).toHaveBeenCalledWith('/conge/leave-requests/10/', { reason: 'Nouveau motif' });
  });

  it('appelle DELETE /conge/leave-requests/{id}/ pour delete', async () => {
    deleteMock.mockResolvedValue(undefined);

    await leaveService.delete(10);

    expect(deleteMock).toHaveBeenCalledWith('/conge/leave-requests/10/');
  });
});
