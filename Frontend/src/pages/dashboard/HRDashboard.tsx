import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  Calendar,
  Briefcase,
  Clock,
  AlertTriangle,
  FileText,
  TrendingUp,
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
import { Employee } from '@/types';

// Données de démo
const mockStats = {
  total_employees: 156,
  active_employees: 142,
  pending_leaves: 8,
  open_positions: 5,
  attendance_rate: 94.5,
  churn_risk_high: 12,
  new_applications: 23,
  payroll_pending: 3,
};

const mockEmployees: Employee[] = [
  {
    id: 1,
    user: { id: 1, email: 'amadou.sow@company.com', first_name: 'Amadou', last_name: 'Sow', role: 'EMPLOYEE' },
    department: 'Développement',
    position: 'Développeur Senior',
    hire_date: '2022-03-15',
    salary: 85000,
    status: 'active',
    phone: '+221 77 123 45 67',
    churn_risk: 72,
  },
  {
    id: 2,
    user: { id: 2, email: 'fatou.ndiaye@company.com', first_name: 'Fatou', last_name: 'Ndiaye', role: 'EMPLOYEE' },
    department: 'Marketing',
    position: 'Chef de projet',
    hire_date: '2021-08-20',
    salary: 65000,
    status: 'active',
    phone: '+221 78 234 56 78',
    churn_risk: 25,
  },
  {
    id: 3,
    user: { id: 3, email: 'moussa.diop@company.com', first_name: 'Moussa', last_name: 'Diop', role: 'EMPLOYEE' },
    department: 'Commercial',
    position: 'Commercial',
    hire_date: '2023-01-10',
    salary: 55000,
    status: 'on_leave',
    phone: '+221 76 345 67 89',
    churn_risk: 45,
  },
  {
    id: 4,
    user: { id: 4, email: 'aissatou.ba@company.com', first_name: 'Aïssatou', last_name: 'Ba', role: 'EMPLOYEE' },
    department: 'Finance',
    position: 'Comptable',
    hire_date: '2020-11-05',
    salary: 60000,
    status: 'active',
    phone: '+221 70 456 78 90',
    churn_risk: 15,
  },
];

const pendingLeaves = [
  { id: 1, employee: 'Amadou Sow', type: 'Vacances', dates: '15-22 Jan 2024', status: 'pending' },
  { id: 2, employee: 'Fatou Ndiaye', type: 'Maladie', dates: '18-19 Jan 2024', status: 'pending' },
  { id: 3, employee: 'Moussa Diop', type: 'Personnel', dates: '25 Jan 2024', status: 'pending' },
];

const recentActivities = [
  { id: 1, action: 'Nouvelle candidature', details: 'Développeur Frontend - Ibrahima Fall', time: 'Il y a 2h' },
  { id: 2, action: 'Congé approuvé', details: 'Fatou Ndiaye - 3 jours', time: 'Il y a 4h' },
  { id: 3, action: 'Nouveau employé', details: 'Ousmane Diallo a rejoint l\'équipe', time: 'Il y a 1 jour' },
  { id: 4, action: 'Formation terminée', details: 'Sécurité informatique - 12 participants', time: 'Il y a 2 jours' },
];

export default function HRDashboard() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

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
          <KPICard
            title="Total Employés"
            value={mockStats.total_employees}
            change={{ value: 3.2, type: 'increase' }}
            icon={Users}
            description={`${mockStats.active_employees} actifs`}
          />
          <KPICard
            title="Congés en attente"
            value={mockStats.pending_leaves}
            icon={Calendar}
            description="À valider"
            variant="gradient"
          />
          <KPICard
            title="Postes ouverts"
            value={mockStats.open_positions}
            change={{ value: 2, type: 'increase' }}
            icon={Briefcase}
            description={`${mockStats.new_applications} candidatures`}
          />
          <KPICard
            title="Risque élevé"
            value={mockStats.churn_risk_high}
            change={{ value: 8, type: 'decrease' }}
            icon={AlertTriangle}
            description="Employés à surveiller"
          />
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
              {mockEmployees.slice(0, 4).map((employee) => (
                <EmployeeCard key={employee.id} employee={employee} />
              ))}
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
                {pendingLeaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{leave.employee}</p>
                        <p className="text-sm text-muted-foreground">
                          {leave.type} • {leave.dates}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-8">
                        Refuser
                      </Button>
                      <Button size="sm" className="h-8 bg-success hover:bg-success/90">
                        Approuver
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activités récentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="relative flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      {index < recentActivities.length - 1 && (
                        <div className="mt-2 h-full w-px bg-border" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.details}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
