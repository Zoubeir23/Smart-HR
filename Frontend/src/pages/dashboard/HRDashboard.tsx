import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Calendar,
  Briefcase,
  Clock,
  AlertTriangle,
  FileText,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KPICard from '@/components/charts/KPICard';
import RetentionChart from '@/components/charts/RetentionChart';
import ChurnGauge from '@/components/charts/ChurnGauge';
import EmployeeCard from '@/components/employees/EmployeeCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Employee, LeaveRequest, DashboardStats } from '@/types';
import { employeeService } from '@/services/employeeService';
import { leaveService } from '@/services/leaveService';
import { recruitmentService } from '@/services/recruitmentService';

const leaveTypeLabels: Record<string, string> = {
  vacation: 'Vacances',
  sick: 'Maladie',
  personal: 'Personnel',
  maternity: 'Maternité',
  other: 'Autre',
};

function formatLeaveDate(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  if (start === end) {
    return startDate.toLocaleDateString('fr-FR', options);
  }
  return `${startDate.toLocaleDateString('fr-FR', { day: 'numeric' })}-${endDate.toLocaleDateString('fr-FR', options)}`;
}

export default function HRDashboard() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['employee-stats'],
    queryFn: employeeService.getStats,
  });

  // Fetch employees (for "at risk" section)
  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll(),
  });

  // Fetch pending leaves
  const { data: leavesData, isLoading: leavesLoading } = useQuery({
    queryKey: ['leaves', 'pending'],
    queryFn: () => leaveService.getAll({ status: 'pending' }),
  });

  // Fetch recent applications (for activity feed)
  const { data: applicationsData, isLoading: applicationsLoading } = useQuery({
    queryKey: ['applications-recent'],
    queryFn: () => recruitmentService.getApplications(),
  });

  // Extract results from DRF paginated responses
  const employees: Employee[] = employeesData?.results ?? employeesData ?? [];
  const pendingLeaves: LeaveRequest[] = leavesData?.results ?? leavesData ?? [];
  const applications = applicationsData?.results ?? applicationsData ?? [];

  // Sort employees by churn risk descending to show highest risk first
  const atRiskEmployees = [...employees]
    .filter((e: Employee) => e.churn_risk != null)
    .sort((a: Employee, b: Employee) => (b.churn_risk ?? 0) - (a.churn_risk ?? 0))
    .slice(0, 4);

  const isLoading = statsLoading || employeesLoading || leavesLoading;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <DashboardLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Bonjour, {user?.first_name} 👋
            </h1>
            <p className="text-muted-foreground">
              Voici un aperçu de votre tableau de bord RH
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <FileText className="mr-2 h-4 w-4" />
              Exporter
            </Button>
            <Button size="sm" className="bg-gradient-primary hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              Nouvel employé
            </Button>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </>
          ) : (
            <>
              <KPICard
                title="Total Employés"
                value={stats?.total_employees ?? 0}
                change={{ value: 3.2, type: 'increase' }}
                icon={Users}
                description={`${stats?.active_employees ?? 0} actifs`}
              />
              <KPICard
                title="Congés en attente"
                value={stats?.pending_leaves ?? 0}
                icon={Calendar}
                description="À valider"
                variant="gradient"
              />
              <KPICard
                title="Postes ouverts"
                value={stats?.open_positions ?? 0}
                change={{ value: 2, type: 'increase' }}
                icon={Briefcase}
                description={`${stats?.new_applications ?? 0} candidatures`}
              />
              <KPICard
                title="Risque élevé"
                value={stats?.churn_risk_high ?? 0}
                change={{ value: 8, type: 'decrease' }}
                icon={AlertTriangle}
                description="Employés à surveiller"
              />
            </>
          )}
        </motion.div>

        {/* Charts Row */}
        <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RetentionChart />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Risque de turnover global</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <ChurnGauge value={28} size="lg" />
              <div className="mt-6 grid w-full grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <p className="text-2xl font-bold text-success">72%</p>
                  <p className="text-muted-foreground">Risque faible</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">16%</p>
                  <p className="text-muted-foreground">Risque modéré</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">12%</p>
                  <p className="text-muted-foreground">Risque élevé</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Employees at Risk & Pending Leaves */}
        <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-2">
          {/* Employees at Risk */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Employés à risque</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary">
                Voir tout
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {employeesLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))
              ) : atRiskEmployees.length > 0 ? (
                atRiskEmployees.map((employee: Employee) => (
                  <EmployeeCard key={employee.id} employee={employee} />
                ))
              ) : (
                <p className="col-span-2 text-center text-muted-foreground">Aucun employé à risque</p>
              )}
            </CardContent>
          </Card>

          {/* Pending Leaves & Recent Activities */}
          <div className="space-y-6">
            {/* Pending Leaves */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Congés en attente</CardTitle>
                <Badge variant="secondary">{pendingLeaves.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {leavesLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))
                ) : pendingLeaves.length > 0 ? (
                  pendingLeaves.slice(0, 5).map((leave: LeaveRequest) => (
                    <div
                      key={leave.id}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {leave.employee?.user?.first_name} {leave.employee?.user?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {leaveTypeLabels[leave.type] ?? leave.type} • {formatLeaveDate(leave.start_date, leave.end_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-8">
                          Refuser
                        </Button>
                        <Button size="sm" className="h-8">
                          Approuver
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground">Aucun conge en attente</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activités récentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {applicationsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))
                ) : applications.length > 0 ? (
                  applications.slice(0, 5).map((application: any, index: number) => (
                    <div key={application.id} className="flex gap-3">
                      <div className="relative flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                        {index < Math.min(applications.length, 5) - 1 && (
                          <div className="mt-2 h-full w-px bg-border" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium">Nouvelle candidature</p>
                        <p className="text-sm text-muted-foreground">
                          {application.job_offer?.title ?? 'Poste'} - {application.candidate?.first_name} {application.candidate?.last_name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {application.created_at
                            ? new Date(application.created_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : ''}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground">Aucune activite recente</p>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
