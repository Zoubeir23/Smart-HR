import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ApplicationsManagementPage from './ApplicationsManagementPage';

const { getJobsMock, getApplicationsMock, deleteApplicationMock } = vi.hoisted(() => ({
  getJobsMock: vi.fn(),
  getApplicationsMock: vi.fn(),
  deleteApplicationMock: vi.fn(),
}));

vi.mock('@/services/recruitmentService', async () => {
  const actual = await vi.importActual<typeof import('@/services/recruitmentService')>('@/services/recruitmentService');
  return {
    ...actual,
    recruitmentService: {
      ...actual.recruitmentService,
      getJobs: getJobsMock,
      getApplications: getApplicationsMock,
      deleteApplication: deleteApplicationMock,
    },
  };
});

const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ApplicationsManagementPage />
    </QueryClientProvider>
  );
}

const existingApplication = {
  id: 21,
  candidate_name: 'Aïssatou Ndiaye',
  email: 'aissatou.ndiaye@example.com',
  job_offer: { id: 1, title: 'Développeur Backend Django' },
  job_title: 'Développeur Backend Django',
  status: 'pending' as const,
  matching_score: 78,
  skills_extracted: ['Django', 'PostgreSQL'],
  onboarded: false,
  created_at: '2026-07-01T00:00:00Z',
};

describe('ApplicationsManagementPage — suppression d\'une candidature (RH/Admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getJobsMock.mockResolvedValue({ results: [{ id: 1, title: 'Développeur Backend Django' }] });
    getApplicationsMock.mockResolvedValue({ results: [existingApplication] });
  });

  it('supprime une candidature après confirmation', async () => {
    deleteApplicationMock.mockResolvedValue(undefined);
    renderPage();

    await screen.findByText('Aïssatou Ndiaye');
    fireEvent.click(screen.getByRole('button', { name: /supprimer la candidature/i }));

    await screen.findByText(/supprimer cette candidature \?/i);
    fireEvent.click(screen.getByRole('button', { name: /^supprimer$/i }));

    await waitFor(() => {
      expect(deleteApplicationMock).toHaveBeenCalledWith(21);
    });
  });

  it('annule la suppression sans appeler le service', async () => {
    renderPage();

    await screen.findByText('Aïssatou Ndiaye');
    fireEvent.click(screen.getByRole('button', { name: /supprimer la candidature/i }));

    await screen.findByText(/supprimer cette candidature \?/i);
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }));

    await waitFor(() => {
      expect(screen.queryByText(/supprimer cette candidature \?/i)).not.toBeInTheDocument();
    });
    expect(deleteApplicationMock).not.toHaveBeenCalled();
  });
});
