import { Briefcase } from 'lucide-react';
import RecruitmentFunnelChart from '@/components/charts/RecruitmentFunnelChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { HRAnalyticsOverview } from '@/services/analyticsService';

interface RecruitmentTabProps {
  data?: HRAnalyticsOverview;
  isLoading: boolean;
}

export function RecruitmentTab({ data, isLoading }: RecruitmentTabProps) {
  return (
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
          <Skeleton className="h-64 w-full" />
        ) : (
          <RecruitmentFunnelChart data={data?.recruitment_funnel ?? []} />
        )}
      </CardContent>
    </Card>
  );
}
