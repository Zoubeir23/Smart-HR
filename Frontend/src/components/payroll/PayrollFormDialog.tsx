import { Check, X } from 'lucide-react';
import SearchableSelect from '@/components/common/SearchableSelect';
import { MONTHS, STATUS_CONFIG, YEARS } from '@/components/payroll/payrollConstants';
import { formatCurrency } from '@/components/payroll/payrollHelpers';
import type { PayrollForm, PayrollStatus } from '@/components/payroll/payrollTypes';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface EmployeeOption {
  id: number;
  user_full_name?: string;
  user?: { first_name?: string; last_name?: string };
}

interface PayrollFormDialogProps {
  isOpen: boolean;
  isEditing: boolean;
  isPending: boolean;
  form: PayrollForm;
  employees: EmployeeOption[];
  onFormChange: (form: PayrollForm) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function PayrollFormDialog({
  isOpen,
  isEditing,
  isPending,
  form,
  employees,
  onFormChange,
  onClose,
  onSubmit,
}: PayrollFormDialogProps) {
  const netEstimate = (Number(form.base_salary) || 0) + (Number(form.bonuses) || 0) - (Number(form.deductions) || 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier la fiche de paie' : 'Nouvelle fiche de paie'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Employé <span className="text-destructive">*</span></Label>
            <SearchableSelect
              value={form.employee}
              onChange={(v) => onFormChange({ ...form, employee: v })}
              placeholder="Sélectionner un employé"
              searchPlaceholder="Rechercher un employé…"
              emptyText="Aucun employé trouvé."
              options={employees.map((emp) => ({
                value: String(emp.id),
                label: emp.user_full_name ?? `${emp.user?.first_name ?? ''} ${emp.user?.last_name ?? ''}`.trim(),
              }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Mois <span className="text-destructive">*</span></Label>
              <Select
                value={form.month.split('-')[1]}
                onValueChange={(m) => onFormChange({ ...form, month: `${form.month.split('-')[0]}-${m}` })}
              >
                <SelectTrigger><SelectValue placeholder="Mois" /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Année <span className="text-destructive">*</span></Label>
              <Select
                value={form.month.split('-')[0]}
                onValueChange={(y) => onFormChange({ ...form, month: `${y}-${form.month.split('-')[1]}` })}
              >
                <SelectTrigger><SelectValue placeholder="Année" /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { key: 'base_salary' as const, label: 'Salaire brut *' },
              { key: 'bonuses' as const,     label: 'Primes' },
              { key: 'deductions' as const,  label: 'Déductions' },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form[key]}
                  onChange={(e) => onFormChange({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>

          {form.base_salary && (
            <p className="text-sm text-muted-foreground text-right">
              Net estimé :{' '}
              <strong className="text-foreground">{formatCurrency(netEstimate)}</strong>
            </p>
          )}

          <div className="space-y-1.5">
            <Label>Statut</Label>
            <Select
              value={form.status}
              onValueChange={(v) => onFormChange({ ...form, status: v as PayrollStatus })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                  <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            <X className="mr-1 h-4 w-4" /> Annuler
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isPending || !form.employee || !form.month || !form.base_salary}
          >
            <Check className="mr-1 h-4 w-4" />
            {isEditing ? 'Enregistrer' : 'Créer la fiche'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
