import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  ClipboardList,
  CreditCard,
  GraduationCap,
  Clock,
  ArrowRight,
  Plus,
  FileText,
  Download
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { employeeService } from '@/services/employeeService';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut'
    }
  }
};

const quickActions = [
  {
    title: 'Demander un congé',
    icon: Plus,
    color: 'bg-blue-500 hover:bg-blue-600',
    href: '/leaves/request'
  },
  {
    title: 'Voir ma fiche de paie',
    icon: Download,
    color: 'bg-green-500 hover:bg-green-600',
    href: '/payroll'
  },
  {
    title: 'Mes documents',
    icon: FileText,
    color: 'bg-purple-500 hover:bg-purple-600',
    href: '/documents'
  }
];

const getStatusVariant = (statusColor: string) => {
  switch (statusColor) {
    case 'success':
      return 'default';
    case 'warning':
      return 'secondary';
    default:
      return 'outline';
  }
};

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { data: myProfile, isLoading } = useQuery({ queryKey: ['my-profile'], queryFn: employeeService.getMe });

  const profile = myProfile || {};
  const tasks = profile.tasks || [];
  const leaves = profile.leaves || [];

  const kpiCards = [
    {
      title: 'Solde Congés',
      value: profile.solde_conges != null ? `${profile.solde_conges} jours` : '--',
      icon: Calendar,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30'
    },
    {
      title: 'Tâches en cours',
      value: profile.tasks_in_progress != null ? String(profile.tasks_in_progress) : '--',
      icon: ClipboardList,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30'
    },
    {
      title: 'Prochaine Formation',
      value: profile.next_formation || '--',
      icon: GraduationCap,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/30'
    },
    {
      title: 'Prochain Paiement',
      value: profile.next_payment || '--',
      icon: CreditCard,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30'
    }
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl font-bold text-foreground">
            Bonjour, {user?.first_name || 'Employé'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Voici un aperçu de votre espace personnel
          </p>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiCards.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <motion.div key={index} variants={itemVariants}>
                <Card className="hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {kpi.title}
                        </p>
                        <h3 className="text-2xl font-bold text-foreground mt-2">
                          {kpi.value}
                        </h3>
                      </div>
                      <div className={`${kpi.bgColor} p-3 rounded-full`}>
                        <Icon className={`w-6 h-6 ${kpi.color}`} />
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
              <CardTitle className="text-foreground">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={index}
                      className={`${action.color} text-white h-auto py-4 flex items-center justify-between group transition-all duration-300`}
                      onClick={() => {
                        // Navigation logic would go here
                        console.log(`Navigate to ${action.href}`);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{action.title}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tasks and Leaves Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Tasks */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Mes Tâches
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-primary">
                  Voir tout
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start justify-between p-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={getStatusVariant(task.statusColor)}>
                            {task.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.dueDate}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Leaves */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Congés Récents
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-primary">
                  Voir tout
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaves.map((leave) => (
                    <div
                      key={leave.id}
                      className="flex items-start justify-between p-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-foreground">
                            {leave.type}
                          </h4>
                          <Badge variant={getStatusVariant(leave.statusColor)}>
                            {leave.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            {leave.startDate} - {leave.endDate}
                          </p>
                          <p className="font-medium">{leave.duration}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
