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

import { trainingService } from './trainingService';

describe('trainingService — updateFormation/deleteFormation/updateMeeting/deleteMeeting', () => {
  it('appelle PATCH /formation/formations/{id}/ pour updateFormation', async () => {
    patchMock.mockResolvedValue({ data: { id: 7 } });

    await trainingService.updateFormation(7, { title: 'Nouvelle formation' });

    expect(patchMock).toHaveBeenCalledWith('/formation/formations/7/', { title: 'Nouvelle formation' });
  });

  it('appelle DELETE /formation/formations/{id}/ pour deleteFormation', async () => {
    deleteMock.mockResolvedValue(undefined);

    await trainingService.deleteFormation(7);

    expect(deleteMock).toHaveBeenCalledWith('/formation/formations/7/');
  });

  it('appelle PATCH /formation/meetings/{id}/ pour updateMeeting', async () => {
    patchMock.mockResolvedValue({ data: { id: 3 } });

    await trainingService.updateMeeting(3, { title: 'Nouvelle réunion' });

    expect(patchMock).toHaveBeenCalledWith('/formation/meetings/3/', { title: 'Nouvelle réunion' });
  });

  it('appelle DELETE /formation/meetings/{id}/ pour deleteMeeting', async () => {
    deleteMock.mockResolvedValue(undefined);

    await trainingService.deleteMeeting(3);

    expect(deleteMock).toHaveBeenCalledWith('/formation/meetings/3/');
  });
});
