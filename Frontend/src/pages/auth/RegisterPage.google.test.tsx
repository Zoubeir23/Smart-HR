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

describe('RegisterPage — inscription Google', () => {
  it("affiche le bouton Google quand VITE_GOOGLE_CLIENT_ID est configuré", () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'fake-client-id.apps.googleusercontent.com');

    render(
      <MemoryRouter>
        <AuthProvider>
          <RegisterPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /googlelogin/i })).toBeInTheDocument();

    vi.unstubAllEnvs();
  });

  it("masque le bouton Google quand VITE_GOOGLE_CLIENT_ID est absent", () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');

    render(
      <MemoryRouter>
        <AuthProvider>
          <RegisterPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.queryByRole('button', { name: /googlelogin/i })).not.toBeInTheDocument();

    vi.unstubAllEnvs();
  });
});
