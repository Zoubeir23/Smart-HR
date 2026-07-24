import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import GdprPage from './GdprPage';

describe('GdprPage', () => {
  it('affiche le titre et un lien de retour vers l\'accueil', () => {
    render(
      <MemoryRouter>
        <GdprPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /rgpd/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /retour à l'accueil/i })).toHaveAttribute('href', '/');
  });
});
