import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import ChurnGauge from '@/components/charts/ChurnGauge';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  X,
  Users,
  ShieldAlert,
  Activity,
  UserMinus,
  Search,
  ArrowUpDown,
  Eye,
  ChevronRight,
  BrainCircuit,
  Lightbulb,
  Target,
  RefreshCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { churnService } from '@/services/churnService';
import { cn } from '@/lib/utils';

/* ─── Types ─── */
type RiskLevel = 'low' | 'medium' | 'high';

interface NormalizedEmployee {
  id: string;
  name: string;
  initials: string;
  department: string;
  tenure: string;
  riskScore: number;
  riskLevel: RiskLevel;
  mainReason: string;
  riskFactors: Array<{ factor: string; impact: string }>;
  recommendations?: string[];
}

/* ─── Normalize API data (handles both snake_case and camelCase) ─── */
function normalizeEmployee(raw: any): NormalizedEmployee {
  const firstName = raw.employee?.user?.first_name || raw.first_name || '';
  const lastName = raw.employee?.user?.last_name || raw.last_name || '';
  const name = raw.name || `${firstName} ${lastName}`.trim() || 'Inconnu';
  const initials =
    raw.initials ||
    (firstName && lastName ? `${firstName[0]}${lastName[0]}` : name.slice(0, 2)).toUpperCase();

  const score = raw.riskScore ?? raw.risk_score ?? raw.score ?? 0;
  const level: RiskLevel =
    raw.riskLevel ?? raw.risk_level ?? (score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low');

  const dept =
    raw.department ??
    raw.employee?.department_name ??
    raw.employee?.department ??
    '—';

  const tenureVal = raw.tenure ?? (raw.years_at_company != null ? `${raw.years_at_company} ans` : '—');

  const factors = raw.riskFactors ?? raw.risk_factors ?? raw.factors ?? [];
  const normalizedFactors = Array.isArray(factors)
    ? factors.map((f: any) =>
        typeof f === 'string'
          ? { factor: f, impact: 'moyen' }
          : { factor: f.factor ?? f.name ?? String(f), impact: f.impact ?? f.level ?? 'moyen' }
      )
    : [];

  const reason =
    raw.mainReason ??
    raw.main_reason ??
    (normalizedFactors.length > 0 ? normalizedFactors[0].factor : 'Non déterminé');

  const rawRecs = raw.recommendations ?? (raw.recommendation ? [raw.recommendation] : []);

  return {
    id: String(raw.id ?? Math.random()),
    name,
    initials,
    department: dept,
    tenure: tenureVal,
    riskScore: Math.round(score),
    riskLevel: level,
    mainReason: reason,
    riskFactors: normalizedFactors,
    recommendations: Array.isArray(rawRecs) ? rawRecs : [rawRecs],
  };
}

/* ─── Risk configuration ─── */
const riskConfig = {
  low: {
    label: 'Faible',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
  },
  medium: {
    label: 'Modéré',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
  },
  high: {
    label: 'Élevé',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    bar: 'bg-rose-500',
    dot: 'bg-rose-500',
  },
};

/* ─── Animated KPI Card ─── */
function KPI({
  icon: Icon,
  label,
  value,
  suffix = '',
  trend,
  trendLabel,
  accentColor,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  suffix?: string;
  trend?: 'up' | 'down';
  trendLabel?: string;
  accentColor: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="relative overflow-hidden p-5">
        <div className={cn('absolute inset-x-0 top-0 h-[3px]', accentColor)} />
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tracking-tight text-foreground">{value}</span>
              {suffix && <span className="text-sm font-medium text-muted-foreground">{suffix}</span>}
            </div>
            {trend && trendLabel && (
              <div className="flex items-center gap-1">
                {trend === 'down' ? (
                  <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
                )}
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend === 'down' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  )}
                >
                  {trendLabel}
                </span>
              </div>
            )}
          </div>
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10')}>
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/* ─── Risk Distribution Bar ─── */
function RiskDistribution({ low, medium, high, total }: { low: number; medium: number; high: number; total: number }) {
  if (total === 0) return null;
  const pLow = (low / total) * 100;
  const pMed = (medium / total) * 100;
  const pHigh = (high / total) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <Card className="p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Distribution des risques</h3>
            <p className="text-xs text-muted-foreground">{total} employés analysés par le modèle ML</p>
          </div>
          <div className="flex items-center gap-4">
            {[
              { label: 'Faible', color: 'bg-emerald-500', count: low },
              { label: 'Modéré', color: 'bg-amber-500', count: medium },
              { label: 'Élevé', color: 'bg-rose-500', count: high },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={cn('h-2.5 w-2.5 rounded-full', item.color)} />
                <span className="text-xs text-muted-foreground">
                  {item.label} ({item.count})
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex h-8 w-full overflow-hidden rounded-md">
          {pLow > 0 && (
            <motion.div
              className="flex items-center justify-center bg-emerald-500/80 text-[11px] font-bold text-white"
              initial={{ width: 0 }}
              animate={{ width: `${pLow}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              {pLow > 8 && `${Math.round(pLow)}%`}
            </motion.div>
          )}
          {pMed > 0 && (
            <motion.div
              className="flex items-center justify-center bg-amber-500/80 text-[11px] font-bold text-white"
              initial={{ width: 0 }}
              animate={{ width: `${pMed}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            >
              {pMed > 8 && `${Math.round(pMed)}%`}
            </motion.div>
          )}
          {pHigh > 0 && (
            <motion.div
              className="flex items-center justify-center bg-rose-500/80 text-[11px] font-bold text-white"
              initial={{ width: 0 }}
              animate={{ width: `${pHigh}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            >
              {pHigh > 8 && `${Math.round(pHigh)}%`}
            </motion.div>
          )}
        </div>
        <div className="mt-3 flex">
          {pLow > 0 && (
            <div style={{ width: `${pLow}%` }} className="text-center">
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">0–39%</span>
            </div>
          )}
          {pMed > 0 && (
            <div style={{ width: `${pMed}%` }} className="text-center">
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">40–69%</span>
            </div>
          )}
          {pHigh > 0 && (
            <div style={{ width: `${pHigh}%` }} className="text-center">
              <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">70–100%</span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

/* ─── Inline risk bar for the table ─── */
function RiskBar({ score }: { score: number }) {
  const config = score >= 70 ? riskConfig.high : score >= 40 ? riskConfig.medium : riskConfig.low;
  return (
    <div className="flex items-center gap-2.5 min-w-[180px]">
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn('absolute inset-y-0 left-0 rounded-full', config.bar)}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className={cn('text-sm font-semibold tabular-nums w-10 text-right', config.color)}>
        {score}%
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CHURN DASHBOARD PAGE
   Premium analytics — ML-powered turnover prediction
   ═══════════════════════════════════════════════════════════ */
const ChurnDashboardPage = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<NormalizedEmployee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<'all' | RiskLevel>('all');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const { data: predictions, isLoading } = useQuery({
    queryKey: ['churn-predictions'],
    queryFn: churnService.getAllPredictions,
  });
  const { data: highRisk } = useQuery({
    queryKey: ['high-risk'],
    queryFn: churnService.getHighRisk,
  });

  const rawEmployees = predictions?.results || predictions || [];
  const employees: NormalizedEmployee[] = useMemo(
    () => rawEmployees.map(normalizeEmployee),
    [rawEmployees]
  );
  const highRiskCount = (highRisk?.results || highRisk || []).length;

  const stats = useMemo(() => {
    const total = employees.length;
    const low = employees.filter((e) => e.riskScore < 40).length;
    const medium = employees.filter((e) => e.riskScore >= 40 && e.riskScore < 70).length;
    const high = employees.filter((e) => e.riskScore >= 70).length;
    const avgScore = total > 0 ? Math.round(employees.reduce((s, e) => s + e.riskScore, 0) / total) : 0;
    const predictedDepartures = Math.round(high * 0.6 + medium * 0.15);
    return { total, low, medium, high, avgScore, predictedDepartures };
  }, [employees]);

  const displayedEmployees = useMemo(() => {
    let list = [...employees];
    if (filterLevel !== 'all') list = list.filter((e) => e.riskLevel === filterLevel);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q));
    }
    list.sort((a, b) => (sortDir === 'desc' ? b.riskScore - a.riskScore : a.riskScore - b.riskScore));
    return list;
  }, [employees, filterLevel, searchQuery, sortDir]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
            <BrainCircuit className="h-8 w-8 text-primary" />
          </motion.div>
          <p className="text-sm text-muted-foreground">Analyse prédictive en cours...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <BrainCircuit className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Prédiction du Turnover</h1>
                <p className="text-sm text-muted-foreground">
                  Modèle Random Forest &middot; Précision 80% &middot; Dataset IBM HR
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => churnService.predictAll?.()}>
            <RefreshCcw className="h-3.5 w-3.5" />
            Recalculer
          </Button>
        </motion.div>

        {/* Alert banner */}
        {stats.high > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex items-center gap-3 rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/10 flex-shrink-0">
              <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <p className="text-sm text-foreground">
              <strong className="text-rose-600 dark:text-rose-400">
                {stats.high} employé{stats.high > 1 ? 's' : ''}
              </strong>{' '}
              présentent un risque élevé de départ. Action recommandée : entretiens de rétention prioritaires.
            </p>
          </motion.div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KPI icon={Users} label="Employés analysés" value={stats.total} accentColor="bg-primary" delay={0.05} />
          <KPI
            icon={ShieldAlert}
            label="Risque élevé"
            value={stats.high}
            suffix={`/ ${stats.total}`}
            trend={stats.high > 0 ? 'up' : undefined}
            trendLabel={stats.high > 0 ? 'Attention requise' : undefined}
            accentColor="bg-rose-500"
            delay={0.1}
          />
          <KPI
            icon={Activity}
            label="Score moyen"
            value={stats.avgScore}
            suffix="%"
            trend={stats.avgScore > 50 ? 'up' : 'down'}
            trendLabel={stats.avgScore > 50 ? 'Au-dessus du seuil' : 'Sous contrôle'}
            accentColor="bg-amber-500"
            delay={0.15}
          />
          <KPI
            icon={UserMinus}
            label="Départs estimés"
            value={stats.predictedDepartures}
            suffix="prochains mois"
            accentColor="bg-indigo-500"
            delay={0.2}
          />
        </div>

        {/* Risk Distribution */}
        <RiskDistribution low={stats.low} medium={stats.medium} high={stats.high} total={stats.total} />

        {/* Table section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card>
            {/* Toolbar */}
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-56 pl-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {(['all', 'high', 'medium', 'low'] as const).map((level) => {
                  const isActive = filterLevel === level;
                  const labels = { all: 'Tous', high: 'Élevé', medium: 'Modéré', low: 'Faible' };
                  const counts = { all: stats.total, high: stats.high, medium: stats.medium, low: stats.low };
                  return (
                    <button
                      key={level}
                      onClick={() => setFilterLevel(level)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                        isActive
                          ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {level !== 'all' && (
                        <div
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            level === 'high' && 'bg-rose-500',
                            level === 'medium' && 'bg-amber-500',
                            level === 'low' && 'bg-emerald-500'
                          )}
                        />
                      )}
                      {labels[level]}
                      <span className="text-[10px] text-muted-foreground">({counts[level]})</span>
                    </button>
                  );
                })}
                <div className="mx-1 h-4 w-px bg-border" />
                <button
                  onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ArrowUpDown className="h-3 w-3" />
                  {sortDir === 'desc' ? 'Risque ↓' : 'Risque ↑'}
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Employé</TableHead>
                    <TableHead className="font-semibold">Département</TableHead>
                    <TableHead className="font-semibold">Ancienneté</TableHead>
                    <TableHead className="font-semibold">Score de risque</TableHead>
                    <TableHead className="font-semibold">Niveau</TableHead>
                    <TableHead className="font-semibold">Raison principale</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Search className="h-5 w-5" />
                          <span className="text-sm">Aucun résultat trouvé</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedEmployees.map((employee, idx) => {
                      const risk = riskConfig[employee.riskLevel];
                      return (
                        <motion.tr
                          key={employee.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                          className="group cursor-pointer border-b border-border transition-colors hover:bg-muted/40"
                          onClick={() => setSelectedEmployee(employee)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                    {employee.initials}
                                  </AvatarFallback>
                                </Avatar>
                                {employee.riskLevel === 'high' && (
                                  <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card bg-rose-500" />
                                )}
                              </div>
                              <span className="font-medium text-foreground">{employee.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{employee.department}</TableCell>
                          <TableCell className="text-muted-foreground">{employee.tenure}</TableCell>
                          <TableCell>
                            <RiskBar score={employee.riskScore} />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('font-medium', risk.bg, risk.border, risk.color)}>
                              <div className={cn('mr-1.5 h-1.5 w-1.5 rounded-full', risk.dot)} />
                              {risk.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground line-clamp-1 max-w-[180px]">
                              {employee.mainReason}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEmployee(employee);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Détails
                            </Button>
                          </TableCell>
                        </motion.tr>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Table footer */}
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {displayedEmployees.length} sur {stats.total} employés affichés
              </p>
              <p className="text-xs text-muted-foreground">
                Dernière analyse : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </Card>
        </motion.div>

        {/* ─── Detail Modal ─── */}
        <AnimatePresence>
          {selectedEmployee && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={() => setSelectedEmployee(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.97 }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="w-full max-w-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <Card className="max-h-[85vh] overflow-y-auto shadow-2xl">
                  {/* Header with risk accent */}
                  <div
                    className={cn(
                      'relative border-b border-border px-6 py-5',
                      selectedEmployee.riskLevel === 'high' && 'bg-rose-500/5',
                      selectedEmployee.riskLevel === 'medium' && 'bg-amber-500/5',
                      selectedEmployee.riskLevel === 'low' && 'bg-emerald-500/5'
                    )}
                  >
                    <div className={cn('absolute inset-x-0 top-0 h-[3px]', riskConfig[selectedEmployee.riskLevel].bar)} />
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14">
                          <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                            {selectedEmployee.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="text-xl font-bold text-foreground">{selectedEmployee.name}</h2>
                          <p className="text-sm text-muted-foreground">
                            {selectedEmployee.department} &middot; {selectedEmployee.tenure}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              'mt-1.5 font-medium',
                              riskConfig[selectedEmployee.riskLevel].bg,
                              riskConfig[selectedEmployee.riskLevel].border,
                              riskConfig[selectedEmployee.riskLevel].color
                            )}
                          >
                            Risque {riskConfig[selectedEmployee.riskLevel].label}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedEmployee(null)} className="h-8 w-8">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Gauge */}
                    <div className="flex justify-center py-2">
                      <ChurnGauge value={selectedEmployee.riskScore} size="lg" />
                    </div>

                    {/* Primary risk reason */}
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">Facteur principal de risque</h3>
                          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                            {selectedEmployee.mainReason}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Risk factors */}
                    {selectedEmployee.riskFactors.length > 0 && (
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <h3 className="text-sm font-semibold text-foreground">Facteurs de risque identifiés</h3>
                        </div>
                        <div className="space-y-2">
                          {selectedEmployee.riskFactors.map((factor, index) => {
                            const impactLevel = factor.impact.toLowerCase();
                            const isHigh = impactLevel.includes('élevé') || impactLevel.includes('high');
                            const isMed = impactLevel.includes('moyen') || impactLevel.includes('medium');
                            return (
                              <div key={index} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={cn(
                                      'h-2 w-2 rounded-full',
                                      isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500'
                                    )}
                                  />
                                  <span className="text-sm text-foreground">{factor.factor}</span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-xs',
                                    isHigh
                                      ? 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                      : isMed
                                      ? 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                      : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  )}
                                >
                                  Impact {factor.impact}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {selectedEmployee.recommendations && selectedEmployee.recommendations.filter(Boolean).length > 0 && (
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-muted-foreground" />
                          <h3 className="text-sm font-semibold text-foreground">Recommandations IA</h3>
                        </div>
                        <div className="space-y-2">
                          {selectedEmployee.recommendations.filter(Boolean).map((rec, i) => (
                            <div key={i} className="flex items-start gap-2.5 rounded-lg border border-primary/10 bg-primary/5 px-4 py-3">
                              <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-foreground">{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      <Button className="flex-1 gap-2" size="lg">
                        <Calendar className="h-4 w-4" />
                        Planifier un entretien de rétention
                      </Button>
                      <Button variant="outline" size="lg" className="gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Historique
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default ChurnDashboardPage;
