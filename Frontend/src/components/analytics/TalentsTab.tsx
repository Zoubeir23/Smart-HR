import { AlertTriangle, Target } from 'lucide-react';
import { ChurnRiskBadges } from '@/components/analytics/ChurnRiskBadges';
import PerformanceDistributionChart from '@/components/charts/PerformanceDistributionChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { HRAnalyticsOverview } from '@/services/analyticsService';

interface TalentsTabProps {
  data?: HRAnalyticsOverview;
  isLoading: boolean;
}

export function TalentsTab({ data, isLoading }: TalentsTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Performance des talents
          </CardTitle>
          <p className="text-sm text-muted-foreground">Répartition des scores d'évaluation</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : (
            <PerformanceDistributionChart data={data?.performance_summary.distribution ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
