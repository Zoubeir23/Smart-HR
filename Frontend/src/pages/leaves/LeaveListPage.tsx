import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leaveService } from '@/services/leaveService';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { Calendar, List, Plus, Check, X, ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import DataPagination, { usePagination } from '@/components/common/DataPagination';

type LeaveStatus = 'pending' | 'approved' | 'rejected';
type StatusFilter = 'all' | LeaveStatus;

interface LeaveItem {
  id: number;
  employee: number;
  employee_name: string;
  leave_type: string;
  leave_type_display: string;
  status: LeaveStatus;
  status_display: string;
  start_date: string;
  end_date: string;
  reason: string;
  duration_days: number;
  duration_working_days: number;
  is_deductible: boolean;
}

const MONTH_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const LEAVE_TYPE_OPTIONS = [
  { value: 'vacation',    label: 'Congé annuel' },
  { value: 'sick',        label: 'Congé maladie' },
  { value: 'personal',    label: 'Congé personnel' },
  { value: 'maternity',   label: 'Congé maternité' },
  { value: 'exceptional', label: 'Permission exceptionnelle' },
  { value: 'wedding',     label: 'Congé mariage' },
  { value: 'moving',      label: 'Congé déménagement' },
  { value: 'other',       label: 'Autre' },
];

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all',      label: 'Tous' },
  { value: 'pending',  label: 'En attente' },
  { value: 'approved', label: 'Approuvés' },
  { value: 'rejected', label: 'Refusés' },
];

const STATUS_CHIP: Record<LeaveStatus, string> = {
  approved: 'bg-success/15 text-success border-success/30',
  pending:  'bg-warning/15 text-warning border-warning/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
};

function formatLocalDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR');
}

function toLocalMidnight(value?: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function buildMonthGrid(month: Date): Date[] {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - mondayOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + i);
    return day;
  });
}

export default function LeaveListPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isManager = user?.role === 'RH' || user?.role === 'ADMIN';

  const [viewMode, setViewMode]         = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [calendarMonth, setCalendarMonth] = useState<Date>(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newLeave, setNewLeave] = useState({
    leave_type: '', start_date: '', end_date: '', reason: '',
  });

  const todayISO = new Date().toISOString().split('T')[0];

  // ── Data ─────────────────────────────────────────────────────────
  const { data: leavesData, isLoading } = useQuery({
    queryKey: ['leaves', statusFilter],
    queryFn: () => leaveService.getAll(
      statusFilter !== 'all' ? { status: statusFilter } : undefined,
    ),
  });
  const leaves: LeaveItem[] = leavesData?.results ?? leavesData ?? [];

  const { data: balanceData } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: () => leaveService.getBalance(),
  });

  const { pageItems: pagedLeaves, currentPage, setCurrentPage, totalPages } = usePagination(leaves);

  // ── Validation ───────────────────────────────────────────────────
  function validateLeaveForm(): boolean {
    if (!newLeave.leave_type) {
      toast({ title: 'Champ requis', description: 'Sélectionnez un type de congé.', variant: 'destructive' });
      return false;
    }
    if (!newLeave.start_date || newLeave.start_date < todayISO) {
      toast({ title: 'Date invalide', description: 'La date de début ne peut pas être dans le passé.', variant: 'destructive' });
      return false;
    }
    if (!newLeave.end_date || newLeave.end_date < newLeave.start_date) {
      toast({ title: 'Date invalide', description: 'La date de fin doit être après la date de début.', variant: 'destructive' });
      return false;
    }
    return true;
  }

  // ── Mutations ─────────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['leaves'] });
    queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof newLeave) => leaveService.create(data),
    onSuccess: () => {
      invalidate();
      setIsDialogOpen(false);
      setNewLeave({ leave_type: '', start_date: '', end_date: '', reason: '' });
      toast({ title: 'Demande envoyée', description: 'Votre demande de congé a été soumise.' });
    },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de créer la demande.', variant: 'destructive' }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => leaveService.approve(id),
    onSuccess: () => { invalidate(); toast({ title: 'Congé approuvé' }); },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => leaveService.reject(id),
    onSuccess: () => { invalidate(); toast({ title: 'Congé refusé' }); },
  });

  // ── Calendar helpers ──────────────────────────────────────────────
  function leavesForDay(day: Date): LeaveItem[] {
    const target = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    return leaves.filter((leave) => {
      const start = toLocalMidnight(leave.start_date);
      const end   = toLocalMidnight(leave.end_date) ?? start;
      if (!start || !end) return false;
      return target >= start.getTime() && target <= end.getTime();
    });
  }

  function getStatusBadge(s: string) {
    if (s === 'approved') return <Badge variant="success">Approuvé</Badge>;
    if (s === 'rejected') return <Badge variant="inactive">Rejeté</Badge>;
    return <Badge variant="warning">En attente</Badge>;
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isManager ? 'Gestion des Congés' : 'Mes congés'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isManager ? 'Gérez les demandes de congés de votre équipe.' : 'Demandez et suivez vos congés.'}
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle demande
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nouvelle demande de congé</DialogTitle>
                <DialogDescription>Remplissez le formulaire pour soumettre votre demande.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="leave-type">Type de congé <span className="text-destructive">*</span></Label>
                  <Select value={newLeave.leave_type} onValueChange={(v) => setNewLeave((f) => ({ ...f, leave_type: v }))}>
                    <SelectTrigger id="leave-type"><SelectValue placeholder="Sélectionnez un type" /></SelectTrigger>
                    <SelectContent>
                      {LEAVE_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="start-date">Date de début <span className="text-destructive">*</span></Label>
                  <Input
                    id="start-date" type="date" min={todayISO}
                    value={newLeave.start_date}
                    onChange={(e) => setNewLeave((f) => ({ ...f, start_date: e.target.value, end_date: '' }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end-date">Date de fin <span className="text-destructive">*</span></Label>
                  <Input
                    id="end-date" type="date" min={newLeave.start_date || todayISO}
                    value={newLeave.end_date}
                    onChange={(e) => setNewLeave((f) => ({ ...f, end_date: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reason">Motif</Label>
                  <Textarea
                    id="reason" rows={3} placeholder="Motif optionnel…"
                    value={newLeave.reason}
                    onChange={(e) => setNewLeave((f) => ({ ...f, reason: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                <Button
                  onClick={() => { if (validateLeaveForm()) createMutation.mutate(newLeave); }}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Soumission…' : 'Soumettre'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Carte solde (employé) ── */}
        {balanceData && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Allocation annuelle', value: `${balanceData.annual_allowance} j`, color: 'text-primary' },
              { label: 'Jours pris',          value: `${balanceData.days_taken} j`,       color: 'text-destructive' },
              { label: 'En attente',           value: `${balanceData.days_pending} j`,     color: 'text-warning' },
              { label: 'Jours restants',       value: `${balanceData.days_remaining} j`,   color: 'text-success' },
            ].map((s) => (
              <div key={s.label} className="border border-border bg-card rounded-xl shadow-sm p-4">
                <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Toolbar ── */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Vue */}
            <div className="flex gap-1">
              <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}>
                <List className="mr-1 h-4 w-4" /> Liste
              </Button>
              <Button variant={viewMode === 'calendar' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('calendar')}>
                <Calendar className="mr-1 h-4 w-4" /> Calendrier
              </Button>
            </div>

            {/* Filtre statut */}
            {viewMode === 'list' && (
              <>
                <div className="h-5 w-px bg-border hidden sm:block" />
                <div className="flex gap-1 flex-wrap">
                  {STATUS_FILTER_OPTIONS.map((f) => (
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
              </>
            )}
          </div>
        </Card>

        {/* ══ VUE LISTE ══ */}
        {viewMode === 'list' && (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {isManager && <TableHead>Employé</TableHead>}
                    <TableHead>Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead className="hidden md:table-cell">Durée</TableHead>
                    <TableHead className="hidden lg:table-cell">Déductible</TableHead>
                    <TableHead>Statut</TableHead>
                    {isManager && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedLeaves.map((leave) => (
                    <TableRow key={leave.id}>
                      {isManager && (
                        <TableCell className="font-medium text-sm">{leave.employee_name}</TableCell>
                      )}
                      <TableCell className="text-sm">
                        {leave.leave_type_display || leave.leave_type}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatLocalDate(leave.start_date)}</div>
                          <div className="text-muted-foreground">
                            au {formatLocalDate(leave.end_date)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {leave.duration_working_days ?? leave.duration_days} j ouvré{(leave.duration_working_days ?? leave.duration_days) > 1 ? 's' : ''}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant={leave.is_deductible ? 'destructive' : 'secondary'} className="text-xs">
                          {leave.is_deductible ? 'Déductible' : 'Non déductible'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(leave.status)}</TableCell>
                      {isManager && (
                        <TableCell className="text-right">
                          {leave.status === 'pending' ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                className="bg-success text-success-foreground hover:bg-success/90"
                                onClick={() => approveMutation.mutate(leave.id)}
                                disabled={approveMutation.isPending}
                              >
                                <Check className="mr-1 h-4 w-4" /> Valider
                              </Button>
                              <Button
                                size="sm"
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => rejectMutation.mutate(leave.id)}
                                disabled={rejectMutation.isPending}
                              >
                                <X className="mr-1 h-4 w-4" /> Refuser
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {leaves.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground/40" />
                <h3 className="mt-4 font-semibold text-foreground">Aucun congé</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {statusFilter !== 'all' ? 'Aucun congé pour ce filtre.' : 'Aucune demande de congé enregistrée.'}
                </p>
              </div>
            )}
            <DataPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              className="px-4 py-3 border-t border-border"
            />
          </Card>
        )}

        {/* ══ VUE CALENDRIER ══ */}
        {viewMode === 'calendar' && (
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline" size="icon" className="h-9 w-9"
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="font-semibold text-foreground">
                {MONTH_LABELS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </h3>
              <Button
                variant="outline" size="icon" className="h-9 w-9"
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground p-2">{d}</div>
              ))}
              {buildMonthGrid(calendarMonth).map((day, index) => {
                const inMonth = day.getMonth() === calendarMonth.getMonth();
                const isToday  = isSameDay(day, new Date());
                const dayLeaves = leavesForDay(day);
                return (
                  <div
                    key={index}
                    className={cn(
                      'flex min-h-[84px] flex-col gap-1 rounded-lg border p-1.5 transition-colors',
                      inMonth ? 'border-border bg-card' : 'border-transparent bg-muted/30',
                      isToday && 'ring-2 ring-primary border-primary/40',
                    )}
                  >
                    <div className={cn(
                      'text-xs font-medium',
                      inMonth ? 'text-foreground' : 'text-muted-foreground/50',
                      isToday && 'font-bold text-primary',
                    )}>
                      {day.getDate()}
                    </div>
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      {dayLeaves.slice(0, 3).map((leave) => (
                        <div
                          key={leave.id}
                          className={cn(
                            'truncate rounded border px-1 py-0.5 text-[10px] font-medium',
                            STATUS_CHIP[leave.status],
                          )}
                          title={`${leave.employee_name} — ${leave.leave_type_display}`}
                        >
                          {isManager ? leave.employee_name : leave.leave_type_display}
                        </div>
                      ))}
                      {dayLeaves.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{dayLeaves.length - 3}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success" /> Approuvé
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-warning" /> En attente
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-destructive" /> Rejeté
              </span>
            </div>
          </Card>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
