import { MONTHS } from '@/components/payroll/payrollConstants';

export function formatCurrency(amount: string | number): string {
  return new Intl.NumberFormat('fr-FR').format(Number(amount)) + ' FCFA';
}

export function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase();
}

export function formatMonthLabel(monthParam: string): string {
  const [year, month] = monthParam.split('-');
  const label = MONTHS.find((m) => m.value === month)?.label ?? month;
  return `${label} ${year}`;
}
