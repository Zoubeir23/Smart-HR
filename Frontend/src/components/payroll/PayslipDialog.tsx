import { Download, X } from 'lucide-react';
import { STATUS_CONFIG } from '@/components/payroll/payrollConstants';
import { formatCurrency, formatMonthLabel } from '@/components/payroll/payrollHelpers';
import { generatePayslipPDF } from '@/components/payroll/payslipPdf';
import type { PayrollRecord } from '@/components/payroll/payrollTypes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface PayslipDialogProps {
  record: PayrollRecord | null;
  onClose: () => void;
}

export function PayslipDialog({ record, onClose }: PayslipDialogProps) {
  return (
    <Dialog open={record !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Bulletin de Paie</DialogTitle>
        </DialogHeader>
        {record && (
          <div id="payslip-print" className="space-y-4 py-2 text-sm">
            <div className="flex justify-between items-start border-b border-border pb-3">
              <div>
                <p className="font-bold text-foreground text-base">{record.employee_name}</p>
                <p className="text-muted-foreground">{record.employee_email}</p>
                <p className="text-muted-foreground">{record.department_name || 'Sans département'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Période</p>
                <p className="font-semibold text-foreground">{formatMonthLabel(record.month)}</p>
                <Badge className={cn('text-xs mt-1', STATUS_CONFIG[record.status]?.className ?? '')}>
                  {STATUS_CONFIG[record.status]?.label ?? record.status}
                </Badge>
              </div>
            </div>

            <table className="w-full">
              <tbody className="divide-y divide-border">
                {[
                  { label: 'Salaire de base',  value: formatCurrency(record.base_salary),  className: '' },
                  { label: 'Primes / Ancienneté', value: `+ ${formatCurrency(record.bonuses)}`, className: 'text-success' },
                  { label: 'Déductions',        value: `- ${formatCurrency(record.deductions)}`, className: 'text-destructive' },
                ].map(({ label, value, className }) => (
                  <tr key={label}>
                    <td className="py-2 text-muted-foreground">{label}</td>
                    <td className={cn('py-2 text-right font-medium', className)}>{value}</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-3 text-foreground text-base border-t-2 border-border">Net à payer</td>
                  <td className="py-3 text-right text-primary text-base border-t-2 border-border">
                    {formatCurrency(record.net_salary)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-1 h-4 w-4" /> Fermer
          </Button>
          <Button onClick={() => record && generatePayslipPDF(record)} className="gap-2">
            <Download className="h-4 w-4" /> Télécharger PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
