import { BarChart2 } from 'lucide-react';
import { STATUS_CONFIG } from '@/components/payroll/payrollConstants';
import { formatCurrency, formatMonthLabel } from '@/components/payroll/payrollHelpers';
import type { PayrollStats } from '@/components/payroll/payrollTypes';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface PayrollStatsTabProps {
  isLoading: boolean;
  stats: PayrollStats | null;
  monthParam: string;
}

export function PayrollStatsTab({ isLoading, stats, monthParam }: PayrollStatsTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-muted-foreground">Chargement des statistiques…</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BarChart2 className="h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 text-sm text-muted-foreground">Aucune donnée pour ce mois.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cards résumé */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: 'Total fiches',        value: String(stats.total_payrolls) },
          { label: 'Masse salariale nette', value: formatCurrency(stats.total_net_salary) },
          { label: 'Mois analysé',         value: formatMonthLabel(monthParam) },
        ].map((s) => (
          <div key={s.label} className="border border-border bg-card rounded-xl shadow-sm p-4">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Par statut */}
      <div className="border border-border bg-card rounded-xl shadow-sm p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Répartition par statut</h3>
        <div className="space-y-3">
          {Object.entries(stats.by_status).map(([statusKey, count]) => {
            const cfg = STATUS_CONFIG[statusKey];
            const total = stats.total_payrolls || 1;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={statusKey} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{cfg?.label ?? statusKey}</span>
                  <span className="font-medium text-foreground">{count} ({pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', {
                      'bg-success': statusKey === 'paid',
                      'bg-warning': statusKey === 'pending',
                      'bg-blue-500': statusKey === 'processed',
                    })}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Par département */}
      {stats.by_department.length > 0 && (
        <div className="border border-border bg-card rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Masse salariale par département</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Département</TableHead>
                <TableHead className="text-center">Effectif</TableHead>
                <TableHead className="text-right">Total net</TableHead>
                <TableHead className="text-right">Part</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.by_department.map((dept) => {
                const totalNet = Number(stats.total_net_salary) || 1;
                const deptNet  = Number(dept.total_net);
                const share    = Math.round((deptNet / totalNet) * 100);
                return (
                  <TableRow key={dept.employee__department__name ?? 'none'} className="border-b border-border">
                    <TableCell className="font-medium text-sm">
                      {dept.employee__department__name ?? 'Sans département'}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {dept.count}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-foreground">
                      {formatCurrency(dept.total_net)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${share}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{share}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
