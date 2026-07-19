import { Smile } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { HRAnalyticsOverview } from '@/services/analyticsService';

interface EngagementTabProps {
  data?: HRAnalyticsOverview;
  isLoading: boolean;
}

export function EngagementTab({ data, isLoading }: EngagementTabProps) {
  return (
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
  );
}
