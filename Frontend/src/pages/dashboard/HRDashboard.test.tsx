import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HRDashboard from './HRDashboard';

const {
  toastMock,
  getStatsMock,
  getAllEmployeesMock,
  getRetentionStatsMock,
  getLeavesMock,
  approveLeaveMock,
  rejectLeaveMock,
  getApplicationsMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  getStatsMock: vi.fn(),
  getAllEmployeesMock: vi.fn(),
  getRetentionStatsMock: vi.fn(),
  getLeavesMock: vi.fn(),
  approveLeaveMock: vi.fn(),
  rejectLeaveMock: vi.fn(),
  getApplicationsMock: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/context/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('@/context/AuthContext')>('@/context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({ user: { id: 1, first_name: 'Awa', last_name: 'Diop', role: 'RH' } }),
  };
});

vi.mock('@/services/employeeService', () => ({
  employeeService: {
    getStats: getStatsMock,
    getAll: getAllEmployeesMock,
    getRetentionStats: getRetentionStatsMock,
  },
}));

vi.mock('@/services/leaveService', () => ({
  leaveService: {
    getAll: getLeavesMock,
    approve: approveLeaveMock,
    reject: rejectLeaveMock,
  },
}));

vi.mock('@/services/recruitmentService', () => ({
  recruitmentService: {
    getApplications: getApplicationsMock,
  },
}));

const pendingLeave = {
  id: 42,
  type: 'vacation',
  start_date: '2026-08-01',
  end_date: '2026-08-05',
  employee: { user: { first_name: 'Moussa', last_name: 'Diallo' } },
};

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HRDashboard />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('HRDashboard — décisions de congé confirmées, jamais immédiates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStatsMock.mockResolvedValue({
      total_employees: 12,
      active_employees: 10,
      pending_leaves: 1,
      open_positions: 2,
      new_applications: 3,
      churn_risk_high: 1,
    });
    getAllEmployeesMock.mockResolvedValue({ results: [] });
    getRetentionStatsMock.mockResolvedValue({ retention_stats: [] });
    getLeavesMock.mockResolvedValue({ results: [pendingLeave] });
    getApplicationsMock.mockResolvedValue({ results: [] });
  });

  it("n'approuve pas le congé au premier clic : une confirmation est requise", async () => {
    renderDashboard();

    const approveButton = await screen.findByRole('button', { name: /approuver le congé de moussa diallo/i });
    fireEvent.click(approveButton);

    expect(approveLeaveMock).not.toHaveBeenCalled();
    expect(await screen.findByText('Approuver ce congé ?')).toBeInTheDocument();
  });

  it('approuve le congé seulement après confirmation dans la boîte de dialogue', async () => {
    approveLeaveMock.mockResolvedValue({});
    renderDashboard();

    const approveButton = await screen.findByRole('button', { name: /approuver le congé de moussa diallo/i });
    fireEvent.click(approveButton);

    const confirmButton = await screen.findByRole('button', { name: 'Approuver' });
    fireEvent.click(confirmButton);

    await waitFor(() => expect(approveLeaveMock).toHaveBeenCalledWith(42));
  });

  it("ne refuse pas le congé si l'utilisateur annule la confirmation", async () => {
    renderDashboard();

    const rejectButton = await screen.findByRole('button', { name: /refuser le congé de moussa diallo/i });
    fireEvent.click(rejectButton);

    expect(await screen.findByText('Refuser ce congé ?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    await waitFor(() => expect(screen.queryByText('Refuser ce congé ?')).not.toBeInTheDocument());
    expect(rejectLeaveMock).not.toHaveBeenCalled();
  });

  it('refuse le congé seulement après confirmation', async () => {
    rejectLeaveMock.mockResolvedValue({});
    renderDashboard();

    const rejectButton = await screen.findByRole('button', { name: /refuser le congé de moussa diallo/i });
    fireEvent.click(rejectButton);

    const confirmButton = await screen.findByRole('button', { name: 'Refuser' });
    fireEvent.click(confirmButton);

    await waitFor(() => expect(rejectLeaveMock).toHaveBeenCalledWith(42));
  });
});

describe('HRDashboard — le taux de rétention ne retombe jamais sur des données fictives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStatsMock.mockResolvedValue({
      total_employees: 12,
      active_employees: 10,
      pending_leaves: 0,
      open_positions: 2,
      new_applications: 3,
      churn_risk_high: 1,
    });
    getAllEmployeesMock.mockResolvedValue({ results: [] });
    getLeavesMock.mockResolvedValue({ results: [] });
    getApplicationsMock.mockResolvedValue({ results: [] });
  });

  it("affiche un état d'erreur explicite si la requête de rétention échoue, jamais les 12 mois de démo", async () => {
    getRetentionStatsMock.mockRejectedValue(new Error('network error'));
    renderDashboard();

    expect(await screen.findByText('Impossible de charger le taux de rétention')).toBeInTheDocument();
    expect(screen.queryByText('98%')).not.toBeInTheDocument();
  });

  it("affiche un état vide explicite quand il n'y a pas encore d'historique", async () => {
    getRetentionStatsMock.mockResolvedValue({ retention_stats: [] });
    renderDashboard();

    expect(await screen.findByText('Pas encore de données de rétention')).toBeInTheDocument();
  });
});
