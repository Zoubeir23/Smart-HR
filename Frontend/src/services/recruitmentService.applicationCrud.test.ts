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

import { recruitmentService } from './recruitmentService';

describe('recruitmentService — updateApplication/deleteApplication', () => {
  it('appelle PATCH /recruitment/applications/{id}/ avec les données fournies', async () => {
    patchMock.mockResolvedValue({ data: { id: 5, status: 'reviewing' } });

    await recruitmentService.updateApplication(5, { status: 'reviewing' });

    expect(patchMock).toHaveBeenCalledWith('/recruitment/applications/5/', { status: 'reviewing' });
  });

  it('appelle DELETE /recruitment/applications/{id}/', async () => {
    deleteMock.mockResolvedValue(undefined);

    await recruitmentService.deleteApplication(5);

    expect(deleteMock).toHaveBeenCalledWith('/recruitment/applications/5/');
  });
});
