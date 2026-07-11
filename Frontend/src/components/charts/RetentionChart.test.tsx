import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RetentionChart from './RetentionChart';

describe('RetentionChart — jamais de données fictives affichées silencieusement', () => {
  it('affiche un skeleton pendant le chargement, sans rendre de graphique', () => {
    render(<RetentionChart isLoading />);

    expect(screen.queryByText('Pas encore de données de rétention')).not.toBeInTheDocument();
    expect(screen.queryByText('Impossible de charger le taux de rétention')).not.toBeInTheDocument();
    expect(document.querySelector('.recharts-responsive-container')).not.toBeInTheDocument();
  });

  it("affiche un état d'erreur explicite quand la requête échoue, jamais de données de démo", () => {
    render(<RetentionChart isError />);

    expect(screen.getByText('Impossible de charger le taux de rétention')).toBeInTheDocument();
    expect(document.querySelector('.recharts-responsive-container')).not.toBeInTheDocument();
  });

  it("affiche un état vide explicite quand data est absent, plutôt que de retomber sur des chiffres fictifs", () => {
    render(<RetentionChart />);

    expect(screen.getByText('Pas encore de données de rétention')).toBeInTheDocument();
    expect(document.querySelector('.recharts-responsive-container')).not.toBeInTheDocument();
  });

  it("affiche un état vide explicite quand data est un tableau vide", () => {
    render(<RetentionChart data={[]} />);

    expect(screen.getByText('Pas encore de données de rétention')).toBeInTheDocument();
  });

  it('rend le graphique réel quand des données valides sont fournies', () => {
    render(
      <RetentionChart
        data={[
          { month: 'Jan', retention: 95, turnover: 5 },
          { month: 'Fév', retention: 94, turnover: 6 },
        ]}
      />
    );

    expect(screen.queryByText('Pas encore de données de rétention')).not.toBeInTheDocument();
    expect(screen.queryByText('Impossible de charger le taux de rétention')).not.toBeInTheDocument();
    expect(document.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
