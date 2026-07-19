import { AlertTriangle, CircleCheck, Sparkles } from 'lucide-react';
import { buildAlerts } from '@/components/analytics/analyticsHelpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { HRAnalyticsOverview } from '@/services/analyticsService';

interface AlertsPanelProps {
  data?: HRAnalyticsOverview;
}

export function AlertsPanel({ data }: AlertsPanelProps) {
  const alerts = data ? buildAlerts(data) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-secondary" />
          Alertes & Recommandations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <CircleCheck className="h-4 w-4 text-green-600" />
            Aucune alerte — tous les indicateurs sont dans la norme.
          </div>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert, index) => (
              <li
                key={index}
                className={cn(
                  'flex items-start gap-2 rounded-lg px-3 py-2 text-sm',
                  alert.severity === 'warning'
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                )}
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {alert.message}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
