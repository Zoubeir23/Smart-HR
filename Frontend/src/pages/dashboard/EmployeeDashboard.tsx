import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  ClipboardList,
  CreditCard,
  GraduationCap,
  Clock,
  ArrowRight,
  FileText,
  Download,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { employeeService } from '@/services/employeeService';
import { leaveService } from '@/services/leaveService';
import { taskService } from '@/services/taskService';
import { payrollService } from '@/services/payrollService';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  vacation: 'Congé annuel',
  sick: 'Congé maladie',
  personal: 'Congé personnel',
  maternity: 'Congé maternité',
  other: 'Autre',
};

const LEAVE_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  approved: 'default',
  pending: 'secondary',
  rejected: 'destructive',
};

const LEAVE_STATUS_LABELS: Record<string, string> = {
  approved: 'Approuvé',
  pending: 'En attente',
  rejected: 'Refusé',
};

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  in_review: 'En revue',
  done: 'Terminée',
};

const TASK_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  done: 'default',
  in_progress: 'secondary',
  in_review: 'outline',
  todo: 'outline',
};

const quickActions = [
  { title: 'Demander un congé', icon: Plus, href: '/leaves', color: 'bg-blue-500 hover:bg-blue-600' },
  { title: 'Voir ma fiche de paie', icon: Download, href: '/payroll', color: 'bg-green-500 hover:bg-green-600' },
  { title: 'Mes documents', icon: FileText, href: '/documents', color: 'bg-purple-500 hover:bg-purple-600' },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

export default function EmployeeDashboard() {
  const { user } = useAuth();

  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: employeeService.getMe,
  });

  const { data: tasksData } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => taskService.getAll(),
    enabled: !!profileData,
  });

  const { data: leavesData } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: () => leaveService.getAll(),
    enabled: !!profileData,
  });

  const { data: payrollData } = useQuery({
    queryKey: ['my-payroll'],
    queryFn: () => payrollService.getAll(),
    enabled: !!profileData,
  });

  const tasks = tasksData?.results ?? tasksData ?? [];
  const leaves = leavesData?.results ?? leavesData ?? [];
  const payrolls = payrollData?.results ?? payrollData ?? [];

  const activeTasks = tasks.filter(
    (t: { status: string }) => t.status === 'in_progress' || t.status === 'in_review',
  );
  const pendingLeaves = leaves.filter((l: { status: string }) => l.status === 'pending');
  const latestPayroll = payrolls.length > 0 ? payrolls[0] : null;

  const kpiCards = [
    {
      title: 'Congés en attente',
      value: pendingLeaves.length > 0 ? `${pendingLeaves.length} demande(s)` : 'Aucune',
      icon: Calendar,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      title: 'Tâches actives',
      value: activeTasks.length > 0 ? `${activeTasks.length} tâche(s)` : 'Aucune',
      icon: ClipboardList,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      title: 'Prochain paiement',
      value: latestPayroll
        ? new Intl.NumberFormat('fr-FR').format(Number(latestPayroll.net_salary)) + ' FCFA'
        : '--',
      icon: CreditCard,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    },
    {
      title: 'Statut',
      value: profileData?.status === 'active' ? 'Actif' : profileData?.status === 'on_leave' ? 'En congé' : '--',
      icon: GraduationCap,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
    },
  ];

  if (isProfileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Chargement…</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Mobile-first spacing: small gaps on mobile, larger on desktop */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header - Responsive typography */}
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Bonjour, {user?.first_name || 'Employé'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {profileData?.position_title
              ? `${profileData.position_title} · ${profileData.department_name ?? ''}`
              : 'Voici un aperçu de votre espace personnel'}
          </p>
        </motion.div>

        {/* KPI Cards - Responsive grid: 1col on mobile, 2col on tablet, 4col on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <motion.div key={kpi.title} variants={itemVariants}>
                <Card className="hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{kpi.title}</p>
                        <h3 className="text-lg sm:text-xl font-bold text-foreground mt-2 truncate">{kpi.value}</h3>
                      </div>
                      <div className={`${kpi.bgColor} p-2 sm:p-3 rounded-full flex-shrink-0`}>
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 ${kpi.color}" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg text-foreground">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mobile-first: stack on mobile, 3 columns on tablet+, with responsive gaps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.title}
                      asChild
                      className={`${action.color} text-white h-auto py-3 sm:py-4 px-3 sm:px-4 flex items-center justify-between group transition-all duration-300 text-sm sm:text-base`}
                    >
                      <Link to={action.href}>
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                          <span className="font-medium truncate text-xs sm:text-sm">{action.title}</span>
                        </div>
                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform flex-shrink-0 ml-2" />
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tasks and Leaves Grid - Responsive: 1 column on mobile, 2 on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
          {/* My Tasks */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                <CardTitle className="text-base sm:text-lg text-foreground flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
                  Mes Tâches
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="text-primary text-xs sm:text-sm">
                  <Link to="/tasks" className="gap-1">
                    Voir tout
                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <p className="text-xs sm:text-sm text-muted-foreground text-center py-6">Aucune tâche assignée</p>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {tasks.slice(0, 4).map((task: { id: number; title: string; status: string; due_date?: string }) => (
                      <div
                        key={task.id}
                        className="flex items-start justify-between p-3 sm:p-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow duration-200 gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm sm:text-base text-foreground truncate">{task.title}</h4>
                          <div className="flex items-center gap-2 mt-1 sm:mt-2 flex-wrap">
                            <Badge variant={TASK_STATUS_VARIANT[task.status] ?? 'outline'} className="text-xs">
                              {TASK_STATUS_LABELS[task.status] ?? task.status}
                            </Badge>
                            {task.due_date && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                                <Clock className="w-3 h-3" />
                                {new Date(task.due_date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Leaves */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                <CardTitle className="text-base sm:text-lg text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  Congés Récents
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="text-primary text-xs sm:text-sm">
                  <Link to="/leaves" className="gap-1">
                    Voir tout
                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {leaves.length === 0 ? (
                  <p className="text-xs sm:text-sm text-muted-foreground text-center py-6">Aucune demande de congé</p>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {leaves.slice(0, 4).map(
                      (leave: {
                        id: number;
                        leave_type: string;
                        status: string;
                        start_date: string;
                        end_date: string;
                        duration_days: number;
                      }) => (
                        <div
                          key={leave.id}
                          className="flex items-start justify-between p-3 sm:p-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow duration-200 gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1 sm:mb-2 gap-2">
                              <h4 className="font-medium text-sm sm:text-base text-foreground truncate">
                                {LEAVE_TYPE_LABELS[leave.leave_type] ?? leave.leave_type}
                              </h4>
                              <Badge variant={LEAVE_STATUS_VARIANT[leave.status] ?? 'outline'} className="text-xs flex-shrink-0">
                                {LEAVE_STATUS_LABELS[leave.status] ?? leave.status}
                              </Badge>
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground space-y-0.5 sm:space-y-1">
                              <p className="truncate">
                                {new Date(leave.start_date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })} -{' '}
                                {new Date(leave.end_date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                              </p>
                              <p className="font-medium">{leave.duration_days} jour(s)</p>
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
