import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Download,
  Grid,
  List,
  SlidersHorizontal,
  Users,
  UserCheck,
  UserX,
  Clock,
  ArrowUpDown,
  ChevronRight,
  Mail,
  MapPin,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  MoreVertical
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EmployeeCard from '@/components/employees/EmployeeCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Employee } from '@/types';
import { cn } from '@/lib/utils';
import { employeeService } from '@/services/employeeService';
import { useQuery } from '@tanstack/react-query';

/* ─────────── Constants ─────────── */

const statuses = [
  { value: 'all', label: 'Tous', icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
  { value: 'active', label: 'Actifs', icon: UserCheck, color: 'text-success', bg: 'bg-success/10' },
  { value: 'inactive', label: 'Inactifs', icon: UserX, color: 'text-destructive', bg: 'bg-destructive/10' },
  { value: 'on_leave', label: 'En congé', icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
];

const statusStyles: Record<string, string> = {
  active: 'bg-success/15 text-success border-success/20',
  inactive: 'bg-destructive/15 text-destructive border-destructive/20',
  on_leave: 'bg-warning/15 text-warning border-warning/20',
};

const statusLabels: Record<string, string> = {
  active: 'Actif',
  inactive: 'Inactif',
  on_leave: 'En congé',
};

const avatarColors = [
  'bg-blue-600', 'bg-indigo-600', 'bg-violet-600', 'bg-teal-600',
  'bg-cyan-600', 'bg-emerald-600', 'bg-sky-600', 'bg-slate-600',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

type SortKey = 'name' | 'department' | 'risk' | 'hire_date';
type SortDir = 'asc' | 'desc';

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */

export default function EmployeeListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('Tous');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll(),
  });
  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => employeeService.getDepartments(),
  });

  const employees: Employee[] = employeesData?.results || employeesData || [];
  const departmentsList = departmentsData?.results ?? departmentsData ?? [];
  const departments = ['Tous', ...departmentsList.map((d: { name: string }) => d.name)];

  // ─── Filtering & Sorting ──────────────
  const filteredEmployees = useMemo(() => {
    const query = searchQuery.toLowerCase();
    let result = employees.filter((employee) => {
      const matchesSearch =
        !query ||
        employee.user.first_name.toLowerCase().includes(query) ||
        employee.user.last_name.toLowerCase().includes(query) ||
        employee.user.email.toLowerCase().includes(query) ||
        ((employee as { position_title?: string }).position_title ?? employee.position ?? '').toLowerCase().includes(query);

      const deptName = (employee as { department_name?: string }).department_name ?? employee.department;
      const matchesDepartment = selectedDepartment === 'Tous' || deptName === selectedDepartment;
      const matchesStatus = selectedStatus === 'all' || employee.status === selectedStatus;

      return matchesSearch && matchesDepartment && matchesStatus;
    });

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = `${a.user.first_name} ${a.user.last_name}`.localeCompare(`${b.user.first_name} ${b.user.last_name}`);
          break;
        case 'department':
          cmp = (a.department ?? '').localeCompare(b.department ?? '');
          break;
        case 'risk':
          cmp = (a.churn_risk ?? 0) - (b.churn_risk ?? 0);
          break;
        case 'hire_date':
          cmp = (a.hire_date ?? '').localeCompare(b.hire_date ?? '');
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [employees, searchQuery, selectedDepartment, selectedStatus, sortKey, sortDir]);

  // ─── Stats ────────────────────────────
  const stats = useMemo(() => ({
    total: employees.length,
    active: employees.filter((e) => e.status === 'active').length,
    inactive: employees.filter((e) => e.status === 'inactive').length,
    onLeave: employees.filter((e) => e.status === 'on_leave').length,
  }), [employees]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function getStatCount(value: string) {
    if (value === 'all') return stats.total;
    if (value === 'active') return stats.active;
    if (value === 'inactive') return stats.inactive;
    return stats.onLeave;
  }

  function resetFilters() {
    setSearchQuery('');
    setSelectedDepartment('Tous');
    setSelectedStatus('all');
  }

  const hasActiveFilters = searchQuery || selectedDepartment !== 'Tous' || selectedStatus !== 'all';

  // ─── Animation ────────────────────────
  const container = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="visible" className="space-y-6">

        {/* ────── DASHBOARD EDITORIAL HEADER ────── */}
        <motion.div variants={item} className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">Effectifs</h3>
            <p className="text-muted-foreground font-medium mt-1">Vue d'ensemble de votre capital humain</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-6 mr-4 border-r border-border pr-6 hidden md:flex">
              <div className="text-right">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Total Employés</p>
                <p className="text-3xl font-extrabold leading-none mt-1">{stats.total}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-success uppercase tracking-widest">Nouveaux Recrues</p>
                <p className="text-3xl font-extrabold text-success leading-none mt-1">12</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2 bg-background shadow-sm hover:shadow-md transition-shadow">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exporter</span>
            </Button>
            <Button size="sm" className="gap-2 bg-gradient-primary text-primary-foreground shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouvel employé</span>
            </Button>
          </div>
        </motion.div>

        {/* ────── LOADING STATE ────── */}
        {isLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[76px] w-full rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-[200px] w-full rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {!isLoading && (
          <>
            {/* ────── STATUS FILTER PILLS ────── */}
            <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {statuses.map((status) => {
                const Icon = status.icon;
                const count = getStatCount(status.value);
                const isSelected = selectedStatus === status.value;

                return (
                  <motion.button
                    key={status.value}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedStatus(status.value)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-4 text-left transition-all',
                      isSelected
                        ? 'border-primary/40 bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:border-border hover:shadow-sm'
                    )}
                  >
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', isSelected ? status.bg : 'bg-muted')}>
                      <Icon className={cn('h-5 w-5', isSelected ? status.color : 'text-muted-foreground')} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold tabular-nums">{count}</p>
                      <p className="text-xs text-muted-foreground">{status.label}</p>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>

            {/* ────── TOOLBAR ────── */}
            <motion.div variants={item} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-3">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, email, poste..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Département" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={resetFilters}>
                    Réinitialiser
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="mr-2 hidden text-sm text-muted-foreground sm:block">
                  {filteredEmployees.length} résultat{filteredEmployees.length !== 1 ? 's' : ''}
                </p>
                <div className="flex rounded-lg border border-border p-0.5">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* ────── CONTENT ────── */}
            <AnimatePresence mode="wait">
              {filteredEmployees.length === 0 ? (
                /* ── Empty State ── */
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20"
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">Aucun employé trouvé</h3>
                  <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
                    Essayez de modifier vos critères de recherche ou réinitialisez les filtres
                  </p>
                  <Button className="mt-6 gap-2" variant="outline" onClick={resetFilters}>
                    Réinitialiser les filtres
                  </Button>
                </motion.div>
              ) : viewMode === 'grid' ? (
                /* ── Grid View ── */
                <motion.div
                  key="grid"
                  variants={container}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0 }}
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                  {filteredEmployees.map((employee) => (
                    <motion.div key={employee.id} variants={item}>
                      <EmployeeCard employee={employee} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                /* ── Table View ── */
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm"
                >
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/50">
                        <TableHead className="px-8 py-5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <button onClick={() => toggleSort('name')} className="flex items-center gap-1.5 hover:text-foreground">
                            Employé
                            <ArrowUpDown className={cn('h-3 w-3', sortKey === 'name' ? 'text-primary' : 'opacity-50')} />
                          </button>
                        </TableHead>
                        <TableHead className="px-8 py-5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Poste</TableHead>
                        <TableHead className="px-8 py-5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <button onClick={() => toggleSort('department')} className="flex items-center gap-1.5 hover:text-foreground">
                            Département
                            <ArrowUpDown className={cn('h-3 w-3', sortKey === 'department' ? 'text-primary' : 'opacity-50')} />
                          </button>
                        </TableHead>
                        <TableHead className="px-8 py-5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Statut</TableHead>
                        <TableHead className="px-8 py-5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">
                          <button onClick={() => toggleSort('risk')} className="flex items-center gap-1.5 justify-end w-full hover:text-foreground">
                            IA : Risque de Départ
                            <ArrowUpDown className={cn('h-3 w-3', sortKey === 'risk' ? 'text-primary' : 'opacity-50')} />
                          </button>
                        </TableHead>
                        <TableHead className="px-8 py-5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground" />
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/50">
                      {filteredEmployees.map((employee) => {
                        const avatarBg = getAvatarColor(`${employee.user.first_name}${employee.user.last_name}`);
                        const dept = (employee as { department_name?: string }).department_name ?? employee.department;
                        const pos = (employee as { position_title?: string }).position_title ?? employee.position;

                        let riskLabel = 'Faible';
                        let riskColor = 'text-success border-success/20 bg-success/10';
                        if (employee.churn_risk !== undefined) {
                           if (employee.churn_risk >= 60) { riskLabel = 'Élevé'; riskColor = 'text-destructive border-destructive/20 bg-destructive/10'; }
                           else if (employee.churn_risk >= 30) { riskLabel = 'Moyen'; riskColor = 'text-warning border-warning/20 bg-warning/10'; }
                        }

                        return (
                          <TableRow key={employee.id} className="group hover:bg-muted/30 transition-colors duration-200 border-none">
                            <TableCell className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white ring-2 ring-border', avatarBg)}>
                                  {employee.user.first_name[0]}{employee.user.last_name[0]}
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-foreground">
                                    {employee.user.first_name} {employee.user.last_name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{employee.user.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-8 py-6">
                              <p className="text-sm font-semibold text-muted-foreground">{pos}</p>
                            </TableCell>
                            <TableCell className="px-8 py-6">
                              <span className="text-[10px] px-3 py-1 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-tight">
                                {dept}
                              </span>
                            </TableCell>
                            <TableCell className="px-8 py-6">
                              <div className="flex items-center gap-2">
                                <span className={cn('w-2 h-2 rounded-full',
                                    employee.status === 'active' ? 'bg-success' :
                                    employee.status === 'inactive' ? 'bg-destructive' : 'bg-warning'
                                )}></span>
                                <span className={cn('text-xs font-bold uppercase tracking-tighter',
                                    employee.status === 'active' ? 'text-success' :
                                    employee.status === 'inactive' ? 'text-destructive' : 'text-warning'
                                )}>
                                    {statusLabels[employee.status]}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-8 py-6 text-right">
                              {employee.churn_risk !== undefined ? (
                                <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full border', riskColor)}>
                                  <Sparkles className="h-3 w-3" />
                                  <span className="text-xs font-bold uppercase tracking-tighter">{riskLabel}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="px-8 py-6 text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="px-8 py-6 flex items-center justify-between border-t border-border/50 bg-muted/20">
                    <p className="text-xs text-muted-foreground font-medium">Affichage de 1-{Math.min(filteredEmployees.length, 4)} sur {filteredEmployees.length} employés</p>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-lg">
                        <ChevronRight className="h-4 w-4 rotate-180" />
                      </Button>
                      <Button size="icon" className="h-8 w-8 bg-primary text-primary-foreground font-bold text-xs rounded-lg">1</Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted font-bold text-xs rounded-lg">2</Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted font-bold text-xs rounded-lg">3</Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-lg">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ────── AI INSIGHTS BENTO SECTION ────── */}
            <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-2xl text-white relative overflow-hidden group shadow-lg">
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-white/10 p-2 rounded-xl">
                                <Sparkles className="h-5 w-5 text-emerald-300" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Insight IA du jour</span>
                        </div>
                        <h4 className="text-2xl font-extrabold tracking-tight mb-3">Optimisation de la rétention</h4>
                        <p className="text-sm text-indigo-100 max-w-md leading-relaxed font-medium">
                            Nos algorithmes ont détecté une corrélation entre le télétravail hybride et la satisfaction dans l'équipe Engineering. Envisagez de formaliser la charte pour stabiliser les scores de fidélité.
                        </p>
                        <div className="mt-8">
                            <Button className="px-6 py-5 bg-white hover:bg-white/90 text-indigo-700 rounded-xl font-bold text-sm shadow-xl transition-all hover:scale-105 active:scale-95">
                                Voir l'analyse complète
                            </Button>
                        </div>
                    </div>
                    {/* Abstract AI Shape */}
                    <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                </div>

                <div className="bg-card p-8 rounded-2xl shadow-sm border border-border flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Santé du Département</span>
                            <TrendingUp className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-foreground">Produit</p>
                                    <span className="text-[10px] font-bold text-muted-foreground">80%</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="w-4/5 h-full bg-primary rounded-full"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-foreground">Engineering</p>
                                    <span className="text-[10px] font-bold text-muted-foreground">60%</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="w-3/5 h-full bg-indigo-500 rounded-full"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-foreground">Ventes</p>
                                    <span className="text-[10px] font-bold text-muted-foreground">85%</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="w-[85%] h-full bg-emerald-500 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
          </>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
