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

describe("EmployeeCard — actions atteignables au clavier, pas seulement au survol", () => {
  it('le déclencheur du menu porte un nom accessible nommant l\'employé', () => {
    const { getByRole } = renderCard(makeEmployee());

    expect(getByRole('button', { name: 'Actions pour Moussa Diallo' })).toBeInTheDocument();
  });

  it('le conteneur du menu devient visible quand un enfant reçoit le focus (group-focus-within)', () => {
    const { container } = renderCard(makeEmployee());

    const menuWrapper = container.querySelector('.absolute.left-3.top-3');
    expect(menuWrapper).toHaveClass('group-focus-within:opacity-100');
    expect(menuWrapper).not.toHaveClass('opacity-100');
  });

  it("la barre d'actions du bas devient visible quand un enfant reçoit le focus (group-focus-within)", () => {
    const { getByRole } = renderCard(makeEmployee());

    const emailButton = getByRole('button', { name: /email/i });
    const actionBar = emailButton.closest('div.absolute.inset-x-0.bottom-0');
    expect(actionBar).toHaveClass('group-focus-within:opacity-100', 'group-focus-within:translate-y-0');
  });

  it("les boutons Email et Modifier sont bien des <button> natifs, focusables sans piège au clavier", () => {
    const { getByRole } = renderCard(makeEmployee());

    expect(getByRole('button', { name: /email/i }).tagName).toBe('BUTTON');
    expect(getByRole('button', { name: /modifier/i }).tagName).toBe('BUTTON');
  });
});
