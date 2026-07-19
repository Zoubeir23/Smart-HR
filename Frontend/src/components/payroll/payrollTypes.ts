export type PayrollStatus = 'paid' | 'pending' | 'processed';

export interface PayrollRecord {
  id: number;
  employee: number;
  employee_name: string;
  employee_email: string;
  department_name: string;
  month: string;
  base_salary: string | number;
  bonuses: string | number;
  deductions: string | number;
  gross_salary: string | number;
  net_salary: string | number;
  status: PayrollStatus;
  status_display: string;
}

export interface PayrollForm {
  employee: string;
  month: string;
  base_salary: string;
  bonuses: string;
  deductions: string;
  status: PayrollStatus;
}

export interface DepartmentStat {
  employee__department__name: string | null;
  count: number;
  total_net: string | number;
}

export interface PayrollStats {
  month: string;
  total_payrolls: number;
  total_net_salary: string | number;
  by_status: Record<string, number>;
  by_department: DepartmentStat[];
}
