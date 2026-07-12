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

describe("RiskDistributionBar — utilise les vrais chiffres du backend, plus d'estimation forfaitaire", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllEmployeesMock.mockResolvedValue({ results: [] });
    getRetentionStatsMock.mockResolvedValue({ retention_stats: [] });
    getLeavesMock.mockResolvedValue({ results: [] });
    getApplicationsMock.mockResolvedValue({ results: [] });
  });

  it('calcule les pourcentages à partir de churn_risk_high/medium/low réels, pas un forfait de 20%', async () => {
    getStatsMock.mockResolvedValue({
      total_employees: 10,
      active_employees: 10,
      pending_leaves: 0,
      open_positions: 0,
      new_applications: 0,
      churn_risk_high: 2,
      churn_risk_medium: 3,
      churn_risk_low: 5,
    });
    renderDashboard();

    expect(await screen.findByText('Faible 50%')).toBeInTheDocument();
    expect(screen.getByText('Modéré 30%')).toBeInTheDocument();
    expect(screen.getByText('Élevé 20%')).toBeInTheDocument();
  });

  it("le compteur d'employés analysés reflète les employés réellement notés, pas le total_employees brut", async () => {
    getStatsMock.mockResolvedValue({
      total_employees: 20,
      active_employees: 20,
      pending_leaves: 0,
      open_positions: 0,
      new_applications: 0,
      churn_risk_high: 1,
      churn_risk_medium: 1,
      churn_risk_low: 1,
    });
    renderDashboard();

    expect(await screen.findByText('3 employés analysés')).toBeInTheDocument();
  });
});
