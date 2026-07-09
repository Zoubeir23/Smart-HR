import { motion } from 'framer-motion';
import { jsPDF } from 'jspdf';
import {
  Users,
  TrendingUp,
  TrendingDown,
  CreditCard,
  AlertTriangle,
  Calendar,
  RefreshCw,
  GraduationCap,
  CheckCircle2,
  Target,
  Briefcase,
  Smile,
  Network,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import AgePyramidChart from '@/components/charts/AgePyramidChart';
import SalaryDistributionChart from '@/components/charts/SalaryDistributionChart';
import DepartmentHeadcountChart from '@/components/charts/DepartmentHeadcountChart';
import MonthlyHeadcountChart from '@/components/charts/MonthlyHeadcountChart';
import RecruitmentFunnelChart from '@/components/charts/RecruitmentFunnelChart';
import PerformanceDistributionChart from '@/components/charts/PerformanceDistributionChart';
import TrainingCostChart from '@/components/charts/TrainingCostChart';
import OrganigrammeSummaryTree from '@/components/analytics/OrganigrammeSummaryTree';
import { analyticsService, HRAnalyticsOverview } from '@/services/analyticsService';

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M FCFA`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k FCFA`;
  return `${amount} FCFA`;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          {trend && (
            <span>
              {trend === 'up' ? (
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              ) : trend === 'down' ? (
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              ) : null}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ChurnRiskBadges({
  high,
  medium,
  low,
  unscored,
}: {
  high: number;
  medium: number;
  low: number;
  unscored: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg bg-destructive/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">Risque élevé</span>
        </div>
        <Badge variant="destructive">{high}</Badge>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Risque moyen</span>
        </div>
        <Badge className="bg-amber-500 text-white hover:bg-amber-600">{medium}</Badge>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-green-500/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">Risque faible</span>
        </div>
        <Badge className="bg-green-500 text-white hover:bg-green-600">{low}</Badge>
      </div>
      {unscored > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
          <span className="text-sm text-muted-foreground">Non analysés</span>
          <Badge variant="outline">{unscored}</Badge>
        </div>
      )}
    </div>
  );
}

function LeaveAttendanceGrid({
  leave,
  attendance,
}: {
  leave: { total: number; approved: number; pending: number; rejected: number };
  attendance: { total: number; present: number; absent: number; late: number };
}) {
  const attendanceRate =
    attendance.total > 0
      ? Math.round((attendance.present / attendance.total) * 100)
      : 0;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Congés — {new Date().getFullYear()}
        </p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-medium">{leave.total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-600 dark:text-green-400">Approuvés</span>
            <span className="font-medium text-green-600 dark:text-green-400">{leave.approved}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-600 dark:text-amber-400">En attente</span>
            <span className="font-medium text-amber-600 dark:text-amber-400">{leave.pending}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-destructive">Refusés</span>
            <span className="font-medium text-destructive">{leave.rejected}</span>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Présences — {new Date().toLocaleDateString('fr-FR', { month: 'long' })}
        </p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taux présence</span>
            <span className="font-bold text-primary">{attendanceRate}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-600 dark:text-green-400">Présents</span>
            <span className="font-medium text-green-600 dark:text-green-400">{attendance.present}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-destructive">Absents</span>
            <span className="font-medium text-destructive">{attendance.absent}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-600 dark:text-amber-400">Retards</span>
            <span className="font-medium text-amber-600 dark:text-amber-400">{attendance.late}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Génère un rapport PDF récapitulatif de tous les indicateurs People
 * Analytics — pour permettre au RH/manager d'insérer directement les chiffres
 * dans une présentation sans recréer de graphiques (cf. audit TargetYM AI).
 * Suit le même style de mise en page manuelle que le bulletin de paie
 * (Frontend/src/pages/payroll/PayrollPage.tsx).
 */
function generateAnalyticsPdf(data: HRAnalyticsOverview): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const addSectionTitle = (title: string) => {
    ensureSpace(14);
    doc.setFontSize(13);
    doc.setTextColor(214, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y);
    y += 3;
    doc.setDrawColor(214, 40, 40);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;
  };

  const addRow = (label: string, value: string) => {
    ensureSpace(7);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(85, 85, 85);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(28, 20, 16);
    doc.text(value, pageWidth - margin, y, { align: 'right' });
    y += 6;
  };

  // Header
  doc.setFontSize(22);
  doc.setTextColor(214, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.text('Smart-HR', margin, y);
  doc.setFontSize(10);
  doc.setTextColor(136, 136, 136);
  doc.setFont('helvetica', 'normal');
  doc.text('Rapport People Analytics', margin, y + 7);
  doc.setFontSize(9);
  doc.text(
    new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }),
    pageWidth - margin,
    y,
    { align: 'right' }
  );
  y += 16;

  addSectionTitle('Effectifs & masse salariale');
  addRow('Effectif actif', `${data.totals.active_employees}`);
  addRow('Masse salariale', formatCurrency(data.totals.salary_mass));
  addRow('Salaire moyen', formatCurrency(data.totals.average_salary));
  y += 4;

  addSectionTitle('Risque de départ (churn)');
  addRow('Risque élevé', `${data.churn_summary.high}`);
  addRow('Risque moyen', `${data.churn_summary.medium}`);
  addRow('Risque faible', `${data.churn_summary.low}`);
  y += 4;

  addSectionTitle('Performance');
  addRow('Employés évalués', `${data.performance_summary.evaluated_count}`);
  addRow('Score moyen', `${data.performance_summary.average_score}/100`);
  y += 4;

  addSectionTitle('Recrutement');
  data.recruitment_funnel.forEach((entry) => addRow(entry.label, `${entry.count}`));
  y += 4;

  addSectionTitle('Engagement');
  addRow('Réponses collectées', `${data.engagement_summary.responses_count}`);
  addRow('Note moyenne', `${data.engagement_summary.average_rating}/5`);
  y += 4;

  addSectionTitle('Formation');
  addRow('Formations disponibles', `${data.training_summary.available_courses}`);
  addRow('Total formations', `${data.training_summary.total_formations}`);
  addRow('Coût total', formatCurrency(data.training_summary.total_cost));
  addRow('Taux de complétion', `${data.training_summary.completion_rate}%`);
  addRow('Total assigné', `${data.training_summary.total_participations}`);
  y += 4;

  addSectionTitle('Effectifs par département');
  data.department_headcount.forEach((entry) => addRow(entry.department, `${entry.count}`));

  doc.save('people_analytics.pdf');
}

export default function AnalyticsPage() {
  const { toast } = useToast();
  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['hr-analytics-overview'],
    queryFn: analyticsService.getOverview,
    staleTime: 5 * 60 * 1000,
  });

  const exportExcelMutation = useMutation({
    mutationFn: analyticsService.exportOverviewExcel,
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible d'exporter en Excel.", variant: 'destructive' });
    },
  });

  const handleExportPdf = () => {
    if (!data) return;
    generateAnalyticsPdf(data);
  };

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <PageHeader
          title="Analytiques RH"
          description="Vue agrégée des indicateurs clés — effectifs, salaires, congés, churn"
          actions={
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Actualisé à {lastUpdated}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportExcelMutation.mutate()}
                disabled={exportExcelMutation.isPending}
              >
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={!data}>
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          }
        />

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
          ) : (
            <>
              <StatCard
                title="Effectif actif"
                value={data?.totals.active_employees ?? 0}
                subtitle="Employés en activité"
                icon={Users}
                trend="neutral"
              />
              <StatCard
                title="Masse salariale"
                value={formatCurrency(data?.totals.salary_mass ?? 0)}
                subtitle="Total mensuel"
                icon={CreditCard}
                trend="neutral"
              />
              <StatCard
                title="Salaire moyen"
                value={formatCurrency(data?.totals.average_salary ?? 0)}
                subtitle="Par employé"
                icon={TrendingUp}
                trend="neutral"
              />
              <StatCard
                title="Risque churn élevé"
                value={data?.churn_summary.high ?? 0}
                subtitle="Employés à surveiller"
                icon={AlertTriangle}
                trend={data?.churn_summary.high && data.churn_summary.high > 0 ? 'down' : 'neutral'}
              />
            </>
          )}
        </div>

        {/* Charts row 1: Pyramide des âges + Distribution salaires */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Pyramide des âges
              </CardTitle>
              <p className="text-sm text-muted-foreground">Répartition par groupe d'âge</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-52 w-full" />
              ) : (
                <AgePyramidChart data={data?.age_pyramid ?? []} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />
                Distribution des salaires
              </CardTitle>
              <p className="text-sm text-muted-foreground">Effectif par tranche de salaire</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-52 w-full" />
              ) : (
                <SalaryDistributionChart data={data?.salary_distribution ?? []} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts row 2: Effectifs par dept + Rétention */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Effectifs par département
              </CardTitle>
              <p className="text-sm text-muted-foreground">Répartition des employés actifs</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-52 w-full" />
              ) : (
                <DepartmentHeadcountChart data={data?.department_headcount ?? []} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Nouvelles embauches
              </CardTitle>
              <p className="text-sm text-muted-foreground">Evolution sur 12 mois</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-52 w-full" />
              ) : (
                <MonthlyHeadcountChart data={data?.monthly_headcount ?? []} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Congés + Présences + Churn */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Congés & Présences
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-36 w-full" />
              ) : (
                <LeaveAttendanceGrid
                  leave={data?.leave_summary ?? { total: 0, approved: 0, pending: 0, rejected: 0 }}
                  attendance={data?.attendance_summary ?? { total: 0, present: 0, absent: 0, late: 0 }}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4" />
                Risque de départ
              </CardTitle>
              <p className="text-sm text-muted-foreground">Analyse churn IA</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-36 w-full" />
              ) : (
                <ChurnRiskBadges
                  high={data?.churn_summary.high ?? 0}
                  medium={data?.churn_summary.medium ?? 0}
                  low={data?.churn_summary.low ?? 0}
                  unscored={data?.churn_summary.unscored ?? 0}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Performance + Recrutement */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4" />
                Performance globale
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {data?.performance_summary.evaluated_count ?? 0} employé(s) évalué(s) — score moyen{' '}
                {data?.performance_summary.average_score ?? 0}/100
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-52 w-full" />
              ) : (
                <PerformanceDistributionChart data={data?.performance_summary.distribution ?? []} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4" />
                Recrutement — de A à Z
              </CardTitle>
              <p className="text-sm text-muted-foreground">Candidatures par étape du processus</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-52 w-full" />
              ) : (
                <RecruitmentFunnelChart data={data?.recruitment_funnel ?? []} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 5: Engagement + Organigramme */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Smile className="h-4 w-4" />
                Engagement du personnel
              </CardTitle>
              <p className="text-sm text-muted-foreground">Moyenne des enquêtes internes</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-36 w-full" />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-6">
                  <span className="text-4xl font-bold text-primary">
                    {data?.engagement_summary.average_rating ?? 0}
                    <span className="text-lg text-muted-foreground">/5</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {data?.engagement_summary.responses_count ?? 0} réponse(s) collectée(s)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Network className="h-4 w-4" />
                Structure de l'organigramme
              </CardTitle>
              <p className="text-sm text-muted-foreground">Effectif par unité, du sommet aux services</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-36 w-full" />
              ) : (
                <OrganigrammeSummaryTree data={data?.department_hierarchy ?? []} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 6: Formation (coûts, complétion & répartition) */}
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
            ) : (
              <>
                <StatCard
                  title="Cours disponibles"
                  value={data?.training_summary.available_courses ?? 0}
                  subtitle={`${data?.training_summary.total_formations ?? 0} formation(s) au total`}
                  icon={GraduationCap}
                  trend="neutral"
                />
                <StatCard
                  title="Coût total des formations"
                  value={formatCurrency(data?.training_summary.total_cost ?? 0)}
                  subtitle="Toutes formations confondues"
                  icon={CreditCard}
                  trend="neutral"
                />
                <StatCard
                  title="Taux de complétion"
                  value={`${data?.training_summary.completion_rate ?? 0}%`}
                  subtitle={`${data?.training_summary.completed_participations ?? 0}/${data?.training_summary.total_participations ?? 0} inscriptions`}
                  icon={CheckCircle2}
                  trend="neutral"
                />
                <StatCard
                  title="Total assigné"
                  value={data?.training_summary.total_participations ?? 0}
                  subtitle="Inscriptions aux formations"
                  icon={Users}
                  trend="neutral"
                />
              </>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-4 w-4" />
                Répartition des formations en coût
              </CardTitle>
              <p className="text-sm text-muted-foreground">Coût par formation (10 plus élevées)</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-52 w-full" />
              ) : (
                <TrainingCostChart data={data?.training_summary.cost_breakdown ?? []} />
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
  );
}
