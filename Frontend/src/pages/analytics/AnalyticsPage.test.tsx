import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnalyticsPage from './AnalyticsPage';

const { toastMock, getOverviewMock, exportOverviewExcelMock, getDepartmentsMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
  getOverviewMock: vi.fn(),
  exportOverviewExcelMock: vi.fn(),
  getDepartmentsMock: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/services/analyticsService', async () => {
  const actual = await vi.importActual<typeof import('@/services/analyticsService')>('@/services/analyticsService');
  return {
    ...actual,
    analyticsService: {
      getOverview: getOverviewMock,
      exportOverviewExcel: exportOverviewExcelMock,
    },
  };
});

vi.mock('@/services/departmentService', () => ({
  departmentService: {
    getAll: getDepartmentsMock,
  },
}));

const baseOverview = {
  totals: { active_employees: 42, salary_mass: 12_000_000, average_salary: 285_000 },
  age_pyramid: [],
  salary_distribution: [],
  department_headcount: [{ department: 'Tech', count: 10 }],
  leave_summary: { total: 0, approved: 0, pending: 2, rejected: 0 },
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

function goToTab(name: string | RegExp) {
  fireEvent.click(screen.getByRole('button', { name }));
}

describe('AnalyticsPage', () => {
  beforeEach(() => {
    getDepartmentsMock.mockResolvedValue([{ id: 1, name: 'Tech' }]);
  });

  it("affiche les onglets de navigation People Analytics", async () => {
    getOverviewMock.mockResolvedValue(baseOverview);
    renderPage();

    await screen.findByText('Effectif actif');
    expect(screen.getByRole('button', { name: "Vue d'ensemble" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Effectif & Structure' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Performance' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Talents' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Formation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Engagement' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recrutement' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Masse Salariale' })).toBeInTheDocument();
  });

  it("affiche une alerte pour les congés en attente sur l'onglet Vue d'ensemble", async () => {
    getOverviewMock.mockResolvedValue(baseOverview);
    renderPage();

    expect(await screen.findByText(/demande\(s\) de congé en attente/i)).toBeInTheDocument();
  });

  it("n'affiche aucune alerte quand tous les indicateurs sont dans la norme", async () => {
    getOverviewMock.mockResolvedValue({
      ...baseOverview,
      churn_summary: { high: 0, medium: 0, low: 42, unscored: 0 },
      leave_summary: { total: 0, approved: 0, pending: 0, rejected: 0 },
      training_summary: { ...baseOverview.training_summary, completion_rate: 90 },
      engagement_summary: { responses_count: 12, average_rating: 4.5 },
      recruitment_funnel: [{ status: 'pending', label: 'En attente', count: 1 }],
    });
    renderPage();

    expect(await screen.findByText(/aucune alerte/i)).toBeInTheDocument();
  });

  it('affiche la section Performance en changeant d\'onglet', async () => {
    getOverviewMock.mockResolvedValue(baseOverview);
    renderPage();

    await screen.findByText('Effectif actif');
    goToTab('Performance');
    expect(await screen.findByText('Performance globale')).toBeInTheDocument();
  });

  it("affiche la section Recrutement en changeant d'onglet", async () => {
    getOverviewMock.mockResolvedValue(baseOverview);
    renderPage();

    await screen.findByText('Effectif actif');
    goToTab('Recrutement');
    expect(await screen.findByText('Recrutement — de A à Z')).toBeInTheDocument();
  });

  it("affiche la section Engagement avec la moyenne et le nombre de réponses", async () => {
    getOverviewMock.mockResolvedValue(baseOverview);
    renderPage();

    await screen.findByText('Effectif actif');
    goToTab('Engagement');
    await screen.findByText('Engagement du personnel');
    expect(screen.getByText('4.1')).toBeInTheDocument();
    expect(screen.getByText('12 réponse(s) collectée(s)')).toBeInTheDocument();
  });

  it("déclenche l'export Excel au clic sur le bouton", async () => {
    getOverviewMock.mockResolvedValue(baseOverview);
    exportOverviewExcelMock.mockResolvedValue(undefined);
    renderPage();

    await screen.findByText('Effectif actif');
    fireEvent.click(screen.getByRole('button', { name: /excel/i }));

    await waitFor(() => expect(exportOverviewExcelMock).toHaveBeenCalledTimes(1));
  });

  it("affiche une erreur si l'export Excel échoue", async () => {
    getOverviewMock.mockResolvedValue(baseOverview);
    exportOverviewExcelMock.mockRejectedValue(new Error('boom'));
    renderPage();

    await screen.findByText('Effectif actif');
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

  it('affiche le filtre département avec "Tous les départements" par défaut', async () => {
    getOverviewMock.mockResolvedValue(baseOverview);
    renderPage();

    await screen.findByText('Effectif actif');
    expect(screen.getByRole('combobox')).toHaveTextContent('Tous les départements');
    expect(getOverviewMock).toHaveBeenCalledWith(expect.objectContaining({ departmentId: null }));
  });

  it('change de période déclenche un nouvel appel avec le filtre', async () => {
    getOverviewMock.mockResolvedValue(baseOverview);
    renderPage();

    await screen.findByText('Effectif actif');
    getOverviewMock.mockClear();

    fireEvent.click(screen.getByRole('button', { name: '3M' }));

    await waitFor(() => expect(getOverviewMock).toHaveBeenCalledWith(expect.objectContaining({ period: '3m' })));
  });
});
