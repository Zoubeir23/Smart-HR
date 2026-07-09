import { useEffect } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DashboardLayout from './DashboardLayout';

vi.mock('@/components/ai/ChatWidget', () => ({
  default: () => null,
}));

vi.mock('./Sidebar', () => ({
  default: () => <div>sidebar</div>,
}));

vi.mock('./Navbar', () => ({
  default: () => <div>navbar</div>,
}));

function ProbeContent({ onMount }: { onMount: () => void }) {
  useEffect(() => {
    onMount();
  }, [onMount]);
  return <div>page content</div>;
}

function Harness({ onMount }: { onMount: () => void }) {
  const navigate = useNavigate();
  return (
    <DashboardLayout>
      <button onClick={() => navigate('/other-page')}>Naviguer</button>
      <ProbeContent onMount={onMount} />
    </DashboardLayout>
  );
}

describe('DashboardLayout', () => {
  it('remonte le wrapper de contenu (et son animation d\'entrée) à chaque changement de route', () => {
    /* Régression production : DashboardLayout est un layout persistant (ne
     * remonte jamais entre deux pages) — sans `key={pathname}` sur le
     * wrapper motion.div, l'animation initial→animate ne se rejoue qu'au
     * tout premier montage, laissant le contenu bloqué à `opacity: 0`
     * (donc invisible bien que présent dans le DOM) lors d'une navigation
     * SPA ultérieure. On vérifie ici que le contenu enfant est bien
     * remonté (nouvel effet de montage) après un changement de route. */
    const onMount = vi.fn();
    render(
      <MemoryRouter initialEntries={['/first-page']}>
        <Harness onMount={onMount} />
      </MemoryRouter>
    );

    expect(onMount).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Naviguer'));

    expect(onMount).toHaveBeenCalledTimes(2);
  });
});
