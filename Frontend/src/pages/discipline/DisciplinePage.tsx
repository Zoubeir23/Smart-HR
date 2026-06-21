import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, ShieldAlert, Ban, UserX,
  Plus, Pencil, Trash2, Check, X, Scale,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { disciplineService, type DisciplinaryActionPayload } from '@/services/disciplineService';
import { employeeService } from '@/services/employeeService';
import SearchableSelect from '@/components/common/SearchableSelect';
import DataPagination, { usePagination } from '@/components/common/DataPagination';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

type ActionType = 'reprimand' | 'warning' | 'suspension' | 'dismissal';

interface DisciplinaryRecord {
  id: number;
  employee: number;
  employee_name: string;
  department_name: string;
  action_type: ActionType;
  action_type_display: string;
  reason: string;
  description: string;
  incident_date: string;
  issued_date: string;
  suspension_start: string | null;
  suspension_end: string | null;
  suspension_duration_days: number | null;
  issued_by_name: string;
  notes: string;
}

interface ActionForm {
  employee: string;
  action_type: ActionType;
  reason: string;
  description: string;
  incident_date: string;
  issued_date: string;
  suspension_start: string;
  suspension_end: string;
  notes: string;
}

const today = new Date().toISOString().slice(0, 10);

const EMPTY_FORM: ActionForm = {
  employee: '',
  action_type: 'warning',
  reason: '',
  description: '',
  incident_date: today,
  issued_date: today,
  suspension_start: '',
  suspension_end: '',
  notes: '',
};

const ACTION_CONFIG: Record<ActionType, { label: string; icon: typeof AlertTriangle; className: string }> = {
  reprimand:  { label: "Rappel à l'ordre",         icon: AlertTriangle, className: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200' },
  warning:    { label: 'Avertissement écrit',       icon: ShieldAlert,   className: 'bg-warning text-warning-foreground' },
  suspension: { label: 'Mise à pied',               icon: Ban,           className: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200' },
  dismissal:  { label: 'Licenciement disciplinaire', icon: UserX,        className: 'bg-destructive/10 text-destructive' },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR');
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase();
}

export default function DisciplinePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canEdit = user?.role === 'RH' || user?.role === 'ADMIN';

  const [filterType, setFilterType] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<DisciplinaryRecord | null>(null);
  const [form, setForm] = useState<ActionForm>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const isSuspension = form.action_type === 'suspension';

  // ── Data ──────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['discipline', filterType],
    queryFn: () => disciplineService.getAll(filterType !== 'all' ? { action_type: filterType } : undefined),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeeService.getAll(),
    enabled: canEdit,
  });

  const employees = employeesData?.results ?? employeesData ?? [];
  const records: DisciplinaryRecord[] = data?.results ?? data ?? [];

  const { pageItems: pagedRecords, currentPage, setCurrentPage, totalPages } = usePagination(records);

  // KPIs
  const countByType = (type: ActionType) => records.filter((r) => r.action_type === type).length;

  // ── Mutations ─────────────────────────────────────────────────────
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['discipline'] });

  const createMutation = useMutation({
    mutationFn: disciplineService.create,
    onSuccess: () => { toast({ title: 'Action disciplinaire créée' }); invalidate(); closeForm(); },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de créer.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<DisciplinaryActionPayload> }) =>
      disciplineService.update(id, payload),
    onSuccess: () => { toast({ title: 'Action mise à jour' }); invalidate(); closeForm(); },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de modifier.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: disciplineService.delete,
    onSuccess: () => { toast({ title: 'Action supprimée' }); invalidate(); setDeleteId(null); },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  // ── Handlers ──────────────────────────────────────────────────────
  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(r: DisciplinaryRecord) {
    setEditTarget(r);
    setForm({
      employee:        String(r.employee),
      action_type:     r.action_type,
      reason:          r.reason,
      description:     r.description ?? '',
      incident_date:   r.incident_date,
      issued_date:     r.issued_date,
      suspension_start: r.suspension_start ?? '',
      suspension_end:   r.suspension_end ?? '',
      notes:           r.notes ?? '',
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditTarget(null);
    setForm(EMPTY_FORM);
  }

  function handleSubmit() {
    const payload: DisciplinaryActionPayload = {
      employee:      Number(form.employee),
      action_type:   form.action_type,
      reason:        form.reason.trim(),
      description:   form.description.trim(),
      incident_date: form.incident_date,
      issued_date:   form.issued_date,
      suspension_start: isSuspension && form.suspension_start ? form.suspension_start : null,
      suspension_end:   isSuspension && form.suspension_end   ? form.suspension_end   : null,
      notes: form.notes.trim(),
    };
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const canSubmit =
    !!form.employee &&
    !!form.reason.trim() &&
    !!form.incident_date &&
    !!form.issued_date &&
    (!isSuspension || (!!form.suspension_start && !!form.suspension_end));

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Chargement…</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Discipline RH</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {canEdit
                ? 'Gérez les sanctions, avertissements et mises à pied.'
                : 'Consultez votre historique disciplinaire.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {(Object.entries(ACTION_CONFIG) as [ActionType, typeof ACTION_CONFIG[ActionType]][]).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canEdit && (
              <Button size="sm" onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Nouvelle sanction
              </Button>
            )}
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.entries(ACTION_CONFIG) as [ActionType, typeof ACTION_CONFIG[ActionType]][]).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div key={key} className="border border-border bg-card rounded-xl shadow-sm p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-foreground">{countByType(key)}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{cfg.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Table ── */}
        <div className="border border-border bg-card rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">
              Historique des actions disciplinaires
              <span className="ml-2 text-sm font-normal text-muted-foreground">({records.length})</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Employé</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden md:table-cell">Motif</TableHead>
                  <TableHead className="hidden sm:table-cell">Date incident</TableHead>
                  <TableHead className="hidden lg:table-cell">Émis le</TableHead>
                  <TableHead className="hidden lg:table-cell">Durée suspension</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRecords.map((record) => {
                  const cfg = ACTION_CONFIG[record.action_type];
                  const Icon = cfg?.icon ?? Scale;
                  return (
                    <TableRow
                      key={record.id}
                      className="border-b border-border hover:bg-muted/40 transition-colors animate-in fade-in"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {getInitials(record.employee_name || 'NN')}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{record.employee_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{record.department_name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs gap-1', cfg?.className ?? '')}>
                          <Icon className="h-3 w-3" />
                          {record.action_type_display}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-48 truncate">
                        {record.reason}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {formatDate(record.incident_date)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDate(record.issued_date)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {record.suspension_duration_days != null
                          ? `${record.suspension_duration_days} jour(s)`
                          : '—'}
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <DataPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            className="pt-4"
          />

          {records.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Scale className="h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-4 text-base font-semibold text-foreground">Aucune action disciplinaire</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {filterType !== 'all' ? 'Aucun résultat pour ce type de sanction.' : 'Aucune sanction enregistrée.'}
              </p>
              {canEdit && filterType === 'all' && (
                <Button className="mt-4 gap-2" onClick={openCreate}>
                  <Plus className="h-4 w-4" /> Créer une sanction
                </Button>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* ══ Modale Création / Édition ══ */}
      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? 'Modifier la sanction' : 'Nouvelle action disciplinaire'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Employé */}
            <div className="space-y-1.5">
              <Label>Employé <span className="text-destructive">*</span></Label>
              <SearchableSelect
                value={form.employee}
                onChange={(v) => setForm((f) => ({ ...f, employee: v }))}
                placeholder="Sélectionner un employé"
                searchPlaceholder="Rechercher…"
                emptyText="Aucun employé trouvé."
                options={employees.map((emp: { id: number; user_full_name?: string; user?: { first_name?: string; last_name?: string } }) => ({
                  value: String(emp.id),
                  label: emp.user_full_name ?? `${emp.user?.first_name ?? ''} ${emp.user?.last_name ?? ''}`.trim(),
                }))}
              />
            </div>

            {/* Type de sanction */}
            <div className="space-y-1.5">
              <Label>Type de sanction <span className="text-destructive">*</span></Label>
              <Select
                value={form.action_type}
                onValueChange={(v) => setForm((f) => ({ ...f, action_type: v as ActionType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(ACTION_CONFIG) as [ActionType, typeof ACTION_CONFIG[ActionType]][]).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Motif */}
            <div className="space-y-1.5">
              <Label>Motif <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Ex : absence injustifiée répétée"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date de l'incident <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.incident_date}
                  onChange={(e) => setForm((f) => ({ ...f, incident_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date d'émission <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.issued_date}
                  onChange={(e) => setForm((f) => ({ ...f, issued_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Dates de suspension (conditionnelles) */}
            {isSuspension && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900">
                <div className="space-y-1.5">
                  <Label>Début mise à pied <span className="text-destructive">*</span></Label>
                  <Input
                    type="date"
                    value={form.suspension_start}
                    onChange={(e) => setForm((f) => ({ ...f, suspension_start: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Fin mise à pied <span className="text-destructive">*</span></Label>
                  <Input
                    type="date"
                    value={form.suspension_end}
                    onChange={(e) => setForm((f) => ({ ...f, suspension_end: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description détaillée</Label>
              <Textarea
                placeholder="Détails de la procédure disciplinaire…"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Notes internes */}
            <div className="space-y-1.5">
              <Label>Notes internes</Label>
              <Textarea
                placeholder="Notes confidentielles RH…"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeForm} disabled={isPending}>
              <X className="mr-1 h-4 w-4" /> Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !canSubmit}>
              <Check className="mr-1 h-4 w-4" />
              {editTarget ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Confirmation Suppression ══ */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette action disciplinaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'enregistrement sera définitivement supprimé.
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
    </DashboardLayout>
  );
}
