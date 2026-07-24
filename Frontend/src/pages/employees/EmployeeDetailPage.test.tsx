import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmployeeDetailPage from './EmployeeDetailPage';

const { getByIdMock, deleteMock, anonymizeMock } = vi.hoisted(() => ({
  getByIdMock: vi.fn(),
  deleteMock: vi.fn(),
  anonymizeMock: vi.fn(),
}));

vi.mock('@/services/employeeService', () => ({
  employeeService: {
    getById: getByIdMock,
    getDepartments: vi.fn().mockResolvedValue({ results: [] }),
    getPositions: vi.fn().mockResolvedValue({ results: [] }),
    getFamilyMembers: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
    delete: deleteMock,
    anonymize: anonymizeMock,
    addFamilyMember: vi.fn(),
    deleteFamilyMember: vi.fn(),
  },
}));

vi.mock('@/services/documentService', () => ({
  documentService: {
    getAll: vi.fn().mockResolvedValue([]),
    upload: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'ADMIN', name: 'Admin Test' } }),
}));

vi.mock('@/components/employees/OnboardingProgramsCard', () => ({ default: () => null }));
vi.mock('@/components/employees/ObjectivesCard', () => ({ default: () => null }));
vi.mock('@/components/employees/EmployeeChurnRiskCard', () => ({ EmployeeChurnRiskCard: () => null }));
vi.mock('@/components/employees/EmployeeContractCard', () => ({ EmployeeContractCard: () => null }));
vi.mock('@/components/employees/EmployeeDocumentsCard', () => ({ EmployeeDocumentsCard: () => null }));
vi.mock('@/components/employees/EmployeeFamilyCard', () => ({ EmployeeFamilyCard: () => null }));
vi.mock('@/components/employees/EmployeeLeavesCard', () => ({ EmployeeLeavesCard: () => null }));
vi.mock('@/components/employees/EmployeePerformanceCard', () => ({ EmployeePerformanceCard: () => null }));
vi.mock('@/components/employees/EmployeeProfileCard', () => ({ EmployeeProfileCard: () => null }));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/employees/1']}>
        <Routes>
          <Route path="/employees/:id" element={<EmployeeDetailPage />} />
          <Route path="/employees" element={<div>Liste des employés</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('EmployeeDetailPage — suppression definitive et anonymisation RGPD (Admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('supprime definitivement un employe apres confirmation', async () => {
    getByIdMock.mockResolvedValue({ id: 1, status: 'active', user: { email: 'test@example.com' } });
    deleteMock.mockResolvedValue(undefined);
    renderPage();

    await screen.findByRole('button', { name: /supprimer définitivement/i });
    fireEvent.click(screen.getByRole('button', { name: /supprimer définitivement/i }));

    await screen.findByText(/supprimer définitivement cet employé \?/i);
    fireEvent.click(screen.getByRole('button', { name: /^supprimer définitivement$/i }));

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith(1);
    });
  });

  it('desactive le bouton anonymiser pour un employe actif', async () => {
    getByIdMock.mockResolvedValue({ id: 1, status: 'active', user: { email: 'test@example.com' } });
    renderPage();

    const anonymizeButton = await screen.findByRole('button', { name: /anonymiser \(rgpd\)/i });
    expect(anonymizeButton).toBeDisabled();
  });

  it('anonymise un employe inactif apres confirmation', async () => {
    getByIdMock.mockResolvedValue({ id: 1, status: 'inactive', user: { email: 'test@example.com' } });
    anonymizeMock.mockResolvedValue({ detail: 'ok' });
    renderPage();

    const anonymizeButton = await screen.findByRole('button', { name: /anonymiser \(rgpd\)/i });
    expect(anonymizeButton).not.toBeDisabled();
    fireEvent.click(anonymizeButton);

    await screen.findByText(/anonymiser les données personnelles \(rgpd\) \?/i);
    fireEvent.click(screen.getByRole('button', { name: /^anonymiser$/i }));

    await waitFor(() => {
      expect(anonymizeMock).toHaveBeenCalledWith(1);
    });
  });
});
