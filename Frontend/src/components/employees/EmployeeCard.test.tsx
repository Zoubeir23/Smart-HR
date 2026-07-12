import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import EmployeeCard from './EmployeeCard';
import type { Employee } from '@/types';

const RAINBOW_GRADIENT_CLASSES = ['from-indigo-', 'from-violet-', 'to-purple-', 'from-teal-', 'from-cyan-', 'from-sky-', 'from-slate-'];

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

describe('EmployeeCard — en-tête navy de marque constant, jamais de dégradé aléatoire par employé', () => {
  it("l'en-tête utilise le navy de marque, pas une couleur hashée à partir du nom", () => {
    const { container } = renderCard(makeEmployee());

    expect(container.innerHTML).toContain('from-brand-navy');
    expect(container.innerHTML).toContain('to-brand-navy-800');
    RAINBOW_GRADIENT_CLASSES.forEach((hue) => expect(container.innerHTML).not.toContain(hue));
  });

  it("deux employés différents partagent le même en-tête (pas de variance par hash de nom)", () => {
    const first = renderCard(makeEmployee({ user: { id: 1, email: 'a@x.com', first_name: 'Awa', last_name: 'Ba', role: 'EMPLOYEE' } }));
    const second = renderCard(makeEmployee({ id: 2, user: { id: 2, email: 'b@x.com', first_name: 'Zoubeir', last_name: 'Sy', role: 'EMPLOYEE' } }));

    const extractGradient = (html: string) => html.match(/from-brand-navy[^"]*to-brand-navy-800/)?.[0];
    expect(extractGradient(first.container.innerHTML)).toBe(extractGradient(second.container.innerHTML));
  });

  it('le badge de statut utilise les tokens sémantiques du design system', () => {
    const { container } = renderCard(makeEmployee({ status: 'active' }));
    expect(container.innerHTML).toContain('bg-success');
  });

  it('le badge "Risque élevé" utilise le token destructive, pas un rouge Tailwind brut', () => {
    const { container, getByText } = renderCard(makeEmployee({ churn_risk: 85 }));

    expect(getByText('Risque élevé')).toBeInTheDocument();
    expect(container.innerHTML).toContain('bg-destructive/90');
    expect(container.innerHTML).not.toContain('bg-red-600');
  });

  it('la barre de risque de départ élevé réutilise le dégradé rouge braise de marque', () => {
    const { container } = renderCard(makeEmployee({ churn_risk: 75 }));

    expect(container.innerHTML).toContain('var(--gradient-primary)');
    expect(container.innerHTML).not.toContain('from-red-600');
  });
});
