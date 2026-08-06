import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import RegisterPage from './RegisterPage';
import { AuthProvider } from '@/context/AuthContext';

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <button>GoogleLogin</button>,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('RegisterPage — liens légaux', () => {
  it('pointe vers les vraies pages CGU/confidentialité au lieu de liens morts (#)', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <RegisterPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /conditions d'utilisation/i })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /politique de confidentialité/i })).toHaveAttribute('href', '/privacy');
  });
});
