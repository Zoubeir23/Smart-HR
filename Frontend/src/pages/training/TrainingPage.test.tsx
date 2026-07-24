import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TrainingPage from './TrainingPage';

const {
  getFormationsMock,
  getMeetingsMock,
  updateFormationMock,
  deleteFormationMock,
  updateMeetingMock,
  deleteMeetingMock,
  getCompletionStatsMock,
} = vi.hoisted(() => ({
  getFormationsMock: vi.fn(),
  getMeetingsMock: vi.fn(),
  updateFormationMock: vi.fn(),
  deleteFormationMock: vi.fn(),
  updateMeetingMock: vi.fn(),
  deleteMeetingMock: vi.fn(),
  getCompletionStatsMock: vi.fn(),
}));

vi.mock('@/services/trainingService', () => ({
  trainingService: {
    getFormations: getFormationsMock,
    getMeetings: getMeetingsMock,
    createFormation: vi.fn(),
    updateFormation: updateFormationMock,
    deleteFormation: deleteFormationMock,
    createMeeting: vi.fn(),
    updateMeeting: updateMeetingMock,
    deleteMeeting: deleteMeetingMock,
    getCompletionStats: getCompletionStatsMock,
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'RH', name: 'RH Test' } }),
}));

vi.mock('@/components/training/CompletionRateSection', () => ({ default: () => null }));
vi.mock('@/components/training/TrainingProviderDirectory', () => ({ default: () => null }));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TrainingPage />
    </QueryClientProvider>
  );
}

const existingFormation = {
  id: 7,
  title: 'Formation Django REST Framework',
  description: 'Apprendre DRF en profondeur',
  start_date: '2026-08-01T09:00',
  end_date: '2026-08-05T17:00',
  instructor: 'Marie Dupont',
  cost: 500000,
  meetings: [],
  created_at: '2026-07-01T00:00:00Z',
};

const existingMeeting = {
  id: 3,
  title: "Point d'avancement semaine 1",
  start_time: '2026-08-02T10:00',
  end_time: '2026-08-02T11:00',
  meeting_link: 'https://meet.google.com/abc-defg-hij',
  status: 'scheduled',
  formation: 7,
};

describe('TrainingPage — modification et suppression de formations et réunions (RH/Admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFormationsMock.mockResolvedValue({ results: [existingFormation] });
    getMeetingsMock.mockResolvedValue({ results: [existingMeeting] });
  });

  it('modifie une formation via la modale d\'édition', async () => {
    updateFormationMock.mockResolvedValue({});
    renderPage();

    await screen.findByText('Formation Django REST Framework');
    fireEvent.click(screen.getByRole('button', { name: /modifier la formation/i }));

    const titleInput = await screen.findByDisplayValue('Formation Django REST Framework');
    fireEvent.change(titleInput, { target: { value: 'Formation Django REST Framework Avancée' } });
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    await waitFor(() => {
      expect(updateFormationMock).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ title: 'Formation Django REST Framework Avancée', instructor: 'Marie Dupont' })
      );
    });
  });

  it('supprime une formation après confirmation', async () => {
    deleteFormationMock.mockResolvedValue(undefined);
    renderPage();

    await screen.findByText('Formation Django REST Framework');
    fireEvent.click(screen.getByRole('button', { name: /supprimer la formation/i }));

    await screen.findByText(/supprimer cette formation \?/i);
    fireEvent.click(screen.getByRole('button', { name: /^supprimer$/i }));

    await waitFor(() => {
      expect(deleteFormationMock).toHaveBeenCalledWith(7);
    });
  });

  it('modifie une réunion via la modale d\'édition', async () => {
    updateMeetingMock.mockResolvedValue({});
    renderPage();

    await screen.findByText("Point d'avancement semaine 1");
    fireEvent.click(screen.getByRole('button', { name: /modifier la réunion/i }));

    const titleInput = await screen.findByDisplayValue("Point d'avancement semaine 1");
    fireEvent.change(titleInput, { target: { value: "Point d'avancement semaine 2" } });
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    await waitFor(() => {
      expect(updateMeetingMock).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ title: "Point d'avancement semaine 2" })
      );
    });
  });

  it('supprime une réunion après confirmation', async () => {
    deleteMeetingMock.mockResolvedValue(undefined);
    renderPage();

    await screen.findByText("Point d'avancement semaine 1");
    fireEvent.click(screen.getByRole('button', { name: /supprimer la réunion/i }));

    await screen.findByText(/supprimer cette réunion \?/i);
    fireEvent.click(screen.getByRole('button', { name: /^supprimer$/i }));

    await waitFor(() => {
      expect(deleteMeetingMock).toHaveBeenCalledWith(3);
    });
  });
});
