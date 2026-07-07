import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import EmployeeCreatePage from '../EmployeeCreatePage';

const { navigateMock, toastMock, employeeCreateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  toastMock: vi.fn(),
  employeeCreateMock: vi.fn(),
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
  it('renders the page title and form labels', () => {
    render(
      <MemoryRouter>
        <EmployeeCreatePage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Créer un employé/i)).toBeInTheDocument();
    expect(screen.getByText(/Salaire annuel/i)).toBeInTheDocument();
  });

  it('shows validation errors when required fields are missing', async () => {
    render(
      <MemoryRouter>
        <EmployeeCreatePage />
      </MemoryRouter>
    );

    // Find and click the submit button
    const buttons = screen.getAllByRole('button');
    const submitButton = buttons.find((btn) => btn.textContent?.includes('Créer'));
    if (submitButton) fireEvent.click(submitButton);

    expect(await screen.findByText('Veuillez sélectionner un compte utilisateur.')).toBeInTheDocument();
    expect(await screen.findByText('Le salaire annuel est requis.')).toBeInTheDocument();
  });
});
