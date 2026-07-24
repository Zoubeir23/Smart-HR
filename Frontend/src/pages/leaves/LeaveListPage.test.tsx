import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LeaveListPage from './LeaveListPage';

const { getAllMock, getBalanceMock, updateMock, deleteMock } = vi.hoisted(() => ({
  getAllMock: vi.fn(),
  getBalanceMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock('@/services/leaveService', () => ({
  leaveService: {
    getAll: getAllMock,
    getById: vi.fn(),
    create: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    update: updateMock,
    delete: deleteMock,
    getBalance: getBalanceMock,
  },
}));

const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

let currentRole = 'EMPLOYEE';
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: currentRole, name: 'Test User' } }),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LeaveListPage />
    </QueryClientProvider>
  );
}

const pendingLeave = {
  id: 10,
  employee: 1,
  employee_name: 'Test User',
  leave_type: 'vacation',
  leave_type_display: 'Congé annuel',
  status: 'pending' as const,
  status_display: 'En attente',
  start_date: '2026-08-10',
  end_date: '2026-08-15',
  reason: 'Vacances',
  duration_days: 5,
  duration_working_days: 5,
  is_deductible: true,
};

const approvedLeave = {
  ...pendingLeave,
  id: 11,
  status: 'approved' as const,
  status_display: 'Approuvé',
};

describe('LeaveListPage — modification et suppression des demandes de congé', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBalanceMock.mockResolvedValue({
      year: 2026, annual_allowance: 25, days_taken: 5, days_pending: 5, days_remaining: 15,
    });
  });

  it("l'employé peut modifier sa propre demande en attente", async () => {
    currentRole = 'EMPLOYEE';
    getAllMock.mockResolvedValue({ results: [pendingLeave] });
    updateMock.mockResolvedValue({});
    renderPage();

    await screen.findByText('Congé annuel');
    fireEvent.click(screen.getByRole('button', { name: /modifier la demande/i }));

    await screen.findByText('Modifier la demande de congé');
    fireEvent.change(screen.getByLabelText(/motif/i), { target: { value: 'Vacances en famille' } });
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(10, expect.objectContaining({ reason: 'Vacances en famille' }));
    });
  });

  it("l'employé peut supprimer sa propre demande en attente", async () => {
    currentRole = 'EMPLOYEE';
    getAllMock.mockResolvedValue({ results: [pendingLeave] });
    deleteMock.mockResolvedValue(undefined);
    renderPage();

    await screen.findByText('Congé annuel');
    fireEvent.click(screen.getByRole('button', { name: /supprimer la demande/i }));

    await screen.findByText(/supprimer cette demande de congé \?/i);
    fireEvent.click(screen.getByRole('button', { name: /^supprimer$/i }));

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith(10);
    });
  });

  it("l'employé ne peut pas modifier/supprimer une demande déjà approuvée", async () => {
    currentRole = 'EMPLOYEE';
    getAllMock.mockResolvedValue({ results: [approvedLeave] });
    renderPage();

    await screen.findByText('Congé annuel');
    expect(screen.queryByRole('button', { name: /modifier la demande/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /supprimer la demande/i })).not.toBeInTheDocument();
  });

  it('le RH peut modifier une demande même déjà approuvée', async () => {
    currentRole = 'RH';
    getAllMock.mockResolvedValue({ results: [approvedLeave] });
    updateMock.mockResolvedValue({});
    renderPage();

    await screen.findByText('Congé annuel');
    fireEvent.click(screen.getByRole('button', { name: /modifier la demande/i }));

    await screen.findByText('Modifier la demande de congé');
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(11, expect.anything());
    });
  });
});
