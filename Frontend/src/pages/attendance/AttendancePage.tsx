import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, UserCheck, UserX, Clock, Calendar, BarChart2,
  Plus, Pencil, Trash2, X, Check, LogIn, LogOut,
} from 'lucide-react';
import SearchableSelect from '@/components/common/SearchableSelect';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { attendanceService } from '@/services/attendanceService';
import { employeeService } from '@/services/employeeService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

type ApiAttendanceStatus = 'present' | 'absent' | 'late' | 'half_day';
type AbsenceType = 'justified' | 'unjustified';
type StatusFilter = 'all' | ApiAttendanceStatus;
type DateFilter = 'today' | 'week' | 'month';
type ActiveTab = 'list' | 'stats';

interface AttendanceRecord {
  id: number;
  employee: number;
  employee_name: string;
  department_name: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  duration_hours: number | null;
  status: ApiAttendanceStatus;
  absence_type: AbsenceType | null;
  absence_type_display: string | null;
  note: string;
}

interface AttendanceForm {
  employee: string;
  date: string;
  check_in: string;
  check_out: string;
  status: ApiAttendanceStatus;
  absence_type: AbsenceType | '';
  note: string;
}

interface MonthlyStats {
  year: number;
  month: number;
  total_records: number;
  by_status: Record<ApiAttendanceStatus, number>;
  by_department: Array<{
    employee__department__name: string;
    total: number;
    present: number;
    absent: number;
    late: number;
  }>;
}

const EMPTY_FORM: AttendanceForm = {
  employee: '',
  date: new Date().toISOString().split('T')[0],
  check_in: '',
  check_out: '',
  status: 'present',
  absence_type: '',
  note: '',
};

const STATUS_CONFIG: Record<ApiAttendanceStatus, { label: string; className: string }> = {
  present:  { label: 'Présent',      className: 'bg-success text-success-foreground' },
  absent:   { label: 'Absent',       className: 'bg-destructive text-destructive-foreground' },
  late:     { label: 'En retard',    className: 'bg-warning text-warning-foreground' },
  half_day: { label: 'Demi-journée', className: 'bg-muted text-muted-foreground' },
};

const ABSENCE_TYPE_OPTIONS: { value: AbsenceType; label: string }[] = [
  { value: 'justified',   label: 'Signalée (justifiée)' },
  { value: 'unjustified', label: 'Non signalée (injustifiée)' },
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all',      label: 'Tous' },
  { value: 'present',  label: 'Présents' },
  { value: 'absent',   label: 'Absents' },
  { value: 'late',     label: 'En retard' },
  { value: 'half_day', label: 'Demi-journée' },
];

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  today: "Aujourd'hui",
  week:  'Cette semaine',
  month: 'Ce mois',
};

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function formatLocalDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR');
}

function buildDateRange(filter: DateFilter): { date_start?: string; date_end?: string } {
  if (filter === 'today') return {};
  const now = new Date();
  if (filter === 'month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      date_start: firstDay.toISOString().split('T')[0],
      date_end:   lastDay.toISOString().split('T')[0],
    };
  }
  // week: lundi → dimanche
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 = lundi
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    date_start: monday.toISOString().split('T')[0],
    date_end:   sunday.toISOString().split('T')[0],
  };
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase();
}

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canEdit = user?.role === 'RH' || user?.role === 'ADMIN';

  const [activeTab, setActiveTab]       = useState<ActiveTab>('list');
  const [dateFilter, setDateFilter]     = useState<DateFilter>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [statsMonth, setStatsMonth]     = useState(new Date().getMonth() + 1);
  const [statsYear, setStatsYear]       = useState(new Date().getFullYear());

  const [showForm, setShowForm]       = useState(false);
  const [editTarget, setEditTarget]   = useState<AttendanceRecord | null>(null);
  const [form, setForm]               = useState<AttendanceForm>(EMPTY_FORM);
  const [deleteId, setDeleteId]       = useState<number | null>(null);

  // ── Data ─────────────────────────────────────────────────────────
  const { data: listData, isLoading } = useQuery({
    queryKey: ['attendance', dateFilter],
    queryFn: () => {
      if (dateFilter === 'today') return attendanceService.getToday();
      return attendanceService.getAll(buildDateRange(dateFilter));
    },
  });

  const { data: statsData } = useQuery<MonthlyStats>({
    queryKey: ['attendance-stats', statsYear, statsMonth],
    queryFn: () => attendanceService.getMonthlyStats(statsYear, statsMonth),
    enabled: activeTab === 'stats' && canEdit,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeeService.getAll(),
    enabled: canEdit,
  });

  const employees  = employeesData?.results ?? employeesData ?? [];
  const records: AttendanceRecord[] = listData?.results ?? listData ?? [];
  const filtered = statusFilter === 'all' ? records : records.filter((r) => r.status === statusFilter);

  const stats = {
    total:   records.length,
    present: records.filter((r) => r.status === 'present').length,
    absent:  records.filter((r) => r.status === 'absent').length,
    late:    records.filter((r) => r.status === 'late').length,
  };

  // ── Mutations ─────────────────────────────────────────────────────
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['attendance'] });

  const createMutation = useMutation({
    mutationFn: attendanceService.create,
    onSuccess: () => { toast({ title: 'Présence créée' }); invalidate(); closeForm(); },
    onError:   () => toast({ title: 'Erreur', description: 'Impossible de créer la présence.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      attendanceService.update(id, data),
    onSuccess: () => { toast({ title: 'Présence mise à jour' }); invalidate(); closeForm(); },
    onError:   () => toast({ title: 'Erreur', description: 'Impossible de modifier la présence.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: attendanceService.delete,
    onSuccess: () => { toast({ title: 'Présence supprimée' }); invalidate(); setDeleteId(null); },
    onError:   () => toast({ title: 'Erreur', description: 'Impossible de supprimer.', variant: 'destructive' }),
  });

  // ── Handlers ──────────────────────────────────────────────────────
  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(record: AttendanceRecord) {
    setEditTarget(record);
    setForm({
      employee:     String(record.employee),
      date:         record.date,
      check_in:     record.check_in ?? '',
      check_out:    record.check_out ?? '',
      status:       record.status,
      absence_type: record.absence_type ?? '',
      note:         record.note,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditTarget(null);
    setForm(EMPTY_FORM);
  }

  function handleSubmit() {
    const payload: Record<string, unknown> = {
      employee:     Number(form.employee),
      date:         form.date,
      status:       form.status,
      absence_type: form.status === 'absent' && form.absence_type ? form.absence_type : null,
      note:         form.note,
      check_in:     form.check_in  || null,
      check_out:    form.check_out || null,
    };
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleStatusChange(value: ApiAttendanceStatus) {
    setForm((f) => ({
      ...f,
      status:       value,
      absence_type: value !== 'absent' ? '' : f.absence_type,
    }));
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSubmit = !isPending && !!form.employee && !!form.date &&
    (form.status !== 'absent' || !!form.absence_type);

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Chargement…</p>
        </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestion des Présences</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {canEdit
                ? 'Consultez, créez et gérez les présences — RH / Admin uniquement pour les modifications.'
                : 'Consultez vos présences enregistrées.'}
            </p>
          </div>
          {canEdit && (
            <Button size="sm" onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Enregistrer une présence
            </Button>
          )}
        </div>

        {/* ── Tabs ── */}
        {canEdit && (
          <div className="flex gap-1 border-b border-border">
            {(['list', 'stats'] as ActiveTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab === 'list' ? <><Users className="h-4 w-4" /> Pointage</> : <><BarChart2 className="h-4 w-4" /> Stats mensuelles</>}
              </button>
            ))}
          </div>
        )}

        {/* ══ TAB : LISTE ══ */}
        {activeTab === 'list' && (
          <>
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Total',     value: stats.total,   icon: Users,     color: 'text-primary' },
                { label: 'Présents',  value: stats.present, icon: UserCheck, color: 'text-success' },
                { label: 'Absents',   value: stats.absent,  icon: UserX,     color: 'text-destructive' },
                { label: 'En retard', value: stats.late,    icon: Clock,     color: 'text-warning' },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="border border-border bg-card rounded-xl shadow-sm p-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                      <Icon className={cn('h-5 w-5', s.color)} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Filtres ── */}
            <div className="border border-border bg-card rounded-xl shadow-sm p-4 flex flex-wrap items-center gap-3">
              {/* Filtre date */}
              <div className="flex items-center gap-1">
                {(Object.keys(DATE_FILTER_LABELS) as DateFilter[]).map((f) => (
                  <Button
                    key={f}
                    variant={dateFilter === f ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateFilter(f)}
                  >
                    {f === 'today' && <Calendar className="mr-1 h-4 w-4" />}
                    {DATE_FILTER_LABELS[f]}
                  </Button>
                ))}
              </div>
              <div className="h-6 w-px bg-border hidden sm:block" />
              {/* Filtre statut */}
              <div className="flex items-center gap-1 flex-wrap">
                {STATUS_FILTERS.map((f) => (
                  <Button
                    key={f.value}
                    variant={statusFilter === f.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(f.value)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* ── Table ── */}
            <div className="border border-border bg-card rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Employé</TableHead>
                      <TableHead className="hidden sm:table-cell">Département</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="hidden md:table-cell">Arrivée</TableHead>
                      <TableHead className="hidden md:table-cell">Départ</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="hidden lg:table-cell">Type absence</TableHead>
                      {canEdit && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filtered.map((record) => {
                        const config = STATUS_CONFIG[record.status];
                        return (
                          <motion.tr
                            key={record.id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="border-b border-border hover:bg-muted/40 transition-colors"
                          >
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                                  {getInitials(record.employee_name || 'NN')}
                                </div>
                                <span className="font-medium text-foreground text-sm truncate">
                                  {record.employee_name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                              {record.department_name || '—'}
                            </TableCell>
                            <TableCell className="text-sm text-foreground">
                              {formatLocalDate(record.date)}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-foreground">
                              {record.check_in ?? <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-foreground">
                              {record.check_out ?? <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn('text-xs', config?.className ?? '')}>
                                {config?.label ?? record.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                              {record.absence_type_display ?? '—'}
                            </TableCell>
                            {canEdit && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => openEdit(record)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => setDeleteId(record.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>

              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/40" />
                  <h3 className="mt-4 text-base font-semibold text-foreground">Aucun enregistrement</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Aucune présence pour ce filtre.</p>
                  {canEdit && (
                    <Button className="mt-4 gap-2" onClick={openCreate}>
                      <Plus className="h-4 w-4" />
                      Enregistrer la première présence
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ══ TAB : STATS MENSUELLES ══ */}
        {activeTab === 'stats' && canEdit && (
          <div className="space-y-4">
            {/* Sélecteur mois/année */}
            <div className="border border-border bg-card rounded-xl shadow-sm p-4 flex flex-wrap items-center gap-3">
              <Select
                value={String(statsMonth)}
                onValueChange={(v) => setStatsMonth(Number(v))}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, idx) => (
                    <SelectItem key={idx + 1} value={String(idx + 1)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(statsYear)}
                onValueChange={(v) => setStatsYear(Number(v))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[statsYear - 1, statsYear, statsYear + 1].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {statsData ? (
              <>
                {/* KPI globaux du mois */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Total enregistrements', value: statsData.total_records,           color: 'text-primary' },
                    { label: 'Présents',               value: statsData.by_status.present ?? 0, color: 'text-success' },
                    { label: 'Absents',                value: statsData.by_status.absent ?? 0,  color: 'text-destructive' },
                    { label: 'En retard',              value: statsData.by_status.late ?? 0,    color: 'text-warning' },
                  ].map((s) => (
                    <div key={s.label} className="border border-border bg-card rounded-xl shadow-sm p-4">
                      <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Répartition par département */}
                {statsData.by_department.length > 0 && (
                  <div className="border border-border bg-card rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-border">
                      <h3 className="font-semibold text-foreground">Répartition par département</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {MONTH_NAMES[statsMonth - 1]} {statsYear}
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Département</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right text-success">Présents</TableHead>
                            <TableHead className="text-right text-destructive">Absents</TableHead>
                            <TableHead className="text-right text-warning">En retard</TableHead>
                            <TableHead className="text-right">Taux présence</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statsData.by_department.map((dept) => {
                            const rate = dept.total > 0
                              ? Math.round((dept.present / dept.total) * 100)
                              : 0;
                            return (
                              <TableRow key={dept.employee__department__name} className="border-b border-border hover:bg-muted/40">
                                <TableCell className="font-medium">
                                  {dept.employee__department__name || 'Sans département'}
                                </TableCell>
                                <TableCell className="text-right text-sm">{dept.total}</TableCell>
                                <TableCell className="text-right text-sm text-success">{dept.present}</TableCell>
                                <TableCell className="text-right text-sm text-destructive">{dept.absent}</TableCell>
                                <TableCell className="text-right text-sm text-warning">{dept.late}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-success rounded-full"
                                        style={{ width: `${rate}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium">{rate}%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-border bg-card rounded-xl">
                <BarChart2 className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-sm text-muted-foreground">Chargement des statistiques…</p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ══ Modale Création / Édition ══ */}
      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? 'Modifier la présence' : 'Enregistrer une présence'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Employé */}
            <div className="space-y-1.5">
              <Label htmlFor="att-employee">Employé <span className="text-destructive">*</span></Label>
              <SearchableSelect
                id="att-employee"
                value={form.employee}
                onChange={(v) => setForm((f) => ({ ...f, employee: v }))}
                placeholder="Sélectionner un employé"
                searchPlaceholder="Rechercher un employé…"
                emptyText="Aucun employé trouvé."
                options={employees.map((emp: { id: number; user_full_name?: string; user?: { first_name?: string; last_name?: string } }) => ({
                  value: String(emp.id),
                  label: emp.user_full_name ?? `${emp.user?.first_name ?? ''} ${emp.user?.last_name ?? ''}`.trim(),
                }))}
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="att-date">Date <span className="text-destructive">*</span></Label>
              <Input
                id="att-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>

            {/* Statut */}
            <div className="space-y-1.5">
              <Label htmlFor="att-status">Statut <span className="text-destructive">*</span></Label>
              <Select value={form.status} onValueChange={handleStatusChange}>
                <SelectTrigger id="att-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                    <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type d'absence — visible seulement si statut = absent */}
            {form.status === 'absent' && (
              <div className="space-y-1.5">
                <Label htmlFor="att-absence-type">
                  Type d'absence <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.absence_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, absence_type: v as AbsenceType }))}
                >
                  <SelectTrigger id="att-absence-type">
                    <SelectValue placeholder="Choisir le type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ABSENCE_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Heures */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="att-checkin" className="flex items-center gap-1">
                  <LogIn className="h-3.5 w-3.5" /> Arrivée
                </Label>
                <Input
                  id="att-checkin"
                  type="time"
                  value={form.check_in}
                  onChange={(e) => setForm((f) => ({ ...f, check_in: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="att-checkout" className="flex items-center gap-1">
                  <LogOut className="h-3.5 w-3.5" /> Départ
                </Label>
                <Input
                  id="att-checkout"
                  type="time"
                  value={form.check_out}
                  onChange={(e) => setForm((f) => ({ ...f, check_out: e.target.value }))}
                />
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="att-note">Note</Label>
              <Input
                id="att-note"
                placeholder="Observation optionnelle…"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeForm} disabled={isPending}>
              <X className="mr-1 h-4 w-4" /> Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              <Check className="mr-1 h-4 w-4" />
              {editTarget ? 'Enregistrer les modifications' : 'Créer la présence'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Confirmation Suppression ══ */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette présence ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La présence sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
