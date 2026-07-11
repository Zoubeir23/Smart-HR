import { render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import KPICard from './KPICard';

const RAINBOW_HUES = ['indigo', 'violet', 'cyan', 'rose', 'amber', 'emerald'];

describe('KPICard — palette sémantique sur-charte, jamais de couleurs hors DESIGN.md', () => {
  it('ton neutre : icône et barre supérieure restent en tokens neutres', () => {
    const { container } = render(
      <KPICard title="Total Employés" value={12} icon={Users} tone="neutral" />
    );

    expect(container.innerHTML).toContain('bg-muted');
    RAINBOW_HUES.forEach((hue) => expect(container.innerHTML).not.toContain(hue));
  });

  it('ton warning : utilise le token --warning, jamais de couleur Tailwind brute', () => {
    const { container } = render(
      <KPICard title="Congés en attente" value={3} icon={Users} tone="warning" />
    );

    expect(container.innerHTML).toContain('warning');
    RAINBOW_HUES.forEach((hue) => expect(container.innerHTML).not.toContain(hue));
  });

  it('ton destructive : réutilise le dégradé rouge braise de marque (--gradient-primary)', () => {
    const { container } = render(
      <KPICard title="Risque élevé" value={4} icon={Users} tone="destructive" />
    );

    expect(container.innerHTML).toContain('destructive');
    expect(container.innerHTML).toContain('var(--gradient-primary)');
    RAINBOW_HUES.forEach((hue) => expect(container.innerHTML).not.toContain(hue));
  });

  it("ne rend plus la sparkline décorative aux données fictives (seule l'icône reste, un unique svg)", () => {
    const { container } = render(<KPICard title="Total Employés" value={12} icon={Users} />);

    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('la variation "increase" utilise le token success, "decrease" le token destructive', () => {
    render(
      <KPICard
        title="Postes ouverts"
        value={5}
        icon={Users}
        change={{ value: 2, type: 'increase' }}
      />
    );
    expect(screen.getByText('+2%').closest('span')).toHaveClass('bg-success/10', 'text-success');
  });
});
