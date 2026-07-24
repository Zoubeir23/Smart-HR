import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import LegalPageLayout from './LegalPageLayout';

describe('LegalPageLayout', () => {
  it('affiche le titre, la date de mise à jour et le contenu fourni', () => {
    render(
      <MemoryRouter>
        <LegalPageLayout title="Titre de test" lastUpdated="1 janvier 2026">
          <p>Contenu de test</p>
        </LegalPageLayout>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Titre de test' })).toBeInTheDocument();
    expect(screen.getByText(/dernière mise à jour : 1 janvier 2026/i)).toBeInTheDocument();
    expect(screen.getByText('Contenu de test')).toBeInTheDocument();
  });

  it('propose deux liens de retour vers la racine (logo + lien explicite)', () => {
    render(
      <MemoryRouter>
        <LegalPageLayout title="Titre de test" lastUpdated="1 janvier 2026">
          <p>Contenu</p>
        </LegalPageLayout>
      </MemoryRouter>
    );

    const homeLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('href') === '/');
    expect(homeLinks.length).toBeGreaterThanOrEqual(2);
  });
});
