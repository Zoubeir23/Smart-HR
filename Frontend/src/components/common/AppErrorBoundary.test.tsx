import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AppErrorBoundary from './AppErrorBoundary';

function ThrowingComponent(): React.ReactElement {
  throw new Error('boom');
}

describe('AppErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <AppErrorBoundary>
        <div>contenu normal</div>
      </AppErrorBoundary>
    );
    expect(screen.getByText('contenu normal')).toBeInTheDocument();
  });

  it('renders a fallback instead of crashing when a child throws', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AppErrorBoundary>
        <ThrowingComponent />
      </AppErrorBoundary>
    );

    expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
