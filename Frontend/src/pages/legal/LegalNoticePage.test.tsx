import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import LegalNoticePage from './LegalNoticePage';

describe('LegalNoticePage', () => {
  it('affiche le titre et un lien de retour vers l\'accueil', () => {
    render(
      <MemoryRouter>
        <LegalNoticePage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /mentions légales/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /retour à l'accueil/i })).toHaveAttribute('href', '/');
  });
});
