import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Star,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { employeeService } from '@/services/employeeService';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Deterministic corporate avatar colors from name
const avatarColors = [
  'bg-blue-600',
  'bg-indigo-600',
  'bg-teal-600',
  'bg-emerald-600',
  'bg-sky-600',
  'bg-slate-600',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

const statusStyles = {
  active: 'bg-success/20 text-success border-success/30',
  inactive: 'bg-destructive/20 text-destructive border-destructive/30',
  on_leave: 'bg-warning/20 text-warning border-warning/30',
};

const statusLabels = {
  active: 'Actif',
  inactive: 'Inactif',
  on_leave: 'En congé',
};

const leaveStatusStyles: Record<string, string> = {
  approved: 'bg-success/20 text-success border-success/30',
  pending: 'bg-warning/20 text-warning border-warning/30',
  rejected: 'bg-destructive/20 text-destructive border-destructive/30',
};

const leaveStatusLabels: Record<string, string> = {
  approved: 'Approuvé',
  pending: 'En attente',
  rejected: 'Refusé',
};

function getRiskLevel(score: number) {
  if (score < 30) return { label: 'Faible', color: 'text-success', bgColor: 'bg-success' };
  if (score < 60) return { label: 'Modéré', color: 'text-warning', bgColor: 'bg-warning' };
  return { label: 'Élevé', color: 'text-destructive', bgColor: 'bg-destructive' };
}

export default function EmployeeDetailPage() {
  const { id } = useParams();

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeeService.getById(Number(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Chargement du profil...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!employee) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <h2 className="text-2xl font-bold text-foreground">Employé introuvable</h2>
          <p className="mt-2 text-muted-foreground">
            L'employé avec l'identifiant #{id} n'existe pas.
          </p>
          <Link to="/employees">
            <Button className="mt-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux employés
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const fullName = `${employee?.user?.first_name ?? ''} ${employee?.user?.last_name ?? ''}`.trim();
  const avatarBg = getAvatarColor(`${employee?.user?.first_name ?? ''}${employee?.user?.last_name ?? ''}`);
  const risk = getRiskLevel(employee?.churn_risk ?? 0);
  const evaluations: { year: number; score: number; comment: string }[] = employee?.evaluations ?? [];
  const leaves: { balance: number; history: { type: string; start: string; end: string; status: string }[] } = employee?.leaves ?? { balance: 0, history: [] };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Back button + Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/employees">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux employés
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Modifier
            </Button>
            <Button variant="destructive" size="sm">
              Désactiver
            </Button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Profile Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border border-border shadow-sm">
              <CardContent className="flex flex-col items-center p-6">
                {/* Large Avatar */}
                <div
                  className={cn(
                    'flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white',
                    avatarBg
                  )}
                >
                  {employee?.user?.first_name?.[0] ?? ''}
                  {employee?.user?.last_name?.[0] ?? ''}
                </div>

                {/* Name and Position */}
                <h2 className="mt-4 text-xl font-bold text-foreground">{fullName}</h2>
                <p className="text-sm text-muted-foreground">{employee?.position_title ?? 'Non disponible'}</p>
                <p className="text-sm text-muted-foreground">{employee?.department_name ?? 'Non disponible'}</p>

                {/* Status Badge */}
                <Badge
                  variant="outline"
                  className={cn('mt-3', statusStyles[employee?.status as keyof typeof statusStyles] ?? statusStyles.active)}
                >
                  {statusLabels[employee?.status as keyof typeof statusLabels] ?? 'Inconnu'}
                </Badge>

                {/* Contact Info */}
                <div className="mt-6 w-full space-y-3 border-t border-border pt-6">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate text-foreground">{employee?.user?.email ?? 'Non disponible'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{employee?.user?.tel ?? 'Non disponible'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{employee?.address ?? employee?.department_name ?? 'Non disponible'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      Embauché le {employee?.hire_date ? new Date(employee.hire_date).toLocaleDateString('fr-FR') : 'Non disponible'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Contract Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Informations du contrat
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Type de contrat</p>
                      <p className="mt-1 font-semibold text-foreground">Non disponible</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Salaire annuel</p>
                      <p className="mt-1 font-semibold text-foreground">
                        {employee?.salary != null ? Number(employee.salary).toLocaleString('fr-FR') : '—'} FCFA
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Date d'embauche</p>
                      <p className="mt-1 font-semibold text-foreground">
                        {employee?.hire_date ? new Date(employee.hire_date).toLocaleDateString('fr-FR') : 'Non disponible'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Manager</p>
                      <p className="mt-1 font-semibold text-foreground">Non disponible</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Performance */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Star className="h-5 w-5 text-primary" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {evaluations.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">Non disponible</p>
                  )}
                  {evaluations.map((evaluation) => (
                    <div
                      key={evaluation.year}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-foreground">{evaluation.year}</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={cn(
                                  'h-4 w-4',
                                  star <= Math.round(evaluation.score)
                                    ? 'fill-warning text-warning'
                                    : 'text-muted-foreground'
                                )}
                              />
                            ))}
                            <span className="ml-2 text-sm font-medium text-foreground">
                              {evaluation.score}/5
                            </span>
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{evaluation.comment}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Leaves */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    Congés
                  </CardTitle>
                  <Badge variant="secondary">{leaves.balance} jours restants</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {leaves.history.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">Non disponible</p>
                  )}
                  {leaves.history.map((leave, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                    >
                      <div>
                        <p className="font-medium text-foreground">{leave.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(leave.start).toLocaleDateString('fr-FR')} -{' '}
                          {new Date(leave.end).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <Badge variant="outline" className={leaveStatusStyles[leave.status]}>
                        {leaveStatusLabels[leave.status]}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Churn Risk */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertTriangle className="h-5 w-5 text-primary" />
                    Risque de départ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
                    {/* Score display */}
                    <div className="flex flex-col items-center">
                      <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-muted">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.7, duration: 0.3 }}
                        >
                          <span className={cn('text-3xl font-bold', risk.color)}>
                            {employee?.churn_risk ?? 0}%
                          </span>
                        </motion.div>
                      </div>
                      <span className={cn('mt-2 text-sm font-medium', risk.color)}>
                        Risque {risk.label}
                      </span>
                    </div>

                    {/* Risk bar and details */}
                    <div className="flex-1 space-y-4">
                      {/* Progress bar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Score de risque</span>
                          <span className={cn('font-medium', risk.color)}>
                            {employee?.churn_risk ?? 0}%
                          </span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${employee?.churn_risk ?? 0}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.6 }}
                            className={cn('h-full rounded-full', risk.bgColor)}
                          />
                        </div>
                      </div>

                      {/* Main reason */}
                      <div className="rounded-lg border border-border bg-muted/50 p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={cn('mt-0.5 h-4 w-4', risk.color)} />
                          <div>
                            <p className="text-sm font-medium text-foreground">Raison principale</p>
                            <p className="text-sm text-muted-foreground">
                              {employee?.churn_main_reason ?? 'Non disponible'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
