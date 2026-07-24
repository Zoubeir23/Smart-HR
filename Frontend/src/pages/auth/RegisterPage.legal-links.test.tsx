import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import RegisterPage from './RegisterPage';

describe('RegisterPage — liens légaux', () => {
  it('pointe vers les vraies pages CGU/confidentialité au lieu de liens morts (#)', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /conditions d'utilisation/i })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /politique de confidentialité/i })).toHaveAttribute('href', '/privacy');
  });
});
