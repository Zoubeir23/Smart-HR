import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ChurnRiskBadgesProps {
  high: number;
  medium: number;
  low: number;
  unscored: number;
}

export function ChurnRiskBadges({ high, medium, low, unscored }: ChurnRiskBadgesProps) {
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
