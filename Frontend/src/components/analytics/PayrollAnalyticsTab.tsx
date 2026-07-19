import { CreditCard, TrendingUp, Users } from 'lucide-react';
import { formatCurrency } from '@/components/analytics/analyticsHelpers';
import { StatCard } from '@/components/analytics/StatCard';
import SalaryDistributionChart from '@/components/charts/SalaryDistributionChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { HRAnalyticsOverview } from '@/services/analyticsService';

interface PayrollAnalyticsTabProps {
  data?: HRAnalyticsOverview;
  isLoading: boolean;
}

export function PayrollAnalyticsTab({ data, isLoading }: PayrollAnalyticsTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : (
          <>
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
              title="Effectif actif"
              value={data?.totals.active_employees ?? 0}
              subtitle="Base de calcul"
              icon={Users}
              trend="neutral"
            />
          </>
        )}
      </div>

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
  );
}
