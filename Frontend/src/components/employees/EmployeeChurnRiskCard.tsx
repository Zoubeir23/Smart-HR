import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { getRiskLevel } from '@/components/employees/employeeDetailHelpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EmployeeChurnRiskCardProps {
  churnRisk: number;
  churnMainReason: string | null | undefined;
}

export function EmployeeChurnRiskCard({ churnRisk, churnMainReason }: EmployeeChurnRiskCardProps) {
  const risk = getRiskLevel(churnRisk ?? 0);

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-primary" />
          Risque de départ
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
          {/* Score display */}
          <div className="flex flex-col items-center">
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-muted">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.3 }}
              >
                <span className={cn('text-3xl font-bold', risk.color)}>
                  {churnRisk ?? 0}%
                </span>
              </motion.div>
            </div>
            <span className={cn('mt-2 text-sm font-medium', risk.color)}>
              Risque {risk.label}
            </span>
          </div>

          {/* Risk bar and details */}
          <div className="flex-1 space-y-4">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Score de risque</span>
                <span className={cn('font-medium', risk.color)}>
                  {churnRisk ?? 0}%
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${churnRisk ?? 0}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.6 }}
                  className={cn('h-full rounded-full', risk.bgColor)}
                />
              </div>
            </div>

            {/* Main reason */}
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className={cn('mt-0.5 h-4 w-4', risk.color)} />
                <div>
                  <p className="text-sm font-medium text-foreground">Raison principale</p>
                  <p className="text-sm text-muted-foreground">
                    {churnMainReason ?? 'Non disponible'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
