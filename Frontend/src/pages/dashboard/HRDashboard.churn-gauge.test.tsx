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

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

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

describe("HRDashboard — ChurnGauge reçoit un pourcentage, jamais le comptage brut d'employés", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllEmployeesMock.mockResolvedValue({ results: [] });
    getRetentionStatsMock.mockResolvedValue({ retention_stats: [] });
    getLeavesMock.mockResolvedValue({ results: [] });
    getApplicationsMock.mockResolvedValue({ results: [] });
  });

  it("un petit nombre d'employés à risque sur un grand effectif n'affiche plus faussement un risque faible", async () => {
    // 8 employés à haut risque sur 50 = 16% → doit rester "Modéré"/"Élevé" selon les seuils
    // du composant, jamais traité comme "8" sur une échelle 0-100 (ce qui donnerait ~8%, "Faible").
    getStatsMock.mockResolvedValue({
      total_employees: 50,
      active_employees: 45,
      pending_leaves: 0,
      open_positions: 0,
      new_applications: 0,
      churn_risk_high: 8,
      churn_risk_medium: 5,
      churn_risk_low: 37,
    });
    renderDashboard();

    // 8/50 = 16% → doit apparaître littéralement comme "16%", pas comme "8"
    expect(await screen.findByText('16%')).toBeInTheDocument();
  });

  it('tous les employés à risque élevé (100%) affiche bien 100%, pas le comptage brut', async () => {
    getStatsMock.mockResolvedValue({
      total_employees: 4,
      active_employees: 4,
      pending_leaves: 0,
      open_positions: 0,
      new_applications: 0,
      churn_risk_high: 4,
      churn_risk_medium: 0,
      churn_risk_low: 0,
    });
    renderDashboard();

    expect(await screen.findByText('100%')).toBeInTheDocument();
  });

  it("aucun employé n'existe : la jauge affiche 0%, sans division par zéro", async () => {
    getStatsMock.mockResolvedValue({
      total_employees: 0,
      active_employees: 0,
      pending_leaves: 0,
      open_positions: 0,
      new_applications: 0,
      churn_risk_high: 0,
      churn_risk_medium: 0,
      churn_risk_low: 0,
    });
    renderDashboard();

    expect(await screen.findByText('0%')).toBeInTheDocument();
  });
});
