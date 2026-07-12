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

describe('HRDashboard — plus de badges de tendance KPI fabriqués', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllEmployeesMock.mockResolvedValue({ results: [] });
    getRetentionStatsMock.mockResolvedValue({ retention_stats: [] });
    getLeavesMock.mockResolvedValue({ results: [] });
    getApplicationsMock.mockResolvedValue({ results: [] });
    getStatsMock.mockResolvedValue({
      total_employees: 12,
      active_employees: 10,
      pending_leaves: 1,
      open_positions: 2,
      new_applications: 3,
      churn_risk_high: 1,
      churn_risk_medium: 1,
      churn_risk_low: 10,
    });
  });

  it("aucune des 4 cartes KPI n'affiche de pourcentage de variation inventé", async () => {
    renderDashboard();
    await screen.findByText('Total Employés');

    expect(screen.queryByText('+3.2%')).not.toBeInTheDocument();
    expect(screen.queryByText('+2%')).not.toBeInTheDocument();
    expect(screen.queryByText('-8%')).not.toBeInTheDocument();
  });
});
