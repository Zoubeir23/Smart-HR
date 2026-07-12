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

describe("HRDashboard — bannière d'en-tête apaisée (plat au repos, pas de texte en dégradé)", () => {
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

  it("le prénom de l'utilisateur n'est plus rendu en texte dégradé", async () => {
    renderDashboard();

    expect(await screen.findByText(/Awa/)).toBeInTheDocument();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.innerHTML).not.toContain('bg-clip-text');
    expect(heading.innerHTML).not.toContain('text-transparent');
  });

  it("la bannière réutilise le dégradé de marque documenté, pas de motif ou halo décoratif", async () => {
    const { container } = renderDashboard();
    await screen.findByText(/Awa/);

    expect(container.innerHTML).toContain('var(--gradient-primary)');
    expect(container.innerHTML).not.toContain('blur-3xl');
    expect(container.innerHTML).not.toMatch(/linear-gradient\(rgba\(255,255,255,0\.6\)/);
  });
});
