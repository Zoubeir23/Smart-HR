import { Check, DollarSign, Download, FileText, Pencil, Trash2, Zap, Plus } from 'lucide-react';
import DataPagination from '@/components/common/DataPagination';
import { STATUS_CONFIG } from '@/components/payroll/payrollConstants';
import { formatCurrency, formatMonthLabel, getInitials } from '@/components/payroll/payrollHelpers';
import type { PayrollRecord } from '@/components/payroll/payrollTypes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface PayrollListTabProps {
  payrollRecords: PayrollRecord[];
  pagedRecords: PayrollRecord[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  monthParam: string;
  canEdit: boolean;
  isMarkPaidPending: boolean;
  isBulkGeneratePending: boolean;
  onMarkPaid: (id: number) => void;
  onViewSlip: (record: PayrollRecord) => void;
  onEdit: (record: PayrollRecord) => void;
  onDelete: (id: number) => void;
  onExportCsv: () => void;
  onBulkGenerate: () => void;
  onCreate: () => void;
}

export function PayrollListTab({
  payrollRecords,
  pagedRecords,
  currentPage,
  setCurrentPage,
  totalPages,
  monthParam,
  canEdit,
  isMarkPaidPending,
  isBulkGeneratePending,
  onMarkPaid,
  onViewSlip,
  onEdit,
  onDelete,
  onExportCsv,
  onBulkGenerate,
  onCreate,
}: PayrollListTabProps) {
  return (
    <div className="border border-border bg-card rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">
          Fiches — {formatMonthLabel(monthParam)}
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={onExportCsv}
          disabled={payrollRecords.length === 0}
        >
          <Download className="h-4 w-4" />
          Exporter CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Employé</TableHead>
              <TableHead className="hidden sm:table-cell">Département</TableHead>
              <TableHead className="text-right">Brut</TableHead>
              <TableHead className="text-right hidden md:table-cell">Primes</TableHead>
              <TableHead className="text-right hidden md:table-cell">Déductions</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRecords.map((record) => {
              const sc = STATUS_CONFIG[record.status];
              return (
                <TableRow
                  key={record.id}
                  className="border-b border-border hover:bg-muted/40 transition-colors animate-in fade-in"
                >
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {getInitials(record.employee_name || 'NN')}
                      </div>
                      <span className="font-medium text-sm text-foreground truncate">
                        {record.employee_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {record.department_name || '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-foreground">
                    {formatCurrency(record.base_salary)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-success hidden md:table-cell">
                    +{formatCurrency(record.bonuses)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-destructive hidden md:table-cell">
                    -{formatCurrency(record.deductions)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-bold text-foreground">
                    {formatCurrency(record.net_salary)}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs', sc?.className ?? '')}>
                      {sc?.label ?? record.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Voir la fiche"
                        onClick={() => onViewSlip(record)}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                      {canEdit && record.status !== 'paid' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-success hover:bg-success/10"
                          title="Marquer payé"
                          onClick={() => onMarkPaid(record.id)}
                          disabled={isMarkPaidPending}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canEdit && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => onEdit(record)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => onDelete(record.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <DataPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        className="pt-4"
      />

      {payrollRecords.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <DollarSign className="h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-base font-semibold text-foreground">Aucune fiche de paie</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Aucune fiche pour {formatMonthLabel(monthParam)}.
          </p>
          {canEdit && (
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="gap-2" onClick={onBulkGenerate} disabled={isBulkGeneratePending}>
                <Zap className="h-4 w-4" /> Générer automatiquement
              </Button>
              <Button className="gap-2" onClick={onCreate}>
                <Plus className="h-4 w-4" /> Créer manuellement
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
