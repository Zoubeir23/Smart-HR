import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage';
import { ThemeProvider } from '@/context/ThemeContext';

vi.mock('@/services/recruitmentService', () => ({
  recruitmentService: {
    getJobs: vi.fn().mockResolvedValue({ results: [] }),
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('LandingPage — liens légaux du footer', () => {
  it('pointe vers les vraies pages légales au lieu de liens morts (#)', () => {
    renderPage();

    expect(screen.getByRole('link', { name: 'Confidentialité' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'CGU' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'RGPD' })).toHaveAttribute('href', '/gdpr');
    expect(screen.getByRole('link', { name: 'Mentions légales' })).toHaveAttribute('href', '/legal-notice');
  });
});
