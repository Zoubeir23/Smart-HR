import { Calendar, Network, Users } from 'lucide-react';
import { LeaveAttendanceGrid } from '@/components/analytics/LeaveAttendanceGrid';
import OrganigrammeSummaryTree from '@/components/analytics/OrganigrammeSummaryTree';
import AgePyramidChart from '@/components/charts/AgePyramidChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { HRAnalyticsOverview } from '@/services/analyticsService';

interface WorkforceTabProps {
  data?: HRAnalyticsOverview;
  isLoading: boolean;
}

export function WorkforceTab({ data, isLoading }: WorkforceTabProps) {
  return (
    <div className="space-y-6">
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
            {isLoading ? <Skeleton className="h-52 w-full" /> : <AgePyramidChart data={data?.age_pyramid ?? []} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Network className="h-4 w-4" />
              Structure de l'organigramme
            </CardTitle>
            <p className="text-sm text-muted-foreground">Effectif par unité, du sommet aux services</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <OrganigrammeSummaryTree data={data?.department_hierarchy ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Congés & Présences (absentéisme)
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
    </div>
  );
}
