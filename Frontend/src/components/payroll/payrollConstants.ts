import type { PayrollForm } from '@/components/payroll/payrollTypes';

export const EMPTY_FORM: PayrollForm = {
  employee: '',
  month: new Date().toISOString().slice(0, 7),
  base_salary: '',
  bonuses: '0',
  deductions: '0',
  status: 'pending',
};

export const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  paid:      { label: 'Payé',       className: 'bg-success text-success-foreground' },
  pending:   { label: 'En attente', className: 'bg-warning text-warning-foreground' },
  processed: { label: 'Traité',     className: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200' },
};

export const MONTHS = [
  { value: '01', label: 'Janvier' }, { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' },    { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' },     { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' }, { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' }, { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' }, { value: '12', label: 'Décembre' },
];

function getYears(rangeBefore = 2, rangeAfter = 2): string[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: rangeBefore + rangeAfter + 1 }, (_, i) => String(currentYear - rangeBefore + i));
}

export const YEARS = getYears();
