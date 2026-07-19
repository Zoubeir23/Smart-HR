import { Target } from 'lucide-react';
import PerformanceDistributionChart from '@/components/charts/PerformanceDistributionChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { HRAnalyticsOverview } from '@/services/analyticsService';

interface PerformanceTabProps {
  data?: HRAnalyticsOverview;
  isLoading: boolean;
}

export function PerformanceTab({ data, isLoading }: PerformanceTabProps) {
  return (
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
          <Skeleton className="h-64 w-full" />
        ) : (
          <PerformanceDistributionChart data={data?.performance_summary.distribution ?? []} />
        )}
      </CardContent>
    </Card>
  );
}
