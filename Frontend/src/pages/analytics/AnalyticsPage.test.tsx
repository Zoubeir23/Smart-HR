import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import AnalyticsPage from './AnalyticsPage';

const { toastMock, getOverviewMock, exportOverviewExcelMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
  getOverviewMock: vi.fn(),
  exportOverviewExcelMock: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/services/analyticsService', () => ({
  analyticsService: {
    getOverview: getOverviewMock,
    exportOverviewExcel: exportOverviewExcelMock,
  },
}));

const baseOverview = {
  totals: { active_employees: 42, salary_mass: 12_000_000, average_salary: 285_000 },
  age_pyramid: [],
  salary_distribution: [],
  department_headcount: [{ department: 'Tech', count: 10 }],
  leave_summary: { total: 0, approved: 0, pending: 0, rejected: 0 },
  attendance_summary: { total: 0, present: 0, absent: 0, late: 0 },
  churn_summary: { high: 2, medium: 3, low: 37, unscored: 0 },
  monthly_headcount: [],
  training_summary: {
    total_formations: 5,
    total_cost: 500000,
    average_cost: 100000,
    total_participations: 8,
    completed_participations: 6,
    completion_rate: 75,
    available_courses: 3,
    cost_breakdown: [{ title: 'Django avancé', cost: 200000 }],
  },
  performance_summary: {
    evaluated_count: 4,
    average_score: 78.5,
    distribution: [{ label: 'Bon (60-79)', count: 4 }],
  },
  recruitment_funnel: [
    { status: 'pending', label: 'En attente', count: 3 },
    { status: 'accepted', label: 'Accepté', count: 1 },
  ],
  engagement_summary: { responses_count: 12, average_rating: 4.1 },
  department_hierarchy: [
    { id: 1, name: 'Direction Générale', parent_id: null, unit_type: 'dg', employee_count: 2 },
    { id: 2, name: 'Support', parent_id: 1, unit_type: 'service', employee_count: 8 },
  ],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AnalyticsPage />
    </QueryClientProvider>
  );
}

describe('AnalyticsPage', () => {
  it('affiche les nouvelles sections People Analytics une fois les données chargées', async () => {
    getOverviewMock.mockResolvedValue(baseOverview);
    renderPage();

    expect(await screen.findByText('Performance globale')).toBeInTheDocument();
    expect(screen.getByText("Recrutement — de A à Z")).toBeInTheDocument();
    expect(screen.getByText('Engagement du personnel')).toBeInTheDocument();
    expect(screen.getByText("Structure de l'organigramme")).toBeInTheDocument();
    expect(screen.getByText('Cours disponibles')).toBeInTheDocument();
    expect(screen.getByText('Total assigné')).toBeInTheDocument();
  });

  it('affiche la moyenne d\'engagement et le nombre de réponses', async () => {
    getOverviewMock.mockResolvedValue(baseOverview);
    renderPage();

    await screen.findByText('Engagement du personnel');
    expect(screen.getByText('4.1')).toBeInTheDocument();
    expect(screen.getByText('12 réponse(s) collectée(s)')).toBeInTheDocument();
  });

  it("déclenche l'export Excel au clic sur le bouton", async () => {
    getOverviewMock.mockResolvedValue(baseOverview);
    exportOverviewExcelMock.mockResolvedValue(undefined);
    renderPage();

    await screen.findByText('Performance globale');
    fireEvent.click(screen.getByRole('button', { name: /excel/i }));

    await waitFor(() => expect(exportOverviewExcelMock).toHaveBeenCalledTimes(1));
  });

  it("affiche une erreur si l'export Excel échoue", async () => {
    getOverviewMock.mockResolvedValue(baseOverview);
    exportOverviewExcelMock.mockRejectedValue(new Error('boom'));
    renderPage();

    await screen.findByText('Performance globale');
    fireEvent.click(screen.getByRole('button', { name: /excel/i }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Erreur', variant: 'destructive' })
      )
    );
  });

  it('le bouton PDF est désactivé tant que les données ne sont pas chargées', () => {
    getOverviewMock.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByRole('button', { name: /pdf/i })).toBeDisabled();
  });

  it('le bouton PDF devient actif une fois les données chargées', async () => {
    getOverviewMock.mockResolvedValue(baseOverview);
    renderPage();

    await screen.findByText('Performance globale');
    expect(screen.getByRole('button', { name: /pdf/i })).not.toBeDisabled();
  });
});
