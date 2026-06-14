import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, TrendingUp, Users, Clock,
  Plus, Pencil, Trash2, Zap, Check, X, Download,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
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
import { payrollService } from '@/services/payrollService';
import { employeeService } from '@/services/employeeService';
import SearchableSelect from '@/components/common/SearchableSelect';
import DataPagination, { usePagination } from '@/components/common/DataPagination';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

type PayrollStatus = 'paid' | 'pending' | 'processed';

interface PayrollRecord {
  id: number;
  employee: number;
  employee_name: string;
  department_name: string;
  month: string;
  base_salary: string | number;
  bonuses: string | number;
  deductions: string | number;
  net_salary: string | number;
  status: PayrollStatus;
}

interface PayrollForm {
  employee: string;
  month: string;
  base_salary: string;
  bonuses: string;
  deductions: string;
  status: PayrollStatus;
}

const EMPTY_FORM: PayrollForm = {
  employee: '',
  month: new Date().toISOString().slice(0, 7),
  base_salary: '',
  bonuses: '0',
  deductions: '0',
  status: 'pending',
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  paid:      { label: 'Payé',       className: 'bg-success text-success-foreground' },
  pending:   { label: 'En attente', className: 'bg-warning text-warning-foreground' },
  processed: { label: 'Traité',     className: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200' },
};

const MONTHS = [
  { value: '01', label: 'Janvier' }, { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' },    { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' },     { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' }, { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' }, { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' }, { value: '12', label: 'Décembre' },
];
function getYears(rangeBefore = 2, rangeAfter = 2): string[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: rangeBefore + rangeAfter + 1 }, (_, i) => String(currentYear - rangeBefore + i));
}
const YEARS = getYears();

function formatCurrency(amount: string | number): string {
  return new Intl.NumberFormat('fr-FR').format(Number(amount)) + ' FCFA';
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase();
}

export default function PayrollPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // RH et Admin peuvent créer / modifier / supprimer / marquer payé
  const canEdit = user?.role === 'RH' || user?.role === 'ADMIN';

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    String(currentDate.getMonth() + 1).padStart(2, '0'),
  );
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));

  const monthParam = `${selectedYear}-${selectedMonth}`;

  // Modale création / édition
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<PayrollRecord | null>(null);
  const [form, setForm] = useState<PayrollForm>(EMPTY_FORM);

  // Confirmation suppression
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // ── Data ──────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['payroll', monthParam],
    queryFn: () => payrollService.getAll({ month: monthParam }),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeeService.getAll(),
    enabled: canEdit,
  });

  const employees = employeesData?.results ?? employeesData ?? [];
  const payrollRecords: PayrollRecord[] = data?.results ?? data ?? [];
  const { pageItems: pagedRecords, currentPage, setCurrentPage, totalPages } = usePagination(payrollRecords);

  const totalMass    = payrollRecords.reduce((s, r) => s + Number(r.base_salary), 0);
  const averageSalary = payrollRecords.length > 0 ? Math.round(totalMass / payrollRecords.length) : 0;
  const paidCount    = payrollRecords.filter((r) => r.status === 'paid').length;
  const pendingCount = payrollRecords.filter((r) => r.status !== 'paid').length;

  const selectedMonthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label ?? selectedMonth;

  // ── Mutations ─────────────────────────────────────────────────────
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['payroll'] });

  const createMutation = useMutation({
    mutationFn: payrollService.create,
    onSuccess: () => { toast({ title: 'Fiche de paie créée' }); invalidate(); closeForm(); },
    onError:   () => toast({ title: 'Erreur', description: 'Impossible de créer la fiche.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      payrollService.update(id, data),
    onSuccess: () => { toast({ title: 'Fiche mise à jour' }); invalidate(); closeForm(); },
    onError:   () => toast({ title: 'Erreur', description: 'Impossible de modifier la fiche.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: payrollService.delete,
    onSuccess: () => { toast({ title: 'Fiche supprimée' }); invalidate(); setDeleteId(null); },
    onError:   () => toast({ title: 'Erreur', description: 'Impossible de supprimer.', variant: 'destructive' }),
  });

  const markPaidMutation = useMutation({
    mutationFn: payrollService.markPaid,
    onSuccess: () => { toast({ title: '✅ Marqué comme payé — email envoyé à l\'employé' }); invalidate(); },
    onError:   () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  const bulkMutation = useMutation({
    mutationFn: () => payrollService.bulkGenerate(monthParam),
    onSuccess: (res) => {
      toast({ title: `${res.created} fiche(s) créée(s) pour ${monthParam}` });
      invalidate();
    },
    onError: () => toast({ title: 'Erreur lors de la génération en masse', variant: 'destructive' }),
  });

  // ── Handlers ──────────────────────────────────────────────────────
  function openCreate() {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, month: monthParam });
    setShowForm(true);
  }

  function openEdit(r: PayrollRecord) {
    setEditTarget(r);
    setForm({
      employee:    String(r.employee),
      month:       r.month,
      base_salary: String(r.base_salary),
      bonuses:     String(r.bonuses),
      deductions:  String(r.deductions),
      status:      r.status,
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
      employee:    Number(form.employee),
      month:       form.month,
      base_salary: Number(form.base_salary),
      bonuses:     Number(form.bonuses) || 0,
      deductions:  Number(form.deductions) || 0,
      status:      form.status,
    };
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {canEdit ? 'Gestion de la Paie' : 'Mes fiches de paie'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {canEdit
                ? 'Créez, modifiez et gérez les fiches de paie — RH / Admin uniquement.'
                : 'Consultez vos fiches de paie.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtre mois / année */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder="Mois" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-24 h-9">
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Actions RH/Admin */}
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkMutation.mutate()}
                  disabled={bulkMutation.isPending}
                  className="gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Générer tout
                </Button>
                <Button size="sm" onClick={openCreate} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nouvelle fiche
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Masse salariale', value: formatCurrency(totalMass),    icon: DollarSign, color: 'text-primary' },
            { label: 'Salaire moyen',   value: formatCurrency(averageSalary), icon: TrendingUp, color: 'text-success' },
            { label: 'Payés',           value: String(paidCount),             icon: Users,      color: 'text-success' },
            { label: 'En attente',      value: String(pendingCount),          icon: Clock,      color: 'text-warning' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="border border-border bg-card rounded-xl shadow-sm p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className={cn('h-5 w-5', s.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-foreground truncate">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Table ── */}
        <div className="border border-border bg-card rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">
              Fiches de paie — {selectedMonthLabel} {selectedYear}
            </h2>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Exporter
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Employé</TableHead>
                  <TableHead className="hidden sm:table-cell">Département</TableHead>
                  <TableHead className="text-right">Brut</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Déductions</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Statut</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRecords.map((record) => {
                  const sc = STATUS_CONFIG[record.status];
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
                            <span className="font-medium text-sm text-foreground truncate">
                              {record.employee_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {record.department_name || '—'}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium text-foreground">
                          {formatCurrency(record.base_salary)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-destructive hidden md:table-cell">
                          -{formatCurrency(record.deductions)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-bold text-foreground">
                          {formatCurrency(record.net_salary)}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', sc?.className ?? '')}>
                            {sc?.label ?? record.status}
                          </Badge>
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {record.status !== 'paid' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-success hover:bg-success/10"
                                  title="Marquer payé"
                                  onClick={() => markPaidMutation.mutate(record.id)}
                                  disabled={markPaidMutation.isPending}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                              )}
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

          {payrollRecords.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-4 text-base font-semibold text-foreground">Aucune fiche de paie</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Aucune fiche pour {selectedMonthLabel} {selectedYear}.
              </p>
              {canEdit && (
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" className="gap-2" onClick={() => bulkMutation.mutate()}>
                    <Zap className="h-4 w-4" /> Générer automatiquement
                  </Button>
                  <Button className="gap-2" onClick={openCreate}>
                    <Plus className="h-4 w-4" /> Créer manuellement
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* ══ Modale Création / Édition ══ */}
      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? 'Modifier la fiche de paie' : 'Nouvelle fiche de paie'}
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
                searchPlaceholder="Rechercher un employé…"
                emptyText="Aucun employé trouvé."
                options={employees.map((emp: { id: number; user_full_name?: string; user?: { first_name?: string; last_name?: string } }) => ({
                  value: String(emp.id),
                  label: emp.user_full_name ?? `${emp.user?.first_name ?? ''} ${emp.user?.last_name ?? ''}`.trim(),
                }))}
              />
            </div>

            {/* Mois */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Mois <span className="text-destructive">*</span></Label>
                <Select
                  value={form.month.split('-')[1]}
                  onValueChange={(m) => setForm((f) => ({ ...f, month: `${f.month.split('-')[0]}-${m}` }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mois" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Année <span className="text-destructive">*</span></Label>
                <Select
                  value={form.month.split('-')[0]}
                  onValueChange={(y) => setForm((f) => ({ ...f, month: `${y}-${f.month.split('-')[1]}` }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Année" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Salaires */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'base_salary', label: 'Salaire brut *' },
                { key: 'bonuses',     label: 'Primes' },
                { key: 'deductions',  label: 'Déductions' },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            {/* Net calculé */}
            {form.base_salary && (
              <p className="text-sm text-muted-foreground text-right">
                Net estimé :{' '}
                <strong className="text-foreground">
                  {formatCurrency(
                    (Number(form.base_salary) || 0) +
                    (Number(form.bonuses) || 0) -
                    (Number(form.deductions) || 0)
                  )}
                </strong>
              </p>
            )}

            {/* Statut */}
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as PayrollStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                    <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeForm} disabled={isPending}>
              <X className="mr-1 h-4 w-4" /> Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !form.employee || !form.month || !form.base_salary}
            >
              <Check className="mr-1 h-4 w-4" />
              {editTarget ? 'Enregistrer' : 'Créer la fiche'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Confirmation Suppression ══ */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette fiche de paie ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
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
