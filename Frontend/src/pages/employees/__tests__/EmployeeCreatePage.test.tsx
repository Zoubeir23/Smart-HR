import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import EmployeeCreatePage from '../EmployeeCreatePage';

const { navigateMock, toastMock, employeeCreateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  toastMock: vi.fn(),
  employeeCreateMock: vi.fn(),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/services/employeeService', () => ({
  employeeService: {
    create: employeeCreateMock,
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('EmployeeCreatePage', () => {
  it('shows validation errors when required fields are missing', async () => {
    render(
      <MemoryRouter>
        <EmployeeCreatePage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /créer l’employé/i }));

    expect(await screen.findByText('L’identifiant du compte utilisateur est requis.')).toBeInTheDocument();
    expect(screen.getByText('Le salaire annuel est requis.')).toBeInTheDocument();
  });

  it('submits the employee payload and redirects after success', async () => {
    employeeCreateMock.mockResolvedValueOnce({ id: 42 });

    render(
      <MemoryRouter>
        <EmployeeCreatePage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Identifiant du compte utilisateur'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Département (ID)'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Poste (ID)'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Date d’embauche'), { target: { value: '2026-04-24' } });
    fireEvent.change(screen.getByLabelText('Salaire annuel (FCFA)'), { target: { value: '1500000' } });
    fireEvent.change(screen.getByLabelText('Date de naissance'), { target: { value: '1998-01-01' } });
    fireEvent.change(screen.getByLabelText('CIN'), { target: { value: 'SN123456' } });
    fireEvent.change(screen.getByLabelText('Adresse'), { target: { value: 'Dakar' } });
    fireEvent.change(screen.getByLabelText('Contact d’urgence'), { target: { value: 'Mamadou: 771234567' } });

    fireEvent.click(screen.getByRole('button', { name: /créer l’employé/i }));

    await waitFor(() => {
      expect(employeeCreateMock).toHaveBeenCalledWith({
        user: 12,
        department: 3,
        position: 8,
        hire_date: '2026-04-24',
        salary: 1500000,
        status: 'active',
        date_of_birth: '1998-01-01',
        cin: 'SN123456',
        address: 'Dakar',
        emergency_contact: 'Mamadou: 771234567',
      });
    });

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Employé créé',
      })
    );
    expect(navigateMock).toHaveBeenCalledWith('/employees');
  });
});