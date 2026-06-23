// Types pour Smart-HR

export const USER_ROLES = ['ADMIN', 'RH', 'EMPLOYEE', 'CANDIDATE'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  tel?: string;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Employee {
  id: number;
  user: User;
  // FK ids (write)
  department: number | null;
  position: number | null;
  // Computed labels (read)
  department_name?: string;
  position_title?: string;
  user_email?: string;
  user_full_name?: string;
  hire_date: string;
  salary: number;
  status: 'active' | 'inactive' | 'on_leave';
  date_of_birth?: string;
  cin?: string;
  address?: string;
  emergency_contact?: string;
  churn_risk?: number;
}

export interface LeaveRequest {
  id: number;
  employee: Employee;
  type: 'vacation' | 'sick' | 'personal' | 'maternity' | 'other';
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  created_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  assignee: Employee;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  created_at: string;
}

export interface Attendance {
  id: number;
  employee: Employee;
  date: string;
  check_in: string;
  check_out?: string;
  status: 'present' | 'absent' | 'late' | 'half_day';
}

export interface Payroll {
  id: number;
  employee: Employee;
  month: string;
  base_salary: number;
  bonuses: number;
  deductions: number;
  net_salary: number;
  status: 'pending' | 'processed' | 'paid';
}

export interface JobOffer {
  id: number;
  title: string;
  department: string;
  location: string;
  type: 'full_time' | 'part_time' | 'contract' | 'internship';
  description: string;
  requirements: string[];
  salary_range?: string;
  status: 'open' | 'closed';
  created_at: string;
  applications_count: number;
}

export interface Application {
  id: number;
  job_offer: JobOffer;
  candidate: User;
  cv_url: string;
  cover_letter?: string;
  status: 'pending' | 'reviewing' | 'interview' | 'accepted' | 'rejected';
  matching_score?: number;
  created_at: string;
}

export interface DashboardStats {
  total_employees: number;
  active_employees: number;
  pending_leaves: number;
  open_positions: number;
  attendance_rate: number;
  churn_risk_high: number;
  new_applications: number;
  payroll_pending: number;
}

export interface ChurnPrediction {
  employee_id: number;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  factors: string[];
  recommendations: string[];
}

// Navigation items type
export interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  badge?: number;
  children?: NavItem[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}
