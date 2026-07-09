import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Coins } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trainingService } from '@/services/trainingService';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

export default function CompletionRateSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['training-completion-stats'],
    queryFn: trainingService.getCompletionStats,
  });

  if (isLoading || !data) return null;

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle2 className="h-5 w-5 text-success" />
          Taux de complétion & coûts des formations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-success transition-all" style={{ width: `${data.global.completion_rate}%` }} />
            </div>
          </div>
          <span className="text-lg font-bold text-foreground">{data.global.completion_rate}%</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {data.global.completed} / {data.global.total_participations} inscriptions complétées, toutes formations confondues.
        </p>

        <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="text-foreground">
            Coût total : <strong>{formatCurrency(data.global.total_cost)}</strong>
          </span>
          <span className="text-muted-foreground">· Coût moyen par formation : {formatCurrency(data.global.average_cost)}</span>
        </div>

        {data.by_formation.length > 0 && (
          <div className="space-y-2 pt-2">
            {data.by_formation.map((formation) => (
              <div key={formation.id} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 truncate text-foreground">{formation.title}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${formation.completion_rate}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                  {formation.completed}/{formation.total_participations} ({formation.completion_rate}%)
                </span>
                <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">{formatCurrency(formation.cost)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
