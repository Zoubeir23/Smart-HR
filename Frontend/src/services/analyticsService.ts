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

export interface PerformanceDistributionEntry {
  label: string;
  count: number;
}

export interface RecruitmentFunnelEntry {
  status: string;
  label: string;
  count: number;
}

export interface DepartmentHierarchyEntry {
  id: number;
  name: string;
  parent_id: number | null;
  unit_type: string;
  employee_count: number;
}

export interface TrainingCostEntry {
  title: string;
  cost: number;
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
  training_summary: {
    total_formations: number;
    total_cost: number;
    average_cost: number;
    total_participations: number;
    completed_participations: number;
    completion_rate: number;
    available_courses: number;
    cost_breakdown: TrainingCostEntry[];
  };
  performance_summary: {
    evaluated_count: number;
    average_score: number;
    distribution: PerformanceDistributionEntry[];
  };
  recruitment_funnel: RecruitmentFunnelEntry[];
  engagement_summary: {
    responses_count: number;
    average_rating: number;
  };
  department_hierarchy: DepartmentHierarchyEntry[];
}

export type AnalyticsPeriod = '1m' | '3m' | '6m' | '1y';

export interface AnalyticsFilters {
  departmentId?: number | null;
  period?: AnalyticsPeriod;
}

function toQueryParams(filters?: AnalyticsFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters?.departmentId) params.department_id = String(filters.departmentId);
  if (filters?.period) params.period = filters.period;
  return params;
}

export const analyticsService = {
  getOverview: async (filters?: AnalyticsFilters): Promise<HRAnalyticsOverview> => {
    const { data } = await api.get('/stats/overview/', { params: toQueryParams(filters) });
    return data;
  },

  exportOverviewExcel: async (filters?: AnalyticsFilters): Promise<void> => {
    const response = await api.get('/stats/overview/export/', {
      params: toQueryParams(filters),
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'people_analytics.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
