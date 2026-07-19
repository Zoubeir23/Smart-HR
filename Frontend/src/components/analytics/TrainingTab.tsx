import { CheckCircle2, CreditCard, GraduationCap, Users } from 'lucide-react';
import { formatCurrency } from '@/components/analytics/analyticsHelpers';
import { StatCard } from '@/components/analytics/StatCard';
import TrainingCostChart from '@/components/charts/TrainingCostChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { HRAnalyticsOverview } from '@/services/analyticsService';

interface TrainingTabProps {
  data?: HRAnalyticsOverview;
  isLoading: boolean;
}

export function TrainingTab({ data, isLoading }: TrainingTabProps) {
  return (
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
  );
}
