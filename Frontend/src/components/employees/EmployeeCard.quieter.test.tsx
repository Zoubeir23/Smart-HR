import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import EmployeeCard from './EmployeeCard';
import type { Employee } from '@/types';

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 1,
    user: { id: 1, email: 'moussa@example.com', first_name: 'Moussa', last_name: 'Diallo', role: 'EMPLOYEE' },
    department: 1,
    position: 1,
    hire_date: '2024-01-01',
    salary: 500000,
    status: 'active',
    ...overrides,
  };
}

function renderCard(employee: Employee) {
  return render(
    <MemoryRouter>
      <EmployeeCard employee={employee} />
    </MemoryRouter>
  );
}

describe("EmployeeCard — poids décoratif retiré (plat au repos, cf. DESIGN.md)", () => {
  it("ne rend plus la texture diagonale décorative de l'en-tête", () => {
    const { container } = renderCard(makeEmployee());

    expect(container.innerHTML).not.toContain('repeating-linear-gradient');
  });

  it("le flou décoratif superflu (backdrop-blur) a disparu maintenant que l'en-tête est plat", () => {
    const { container } = renderCard(makeEmployee({ churn_risk: 85 }));

    expect(container.innerHTML).not.toContain('backdrop-blur');
  });
});
