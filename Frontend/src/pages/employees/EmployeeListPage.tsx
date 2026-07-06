import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  MoreVertical,
  Mail,
  Eye,
  Pencil,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EmployeeCard from '@/components/employees/EmployeeCard';
import DataPagination, { usePagination } from '@/components/common/DataPagination';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isArchivedView = searchParams.get('archived') === 'true';
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

  const employees: Employee[] = useMemo(() => {
    const allEmployees: Employee[] = employeesData?.results || employeesData || [];
    return isArchivedView
      ? allEmployees.filter((employee) => employee.status === 'terminated')
      : allEmployees.filter((employee) => employee.status !== 'terminated');
  }, [employeesData, isArchivedView]);
  const departmentsList = useMemo(() => departmentsData?.results ?? departmentsData ?? [], [departmentsData]);
  const departments = useMemo(() => ['Tous', ...departmentsList.map((d: { name: string }) => d.name)], [departmentsList]);

  // ─── Filtering & Sorting ──────────────
  const filteredEmployees = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const result = employees.filter((employee) => {
      const matchesSearch =
        !query ||
        employee.user.first_name.toLowerCase().includes(query) ||
        employee.user.last_name.toLowerCase().includes(query) ||
        employee.user.email.toLowerCase().includes(query) ||
        String((employee as { position_title?: string }).position_title ?? employee.position ?? '').toLowerCase().includes(query);

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
          cmp = String((a as { department_name?: string }).department_name ?? a.department ?? '').localeCompare(String((b as { department_name?: string }).department_name ?? b.department ?? ''));
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

  const { pageItems: pagedEmployees, currentPage, setCurrentPage, totalPages } = usePagination(filteredEmployees);

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
      <motion.div variants={container} initial="hidden" animate="visible" className="space-y-4 sm:space-y-5 md:space-y-6">

        {/* ────── HEADER ────── */}
        <motion.div variants={item} className="flex flex-col gap-3 sm:gap-4 sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {isArchivedView ? 'Ex-fonctionnaires' : 'Employés'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isArchivedView
                ? `Consultez les ${stats.total} anciens collaborateurs`
                : `Gérez et consultez les informations de vos ${stats.total} collaborateurs`}
            </p>
          </div>
          {/* Responsive button layout: stack on mobile, row on tablet+ */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" className="gap-2 text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              Exporter
            </Button>
            {!isArchivedView && (
              <Button asChild size="sm" className="gap-2 text-xs sm:text-sm bg-gradient-primary">
                <Link to="/employees/create">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  Nouvel employé
                </Link>
              </Button>
            )}
          </div>
        </motion.div>

        {/* ────── LOADING STATE ────── */}
        {isLoading && (
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[70px] sm:h-[76px] w-full rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-9 sm:h-10 w-full max-w-sm rounded-lg" />
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-[180px] sm:h-[200px] w-full rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {!isLoading && (
          <>
            {/* ────── STATUS FILTER PILLS ────── */}
            {!isArchivedView && (
            <motion.div variants={item} className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
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
                      'flex items-center gap-2 sm:gap-3 rounded-lg border p-3 sm:p-4 text-left transition-all',
                      isSelected
                        ? 'border-primary/40 bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:border-border hover:shadow-sm'
                    )}
                  >
                    <div className={cn('flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg flex-shrink-0', isSelected ? status.bg : 'bg-muted')}>
                      <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', isSelected ? status.color : 'text-muted-foreground')} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl sm:text-2xl font-bold tabular-nums">{count}</p>
                      <p className="text-xs text-muted-foreground leading-tight">{status.label}</p>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
            )}

            {/* ────── TOOLBAR ────── */}
            <motion.div variants={item} className="flex flex-col gap-3 sm:gap-0 sm:flex-row sm:items-center sm:justify-between">
              {/* Search and filters: stack on mobile */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 flex-1">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-sm h-9 sm:h-10"
                  />
                </div>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-full sm:w-auto sm:min-w-[160px] h-9 sm:h-10 text-sm">
                    <SelectValue placeholder="Département" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-9 sm:h-10" onClick={resetFilters}>
                    Réinitialiser
                  </Button>
                )}
              </div>
              {/* View toggle and count: hidden on mobile, shown on sm+ */}
              <div className="flex items-center gap-2 justify-between">
                <p className="text-xs sm:text-sm text-muted-foreground">
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
                  className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 sm:py-20"
                >
                  <div className="mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-muted">
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold">
                    {isArchivedView ? 'Aucun ex-fonctionnaire' : 'Aucun employé trouvé'}
                  </h3>
                  <p className="mt-1 max-w-sm text-center text-xs sm:text-sm text-muted-foreground px-3">
                    {isArchivedView
                      ? "Aucun employé n'a encore quitté l'entreprise."
                      : 'Essayez de modifier vos critères de recherche ou réinitialisez les filtres'}
                  </p>
                  <Button className="mt-4 sm:mt-6 gap-2 text-sm sm:text-base h-9 sm:h-10" variant="outline" onClick={resetFilters}>
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
                  className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                  {pagedEmployees.map((employee) => (
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
                  className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                >
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b-2 border-border/60 bg-muted/30">
                        <TableHead className="py-3.5">
                          <button
                            onClick={() => toggleSort('name')}
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Employé
                            <ArrowUpDown className={cn('h-3 w-3', sortKey === 'name' ? 'text-primary' : 'opacity-40')} />
                          </button>
                        </TableHead>
                        <TableHead className="py-3.5">
                          <button
                            onClick={() => toggleSort('department')}
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Département
                            <ArrowUpDown className={cn('h-3 w-3', sortKey === 'department' ? 'text-primary' : 'opacity-40')} />
                          </button>
                        </TableHead>
                        <TableHead className="py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Poste</TableHead>
                        <TableHead className="py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Statut</TableHead>
                        <TableHead className="py-3.5">
                          <button
                            onClick={() => toggleSort('risk')}
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Risque churn
                            <ArrowUpDown className={cn('h-3 w-3', sortKey === 'risk' ? 'text-primary' : 'opacity-40')} />
                          </button>
                        </TableHead>
                        <TableHead className="w-[60px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedEmployees.map((employee, index) => {
                        const avatarBg = getAvatarColor(`${employee.user.first_name}${employee.user.last_name}`);
                        const dept = (employee as { department_name?: string }).department_name ?? employee.department;
                        const pos = (employee as { position_title?: string }).position_title ?? employee.position;
                        const isHighRisk = (employee.churn_risk ?? 0) >= 60;

                        return (
                          <TableRow
                            key={employee.id}
                            className={cn(
                              'group cursor-pointer transition-all duration-150',
                              'hover:bg-primary/[0.025] dark:hover:bg-primary/[0.05]',
                              index % 2 === 0 ? 'bg-transparent' : 'bg-muted/[0.015]',
                              isHighRisk && 'border-l-[2px] border-l-destructive/50'
                            )}
                            onClick={() => navigate(`/employees/${employee.id}`)}
                          >
                            <TableCell className="py-3.5">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white ring-2 ring-transparent transition-all group-hover:ring-primary/20',
                                  avatarBg
                                )}>
                                  {employee.user.first_name[0]}{employee.user.last_name[0]}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold group-hover:text-primary transition-colors">
                                    {employee.user.first_name} {employee.user.last_name}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">{employee.user.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-3.5">
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 shrink-0 opacity-50" />
                                <span className="truncate">{dept}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-3.5 text-sm text-muted-foreground">{pos}</TableCell>
                            <TableCell className="py-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  'h-1.5 w-1.5 shrink-0 rounded-full',
                                  employee.status === 'active' && 'bg-emerald-500',
                                  employee.status === 'inactive' && 'bg-red-500',
                                  employee.status === 'on_leave' && 'bg-amber-500',
                                )} />
                                <Badge variant="outline" className={cn('text-[11px] px-2 py-0', statusStyles[employee.status])}>
                                  {statusLabels[employee.status]}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="py-3.5">
                              {employee.churn_risk !== undefined ? (
                                <div className="flex items-center gap-2.5">
                                  <div className="h-2 w-20 overflow-hidden rounded-full bg-muted/70">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${employee.churn_risk}%` }}
                                      transition={{ duration: 0.6, delay: index * 0.03 }}
                                      className={cn(
                                        'h-full rounded-full',
                                        employee.churn_risk < 30 && 'bg-gradient-to-r from-emerald-500 to-emerald-400',
                                        employee.churn_risk >= 30 && employee.churn_risk < 60 && 'bg-gradient-to-r from-amber-500 to-amber-400',
                                        employee.churn_risk >= 60 && 'bg-gradient-to-r from-red-600 to-red-500'
                                      )}
                                    />
                                  </div>
                                  <span className={cn(
                                    'w-9 text-right text-xs font-bold tabular-nums',
                                    employee.churn_risk < 30 && 'text-emerald-600 dark:text-emerald-400',
                                    employee.churn_risk >= 30 && employee.churn_risk < 60 && 'text-amber-600 dark:text-amber-400',
                                    employee.churn_risk >= 60 && 'text-red-600 dark:text-red-400'
                                  )}>
                                    {employee.churn_risk}%
                                  </span>
                                  {isHighRisk && (
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500 animate-pulse" />
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/50">—</span>
                              )}
                            </TableCell>
                            <TableCell className="py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem
                                    onSelect={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/employees/${employee.id}`); }}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <Eye className="h-4 w-4" /> Voir le profil
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/employees/${employee.id}?edit=true`); }}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <Pencil className="h-4 w-4" /> Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `mailto:${employee.user.email}`; }}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <Mail className="h-4 w-4" /> Envoyer un email
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </motion.div>
              )}
            </AnimatePresence>
            <DataPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              className="pt-4"
            />
          </>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
