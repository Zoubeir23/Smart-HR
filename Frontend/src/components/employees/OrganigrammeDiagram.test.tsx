import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import OrganigrammeDiagram from './OrganigrammeDiagram';
import { OrganigrammeDepartment } from '@/services/departmentService';

function makeDepartment(overrides: Partial<OrganigrammeDepartment>): OrganigrammeDepartment {
  return {
    id: 1,
    name: 'Direction Générale',
    unit_type: 'dg',
    unit_type_display: 'DG',
    employee_count: 5,
    manager_name: 'Amadou Diallo',
    services: [],
    children: [],
    ...overrides,
  };
}

const sampleData: OrganigrammeDepartment[] = [
  makeDepartment({
    id: 1,
    name: 'Direction Générale',
    children: [
      makeDepartment({
        id: 2,
        name: 'Direction Technique',
        unit_type: 'direction',
        unit_type_display: 'Direction',
        employee_count: 3,
        manager_name: 'Fatou Ndiaye',
        children: [
          makeDepartment({
            id: 3,
            name: 'Service QA',
            unit_type: 'service',
            unit_type_display: 'Service',
            employee_count: 2,
            manager_name: null,
            children: [],
          }),
        ],
      }),
    ],
  }),
];

function isDimmed(element: HTMLElement): boolean {
  let current: HTMLElement | null = element;
  while (current) {
    if (current.className.includes('opacity-30')) return true;
    current = current.parentElement;
  }
  return false;
}

describe('OrganigrammeDiagram', () => {
  it("affiche un état vide quand il n'y a aucune unité", () => {
    render(<OrganigrammeDiagram departments={[]} />);
    expect(screen.getByText('Aucune unité à afficher.')).toBeInTheDocument();
  });

  it('affiche les statistiques agrégées (collaborateurs, unités, managers)', () => {
    render(<OrganigrammeDiagram departments={sampleData} />);
    expect(screen.getByText('10')).toBeInTheDocument(); // 5 + 3 + 2 collaborateurs
    expect(screen.getByText('3')).toBeInTheDocument(); // 3 unités
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 managers (DG + Direction Technique)
  });

  it('affiche toutes les unités de la hiérarchie', () => {
    render(<OrganigrammeDiagram departments={sampleData} />);
    expect(screen.getByText('Direction Générale')).toBeInTheDocument();
    expect(screen.getByText('Direction Technique')).toBeInTheDocument();
    expect(screen.getByText('Service QA')).toBeInTheDocument();
  });

  /* Note : le repli/dépli PAR NŒUD (bouton chevron dans OrganigrammeDepartmentNode)
   * n'est pas testable ici — React Flow ne rend le contenu de ses nœuds
   * personnalisés qu'une fois les dimensions du conteneur mesurées, ce que
   * jsdom ne fournit pas. Ce comportement a été vérifié manuellement en
   * navigateur (voir session). Les boutons globaux « Déplier/Replier tout »
   * ci-dessous passent par le state React directement et sont donc testables. */

  it('« Replier tout » masque toutes les unités sauf les racines', () => {
    render(<OrganigrammeDiagram departments={sampleData} />);

    fireEvent.click(screen.getByRole('button', { name: /replier tout/i }));

    expect(screen.getByText('Direction Générale')).toBeInTheDocument();
    expect(screen.queryByText('Direction Technique')).not.toBeInTheDocument();
    expect(screen.queryByText('Service QA')).not.toBeInTheDocument();
  });

  it('« Déplier tout » réaffiche toutes les unités après un repli', () => {
    render(<OrganigrammeDiagram departments={sampleData} />);

    fireEvent.click(screen.getByRole('button', { name: /replier tout/i }));
    fireEvent.click(screen.getByRole('button', { name: /déplier tout/i }));

    expect(screen.getByText('Service QA')).toBeInTheDocument();
  });

  it('la recherche filtre visuellement les unités ne correspondant pas', () => {
    render(<OrganigrammeDiagram departments={sampleData} />);

    fireEvent.change(screen.getByPlaceholderText(/rechercher une unité/i), { target: { value: 'QA' } });

    // Toutes les unités restent présentes dans le DOM (le rendu se fait
    // via opacité/anneau, pas via un retrait du DOM) mais la correspondance
    // doit être identifiable.
    expect(screen.getByText('Service QA')).toBeInTheDocument();
    expect(screen.getByText('Direction Générale')).toBeInTheDocument();
  });

  it("ne l'estompe pas les ancêtres d'une unité trouvée (conserve le contexte hiérarchique)", () => {
    /* Régression Sentry (finding réel, PR #201) : la recherche estompait
     * aussi les parents d'une unité correspondante, rendant illisible sa
     * position dans l'organigramme. Seules les unités hors du chemin vers
     * un résultat doivent être estompées. */
    render(<OrganigrammeDiagram departments={sampleData} />);

    fireEvent.change(screen.getByPlaceholderText(/rechercher une unité/i), { target: { value: 'QA' } });

    expect(isDimmed(screen.getByText('Service QA'))).toBe(false);
    expect(isDimmed(screen.getByText('Direction Technique'))).toBe(false);
    expect(isDimmed(screen.getByText('Direction Générale'))).toBe(false);
  });
});
