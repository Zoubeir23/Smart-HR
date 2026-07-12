import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HRDashboard from './HRDashboard';

const {
  getStatsMock,
  getAllEmployeesMock,
  getRetentionStatsMock,
  getLeavesMock,
  getApplicationsMock,
} = vi.hoisted(() => ({
  getStatsMock: vi.fn(),
  getAllEmployeesMock: vi.fn(),
  getRetentionStatsMock: vi.fn(),
  getLeavesMock: vi.fn(),
  getApplicationsMock: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
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
  leaveService: { getAll: getLeavesMock, approve: vi.fn(), reject: vi.fn() },
}));

vi.mock('@/services/recruitmentService', () => ({
  recruitmentService: { getApplications: getApplicationsMock },
}));

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

describe('HRDashboard — plus de bouton "Exporter" sans action', () => {
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
    getLeavesMock.mockResolvedValue({ results: [] });
    getApplicationsMock.mockResolvedValue({ results: [] });
  });

  it("le bouton Exporter sans handler n'existe plus", async () => {
    renderDashboard();
    await screen.findByText(/Awa/);

    expect(screen.queryByRole('button', { name: /exporter/i })).not.toBeInTheDocument();
  });

  it('le bouton "Nouvel employé" reste présent et fonctionnel', async () => {
    renderDashboard();
    await screen.findByText(/Awa/);

    expect(screen.getByRole('link', { name: /nouvel employé/i })).toBeInTheDocument();
  });
});

describe('HRDashboard — chaque section affiche un état d\'erreur explicite, jamais un échec silencieux', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRetentionStatsMock.mockResolvedValue({ retention_stats: [] });
  });

  it('les KPI affichent une erreur explicite si employeeService.getStats échoue', async () => {
    getStatsMock.mockRejectedValue(new Error('network error'));
    getAllEmployeesMock.mockResolvedValue({ results: [] });
    getLeavesMock.mockResolvedValue({ results: [] });
    getApplicationsMock.mockResolvedValue({ results: [] });
    renderDashboard();

    expect(await screen.findAllByText('Impossible de charger les indicateurs')).not.toHaveLength(0);
    expect(await screen.findByText('Impossible de charger le risque de turnover')).toBeInTheDocument();
    expect(screen.queryByText('Total Employés')).not.toBeInTheDocument();
  });

  it("la liste des employés à risque affiche une erreur explicite si employeeService.getAll échoue", async () => {
    getStatsMock.mockResolvedValue({
      total_employees: 12, active_employees: 10, pending_leaves: 0,
      open_positions: 2, new_applications: 3, churn_risk_high: 1,
    });
    getAllEmployeesMock.mockRejectedValue(new Error('network error'));
    getLeavesMock.mockResolvedValue({ results: [] });
    getApplicationsMock.mockResolvedValue({ results: [] });
    renderDashboard();

    expect(await screen.findByText('Impossible de charger les employés à risque')).toBeInTheDocument();
    expect(screen.queryByText('Aucun employé à risque')).not.toBeInTheDocument();
  });

  it('les congés en attente affichent une erreur explicite si leaveService.getAll échoue', async () => {
    getStatsMock.mockResolvedValue({
      total_employees: 12, active_employees: 10, pending_leaves: 0,
      open_positions: 2, new_applications: 3, churn_risk_high: 1,
    });
    getAllEmployeesMock.mockResolvedValue({ results: [] });
    getLeavesMock.mockRejectedValue(new Error('network error'));
    getApplicationsMock.mockResolvedValue({ results: [] });
    renderDashboard();

    expect(await screen.findByText('Impossible de charger les congés en attente')).toBeInTheDocument();
    expect(screen.queryByText('Aucun congé en attente')).not.toBeInTheDocument();
  });

  it('les candidatures affichent une erreur explicite si recruitmentService.getApplications échoue', async () => {
    getStatsMock.mockResolvedValue({
      total_employees: 12, active_employees: 10, pending_leaves: 0,
      open_positions: 2, new_applications: 3, churn_risk_high: 1,
    });
    getAllEmployeesMock.mockResolvedValue({ results: [] });
    getLeavesMock.mockResolvedValue({ results: [] });
    getApplicationsMock.mockRejectedValue(new Error('network error'));
    renderDashboard();

    expect(await screen.findByText('Impossible de charger les candidatures')).toBeInTheDocument();
    expect(screen.queryByText('Aucune activité récente')).not.toBeInTheDocument();
  });
});
