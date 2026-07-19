import { AlertTriangle, CreditCard, LayoutGrid, Target, TrendingUp, Users } from 'lucide-react';
import { AlertsPanel } from '@/components/analytics/AlertsPanel';
import { formatCurrency } from '@/components/analytics/analyticsHelpers';
import { StatCard } from '@/components/analytics/StatCard';
import DepartmentHeadcountChart from '@/components/charts/DepartmentHeadcountChart';
import MonthlyHeadcountChart from '@/components/charts/MonthlyHeadcountChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { HRAnalyticsOverview } from '@/services/analyticsService';

interface OverviewTabProps {
  data?: HRAnalyticsOverview;
  isLoading: boolean;
}

export function OverviewTab({ data, isLoading }: OverviewTabProps) {
  return (
    <div className="space-y-6">
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
              title="Risque churn élevé"
              value={data?.churn_summary.high ?? 0}
              subtitle="Employés à surveiller"
              icon={AlertTriangle}
              trend={data?.churn_summary.high && data.churn_summary.high > 0 ? 'down' : 'neutral'}
            />
            <StatCard
              title="Performance moyenne"
              value={`${data?.performance_summary.average_score ?? 0}/100`}
              subtitle={`${data?.performance_summary.evaluated_count ?? 0} évaluation(s)`}
              icon={Target}
              trend="neutral"
            />
            <StatCard
              title="Masse salariale"
              value={formatCurrency(data?.totals.salary_mass ?? 0)}
              subtitle="Total mensuel"
              icon={CreditCard}
              trend="neutral"
            />
          </>
        )}
      </div>

      <AlertsPanel data={data} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Évolution des effectifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-52 w-full" /> : <MonthlyHeadcountChart data={data?.monthly_headcount ?? []} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutGrid className="h-4 w-4" />
              Effectifs par département
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <DepartmentHeadcountChart data={data?.department_headcount ?? []} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
