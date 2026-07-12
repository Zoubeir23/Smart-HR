import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));

vi.mock('@/context/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('@/context/AuthContext')>('@/context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: { id: 1, first_name: 'Awa', last_name: 'Diop', role: 'RH' },
      logout: vi.fn(),
      hasRole: () => true,
    }),
  };
});

function renderSidebar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TooltipProvider>
          <Sidebar collapsed={false} onToggle={vi.fn()} />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Sidebar — dégradé rouge braise piloté par le token de marque, plus de hex dupliqué', () => {
  it('réutilise var(--gradient-primary), sans le hex #e63c3c dupliqué en dur', () => {
    const { container } = renderSidebar();

    expect(container.innerHTML).toContain('var(--gradient-primary)');
    expect(container.innerHTML).not.toContain('#e63c3c');
  });
});
