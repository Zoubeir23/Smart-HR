import { Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Evaluation {
  year: number;
  score: number;
  comment: string;
}

interface EmployeePerformanceCardProps {
  evaluations: Evaluation[];
}

export function EmployeePerformanceCard({ evaluations }: EmployeePerformanceCardProps) {
  return (
    <Card className="border border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="h-5 w-5 text-primary" />
          Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {evaluations.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">Non disponible</p>
        )}
        {evaluations.map((evaluation) => (
          <div
            key={evaluation.year}
            className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-foreground">{evaluation.year}</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'h-4 w-4',
                        star <= Math.round(evaluation.score)
                          ? 'fill-warning text-warning'
                          : 'text-muted-foreground'
                      )}
                    />
                  ))}
                  <span className="ml-2 text-sm font-medium text-foreground">
                    {evaluation.score}/5
                  </span>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{evaluation.comment}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
