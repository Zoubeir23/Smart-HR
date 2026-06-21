import api from './api';

export interface AgePyramidEntry {
  group: string;
  count: number;
}

export interface SalaryDistributionEntry {
  bracket: string;
  count: number;
}

export interface DepartmentHeadcountEntry {
  department: string;
  count: number;
}

export interface HRAnalyticsOverview {
  totals: {
    active_employees: number;
    salary_mass: number;
    average_salary: number;
  };
  age_pyramid: AgePyramidEntry[];
  salary_distribution: SalaryDistributionEntry[];
  department_headcount: DepartmentHeadcountEntry[];
  leave_summary: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  attendance_summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
  };
  churn_summary: {
    high: number;
    medium: number;
    low: number;
    unscored: number;
  };
  monthly_headcount: {
    month: string;
    new_hires: number;
  }[];
}

export const analyticsService = {
  getOverview: async (): Promise<HRAnalyticsOverview> => {
    const { data } = await api.get('/stats/overview/');
    return data;
  },
};
