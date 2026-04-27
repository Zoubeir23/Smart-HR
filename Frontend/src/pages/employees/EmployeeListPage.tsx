import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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
    const result = employees.filter((employee) => {
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

        {/* ────── HEADER ────── */}
        <motion.div variants={item} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Employés</h1>
            <p className="text-sm text-muted-foreground">
              Gérez et consultez les informations de vos {stats.total} collaborateurs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Exporter
            </Button>
            <Button asChild size="sm" className="gap-2" style={{ background: 'var(--gradient-primary)' }}>
              <Link to="/employees/create">
                <Plus className="h-4 w-4" />
                Nouvel employé
              </Link>
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
                  className="overflow-hidden rounded-lg border border-border bg-card"
                >
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>
                          <button
                            onClick={() => toggleSort('name')}
                            className="flex items-center gap-1.5 font-semibold"
                          >
                            Employé
                            <ArrowUpDown className={cn('h-3 w-3', sortKey === 'name' ? 'text-primary' : 'text-muted-foreground/50')} />
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            onClick={() => toggleSort('department')}
                            className="flex items-center gap-1.5 font-semibold"
                          >
                            Département
                            <ArrowUpDown className={cn('h-3 w-3', sortKey === 'department' ? 'text-primary' : 'text-muted-foreground/50')} />
                          </button>
                        </TableHead>
                        <TableHead>Poste</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>
                          <button
                            onClick={() => toggleSort('risk')}
                            className="flex items-center gap-1.5 font-semibold"
                          >
                            Risque
                            <ArrowUpDown className={cn('h-3 w-3', sortKey === 'risk' ? 'text-primary' : 'text-muted-foreground/50')} />
                          </button>
                        </TableHead>
                        <TableHead className="w-[80px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((employee) => {
                        const avatarBg = getAvatarColor(`${employee.user.first_name}${employee.user.last_name}`);
                        const dept = (employee as { department_name?: string }).department_name ?? employee.department;
                        const pos = (employee as { position_title?: string }).position_title ?? employee.position;

                        return (
                          <TableRow key={employee.id} className="group cursor-pointer" onClick={() => navigate(`/employees/${employee.id}`)}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white', avatarBg)}>
                                  {employee.user.first_name[0]}{employee.user.last_name[0]}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-medium">
                                    {employee.user.first_name} {employee.user.last_name}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">{employee.user.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-sm">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground/60" />
                                {dept}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{pos}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn('text-xs', statusStyles[employee.status])}>
                                {statusLabels[employee.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {employee.churn_risk !== undefined ? (
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                    <div
                                      className={cn(
                                        'h-full rounded-full transition-all',
                                        employee.churn_risk < 30 && 'bg-success',
                                        employee.churn_risk >= 30 && employee.churn_risk < 60 && 'bg-warning',
                                        employee.churn_risk >= 60 && 'bg-destructive'
                                      )}
                                      style={{ width: `${employee.churn_risk}%` }}
                                    />
                                  </div>
                                  <span className={cn(
                                    'text-xs font-semibold tabular-nums',
                                    employee.churn_risk < 30 && 'text-success',
                                    employee.churn_risk >= 30 && employee.churn_risk < 60 && 'text-warning',
                                    employee.churn_risk >= 60 && 'text-destructive'
                                  )}>
                                    {employee.churn_risk}%
                                  </span>
                                  {employee.churn_risk >= 60 && (
                                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
