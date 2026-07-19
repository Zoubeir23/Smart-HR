import type { PayrollRecord } from '@/components/payroll/payrollTypes';

export function exportToCSV(records: PayrollRecord[], monthParam: string): void {
  const headers = ['Employé', 'Email', 'Département', 'Mois', 'Brut', 'Primes', 'Déductions', 'Net', 'Statut'];
  const rows = records.map((r) => [
    r.employee_name,
    r.employee_email ?? '',
    r.department_name ?? '',
    r.month,
    Number(r.base_salary),
    Number(r.bonuses),
    Number(r.deductions),
    Number(r.net_salary),
    r.status_display ?? r.status,
  ]);
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fiches-paie-${monthParam}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
