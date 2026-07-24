import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import TermsOfServicePage from './TermsOfServicePage';

describe('TermsOfServicePage', () => {
  it('affiche le titre et un lien de retour vers l\'accueil', () => {
    render(
      <MemoryRouter>
        <TermsOfServicePage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /conditions générales d'utilisation/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /retour à l'accueil/i })).toHaveAttribute('href', '/');
  });
});
