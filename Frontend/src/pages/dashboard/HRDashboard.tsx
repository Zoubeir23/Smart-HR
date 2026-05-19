import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  Briefcase,
  Clock,
  AlertTriangle,
  FileText,
  ArrowRight,
  Plus,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  Activity,
  UserCheck,
  Sparkles,
  ChevronRight,
  BarChart3,
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
import { useToast } from '@/hooks/use-toast';
import { Employee, LeaveRequest, DashboardStats } from '@/types';
import { employeeService } from '@/services/employeeService';
import { leaveService } from '@/services/leaveService';
import { recruitmentService } from '@/services/recruitmentService';

/* ─────────── Helpers ─────────── */

const leaveTypeLabels: Record<string, string> = {
  vacation: 'Vacances',
  sick: 'Maladie',
  personal: 'Personnel',
  maternity: 'Maternité',
  other: 'Autre',
};

const leaveTypeIcons: Record<string, string> = {
  vacation: '🏖️',
  sick: '🤒',
  personal: '👤',
  maternity: '👶',
  other: '📋',
};

function formatLeaveDate(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (start === end) return startDate.toLocaleDateString('fr-FR', options);
  return `${startDate.toLocaleDateString('fr-FR', options)} — ${endDate.toLocaleDateString('fr-FR', options)}`;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins}min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

/* ─────────── Animated Counter ─────────── */

function AnimatedValue({ value, suffix = '' }: { value: number; suffix?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {value}{suffix}
    </motion.span>
  );
}

/* ─────────── Risk Distribution Mini-Bar ─────────── */

function RiskDistributionBar({ stats }: { stats: DashboardStats }) {
  const total = stats.total_employees || 1;
  const high = stats.churn_risk_high ?? 0;
  // Estimate medium ~20%, rest is low
  const medium = Math.round(total * 0.2);
  const low = total - high - medium;
  const pctLow = Math.round((low / total) * 100);
  const pctMed = Math.round((medium / total) * 100);
  const pctHigh = Math.round((high / total) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>Distribution du risque</span>
        <span>{total} employés analysés</span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pctLow}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="bg-success"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pctMed}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          className="bg-warning"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pctHigh}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className="bg-destructive"
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-success" />
          <span className="text-muted-foreground">Faible {pctLow}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-warning" />
          <span className="text-muted-foreground">Modéré {pctMed}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-destructive" />
          <span className="text-muted-foreground">Élevé {pctHigh}%</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Quick-Action Pill ─────────── */

function QuickAction({ icon: Icon, label, href, color }: { icon: React.ElementType; label: string; href: string; color?: string }) {
  return (
    <Link to={href}>
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium shadow-sm transition-all hover:shadow-md hover:border-primary/20"
      >
        <div className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
          color ?? 'bg-primary/8 group-hover:bg-primary/12'
        )}>
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className="truncate text-sm">{label}</span>
        <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
      </motion.div>
    </Link>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */

export default function HRDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);

  // ─── Data Fetching ─────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['employee-stats'],
    queryFn: employeeService.getStats,
  });

  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll(),
  });

  const { data: leavesData, isLoading: leavesLoading } = useQuery({
    queryKey: ['leaves', 'pending'],
    queryFn: () => leaveService.getAll({ status: 'pending' }),
  });

  const { data: applicationsData, isLoading: applicationsLoading } = useQuery({
    queryKey: ['applications-recent', minScoreFilter],
    queryFn: () => recruitmentService.getApplications(
      minScoreFilter > 0
        ? { min_score: minScoreFilter, ordering: '-matching_score' }
        : { ordering: '-matching_score' }
    ),
  });

  const handleMinScoreChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMinScoreFilter(Number(e.target.value));
  }, []);

  const { data: retentionRaw } = useQuery({
    queryKey: ['retention-stats'],
    queryFn: () => employeeService.getRetentionStats(),
  });

  const retentionData = retentionRaw?.retention_stats?.map(
    (entry: { month: string; new_hires: number }) => ({
      month: new Date(entry.month + '-01').toLocaleDateString('fr-FR', { month: 'short' }),
      retention: Math.max(0, 100 - entry.new_hires),
      turnover: entry.new_hires,
    }),
  );

  // ─── Mutations ─────────────────────────
  const approveLeaveMutation = useMutation({
    mutationFn: (id: number) => leaveService.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['employee-stats'] });
      toast({ title: 'Congé approuvé', description: 'La demande de congé a été approuvée avec succès.' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible d'approuver le congé. Veuillez réessayer.", variant: 'destructive' });
    },
  });

  const rejectLeaveMutation = useMutation({
    mutationFn: (id: number) => leaveService.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['employee-stats'] });
      toast({ title: 'Congé refusé', description: 'La demande de congé a été refusée.' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de refuser le congé. Veuillez réessayer.', variant: 'destructive' });
    },
  });

  // ─── Derived Data ──────────────────────
  const employees: Employee[] = useMemo(() => employeesData?.results ?? employeesData ?? [], [employeesData]);
  const pendingLeaves: LeaveRequest[] = useMemo(() => leavesData?.results ?? leavesData ?? [], [leavesData]);
  const applications = useMemo(() => applicationsData?.results ?? applicationsData ?? [], [applicationsData]);

  const atRiskEmployees = useMemo(
    () =>
      [...employees]
        .filter((e: Employee) => e.churn_risk != null)
        .sort((a: Employee, b: Employee) => (b.churn_risk ?? 0) - (a.churn_risk ?? 0))
        .slice(0, 4),
    [employees]
  );

  // ─── Animation Variants ────────────────
  const container = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  };

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="visible" className="space-y-4 sm:space-y-5 md:space-y-6">

        {/* ────── HEADER BANNER ────── */}
        <motion.div
          variants={item}
          className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#1a0505] via-[#3d0b0b] to-[#6b1010] px-6 py-5 sm:px-8 sm:py-6"
        >
          {/* Geometric background pattern */}
          <div className="absolute inset-0 opacity-[0.04] bg-[image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] bg-[size:40px_40px]" />
          {/* Glow orbs */}
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl bg-brand-red/25" />
          <div className="absolute bottom-0 left-1/3 h-28 w-28 rounded-full blur-3xl bg-amber-400/10" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/50 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {today}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                {getGreeting()},{' '}
                <span className="bg-gradient-to-r from-[#fecaca] to-[#fbbf24] bg-clip-text text-transparent">
                  {user?.first_name}
                </span>{' '}
                👋
              </h1>
              <p className="text-xs sm:text-sm text-white/40">
                Voici un résumé de l'activité RH de votre organisation
              </p>
            </div>
            {(user?.role === 'RH' || user?.role === 'ADMIN') && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs h-9 border-white/15 bg-white/[0.07] text-white/70 hover:bg-white/15 hover:text-white backdrop-blur-sm"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Exporter
                </Button>
                <Link to="/employees/create">
                  <Button
                    size="sm"
                    className="gap-2 text-xs h-9 bg-white text-brand-red-dark font-bold hover:bg-white/90 shadow-lg"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nouvel employé
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* ────── KPI CARDS ────── */}
        <motion.div variants={item} className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[110px] sm:h-[130px] w-full rounded-lg" />
            ))
          ) : (
            <>
              <KPICard
                title="Total Employés"
                value={stats?.total_employees ?? 0}
                change={{ value: 3.2, type: 'increase' }}
                icon={Users}
                description={`${stats?.active_employees ?? 0} actifs`}
                color="indigo"
              />
              <KPICard
                title="Congés en attente"
                value={stats?.pending_leaves ?? 0}
                icon={Calendar}
                description="À valider"
                color="amber"
              />
              <KPICard
                title="Postes ouverts"
                value={stats?.open_positions ?? 0}
                change={{ value: 2, type: 'increase' }}
                icon={Briefcase}
                description={`${stats?.new_applications ?? 0} candidatures`}
                color="emerald"
              />
              <KPICard
                title="Risque élevé"
                value={stats?.churn_risk_high ?? 0}
                change={{ value: 8, type: 'decrease' }}
                icon={AlertTriangle}
                description="Employés à surveiller"
                color="rose"
              />
            </>
          )}
        </motion.div>

        {/* ────── QUICK ACTIONS (RH/Admin only) ────── */}
        {(user?.role === 'RH' || user?.role === 'ADMIN') && (
          <motion.div variants={item} className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-4">
            <QuickAction icon={Users} label="Gérer les employés" href="/employees" />
            <QuickAction icon={BarChart3} label="Analyse Churn IA" href="/ai-insights" />
            <QuickAction icon={Briefcase} label="Recrutement" href="/jobs" />
            <QuickAction icon={Sparkles} label="Chat IA" href="/ai-chat" />
          </motion.div>
        )}

        {/* ────── CHARTS ROW ────── */}
        <motion.div variants={item} className="grid gap-6 lg:grid-cols-3">
          {/* Retention Chart — spans 2 cols */}
          <div className="lg:col-span-2">
            <RetentionChart data={retentionData} />
          </div>

          {/* Churn Gauge Card */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Risque de turnover</CardTitle>
                <Link to="/ai-insights">
                  <Badge variant="outline" className="cursor-pointer gap-1 text-xs font-normal hover:bg-muted">
                    <Activity className="h-3 w-3" />
                    Détails
                  </Badge>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col items-center justify-center gap-4">
              {statsLoading ? (
                <Skeleton className="h-40 w-40 rounded-full" />
              ) : (
                <>
                  <ChurnGauge value={stats?.churn_risk_high ?? 0} size="lg" />
                  {stats && <RiskDistributionBar stats={stats} />}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ────── BOTTOM ROW: At-Risk + Leaves + Activity ────── */}
        <motion.div variants={item} className="grid gap-4 sm:gap-5 md:gap-6 lg:grid-cols-5">

          {/* ── Employees at Risk (3/5 width) ── */}
          <Card className="lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between pb-3 sm:pb-4 p-3 sm:p-4">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 flex-shrink-0">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm sm:text-base font-semibold truncate">Employés à risque</CardTitle>
                  <p className="text-xs text-muted-foreground truncate">Risque de départ le plus élevé</p>
                </div>
              </div>
              <Link to="/ai-insights">
                <Button variant="ghost" size="sm" className="gap-1 text-secondary text-xs sm:text-sm h-8 sm:h-9 flex-shrink-0">
                  Voir tout
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                {employeesLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-[160px] sm:h-[180px] w-full rounded-lg" />
                  ))
                ) : atRiskEmployees.length > 0 ? (
                  atRiskEmployees.map((employee: Employee) => (
                    <EmployeeCard key={employee.id} employee={employee} />
                  ))
                ) : (
                  <div className="col-span-1 sm:col-span-2 flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                    <div className="mb-2 sm:mb-3 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-success/10">
                      <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
                    </div>
                    <p className="font-medium text-sm sm:text-base">Aucun employé à risque</p>
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Tous les indicateurs sont au vert</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Right Column: Pending Leaves + Activity (2/5 width) ── */}
          <div className="space-y-4 sm:space-y-5 md:space-y-6 lg:col-span-2">

            {/* Pending Leaves */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 p-3 sm:p-4">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 flex-shrink-0">
                    <Calendar className="h-4 w-4 text-secondary" />
                  </div>
                  <CardTitle className="text-sm sm:text-base font-semibold truncate">Congés en attente</CardTitle>
                </div>
                <Badge
                  variant="secondary"
                  className="tabular-nums text-xs sm:text-sm flex-shrink-0"
                >
                  {pendingLeaves.length}
                </Badge>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 space-y-1.5 sm:space-y-2">
                {leavesLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 sm:h-16 w-full rounded-lg" />
                  ))
                ) : pendingLeaves.length > 0 ? (
                  <AnimatePresence mode="popLayout">
                    {pendingLeaves.slice(0, 4).map((leave: LeaveRequest) => (
                      <motion.div
                        key={leave.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, height: 0 }}
                        className="group flex items-center justify-between rounded-lg border border-transparent bg-muted/40 p-2 sm:p-3 transition-colors hover:border-border hover:bg-muted/60"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                          <span className="text-base sm:text-lg leading-none flex-shrink-0">{leaveTypeIcons[leave.type] ?? '📋'}</span>
                          <div className="min-w-0">
                            <p className="truncate text-xs sm:text-sm font-medium">
                              {leave.employee?.user?.first_name} {leave.employee?.user?.last_name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {leaveTypeLabels[leave.type] ?? leave.type} · {formatLeaveDate(leave.start_date, leave.end_date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-0.5 sm:gap-1.5 opacity-80 transition-opacity group-hover:opacity-100">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 sm:h-7 sm:w-7 text-destructive hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                            onClick={() => rejectLeaveMutation.mutate(leave.id)}
                            disabled={rejectLeaveMutation.isPending}
                          >
                            <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 sm:h-7 sm:w-7 text-success hover:bg-success/10 hover:text-success flex-shrink-0"
                            onClick={() => approveLeaveMutation.mutate(leave.id)}
                            disabled={approveLeaveMutation.isPending}
                          >
                            <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                ) : (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Calendar className="mb-2 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Aucun congé en attente</p>
                  </div>
                )}
                {pendingLeaves.length > 4 && (
                  <Link to="/leaves" className="block">
                    <Button variant="ghost" size="sm" className="mt-1 w-full gap-1 text-xs">
                      Voir les {pendingLeaves.length - 4} autres
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity Feed */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10">
                      <Clock className="h-4 w-4 text-secondary" />
                    </div>
                    <CardTitle className="text-base font-semibold">Candidatures</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Score min :</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={minScoreFilter}
                      onChange={handleMinScoreChange}
                      className="w-24 accent-primary"
                      aria-label="Score minimum de matching"
                    />
                    <span className="w-8 font-medium tabular-nums text-foreground">
                      {minScoreFilter > 0 ? `≥${minScoreFilter}%` : 'Tous'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {applicationsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-lg" />
                    ))}
                  </div>
                ) : applications.length > 0 ? (
                  <div className="relative space-y-0">
                    {/* Vertical timeline line */}
                    <div className="absolute bottom-2 left-[15px] top-2 w-px bg-border" />

                    {applications.slice(0, 5).map((application: { id: number; job_offer: { title: string }; candidate: { first_name: string; last_name: string }; created_at: string; matching_score?: number }) => (
                      <div key={application.id} className="relative flex gap-3 py-2.5">
                        <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-background bg-secondary/10">
                          <Briefcase className="h-3.5 w-3.5 text-secondary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">
                              {application.candidate?.first_name} {application.candidate?.last_name}
                            </p>
                            {application.matching_score != null && (
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                application.matching_score >= 70
                                  ? 'bg-success/15 text-success'
                                  : application.matching_score >= 40
                                  ? 'bg-warning/15 text-warning'
                                  : 'bg-destructive/15 text-destructive'
                              }`}>
                                {Math.round(application.matching_score)}%
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {application.job_offer?.title ?? 'Poste'}
                          </p>
                          {application.created_at && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                              {formatRelativeTime(application.created_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Activity className="mb-2 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Aucune activité récente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
