import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, TrendingUp, Users, Clock,
  Plus, Pencil, Trash2, Zap, Check, X, Download,
  FileText, BarChart2, List, Printer,
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
  employee_email: string;
  department_name: string;
  month: string;
  base_salary: string | number;
  bonuses: string | number;
  deductions: string | number;
  gross_salary: string | number;
  net_salary: string | number;
  status: PayrollStatus;
  status_display: string;
}

interface PayrollForm {
  employee: string;
  month: string;
  base_salary: string;
  bonuses: string;
  deductions: string;
  status: PayrollStatus;
}

interface DepartmentStat {
  employee__department__name: string | null;
  count: number;
  total_net: string | number;
}

interface PayrollStats {
  month: string;
  total_payrolls: number;
  total_net_salary: string | number;
  by_status: Record<string, number>;
  by_department: DepartmentStat[];
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

function formatMonthLabel(monthParam: string): string {
  const [year, month] = monthParam.split('-');
  const label = MONTHS.find((m) => m.value === month)?.label ?? month;
  return `${label} ${year}`;
}

function printPayslip(record: PayrollRecord): void {
  const monthLabel = formatMonthLabel(record.month);
  const statusLabel = STATUS_CONFIG[record.status]?.label ?? record.status;
  const generatedOn = new Date().toLocaleDateString('fr-FR');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bulletin de paie — ${record.employee_name} — ${monthLabel}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 48px; color: #1c1410; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #D62828; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { color: #D62828; font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    .employee-name { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
    .meta { font-size: 13px; color: #555; }
    .period-label { font-size: 12px; color: #888; margin-bottom: 4px; }
    .period { font-size: 16px; font-weight: 700; }
    .status { display: inline-block; margin-top: 8px; padding: 3px 10px; background: #e8f5e9; color: #2e7d32; border-radius: 4px; font-size: 12px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 11px 0; font-size: 14px; border-bottom: 1px solid #eee; }
    td.amount { text-align: right; font-weight: 600; }
    td.bonus  { color: #2e7d32; }
    td.deduct { color: #c62828; }
    tr.total td { font-size: 16px; font-weight: 700; border-bottom: none; border-top: 2px solid #1c1410; padding-top: 14px; }
    tr.total td.amount { color: #D62828; }
    .footer { margin-top: 48px; font-size: 11px; color: #aaa; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Smart-HR</div>
      <p class="employee-name">${record.employee_name}</p>
      <p class="meta">${record.employee_email ?? ''}</p>
      <p class="meta">${record.department_name || 'Sans département'}</p>
    </div>
    <div style="text-align:right">
      <div class="period-label">Période</div>
      <div class="period">${monthLabel}</div>
      <span class="status">${statusLabel}</span>
    </div>
  </div>
  <table>
    <tr><td>Salaire de base</td><td class="amount">${formatCurrency(record.base_salary)}</td></tr>
    <tr><td>Primes / Ancienneté</td><td class="amount bonus">+ ${formatCurrency(record.bonuses)}</td></tr>
    <tr><td>Déductions</td><td class="amount deduct">- ${formatCurrency(record.deductions)}</td></tr>
    <tr class="total"><td>Net à payer</td><td class="amount">${formatCurrency(record.net_salary)}</td></tr>
  </table>
  <div class="footer">Document généré le ${generatedOn} — Smart-HR · Confidentiel</div>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}

function exportToCSV(records: PayrollRecord[], monthParam: string): void {
  const headers = ['Employé', 'Email', 'Département', 'Mois', 'Brut', 'Primes', 'Déductions', 'Net', 'Statut'];
  const rows = records.map((r) => [
    r.employee_name,
    r.employee_email ?? '',
    r.department_name ?? '',
    r.month,
    Number(r.base_salary),
    Number(r.bonuses),
    Number(r.deductions),
    Number(r.net_salary),
    r.status_display ?? r.status,
  ]);
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fiches-paie-${monthParam}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

type ActiveTab = 'list' | 'stats';

export default function PayrollPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canEdit = user?.role === 'RH' || user?.role === 'ADMIN';

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    String(currentDate.getMonth() + 1).padStart(2, '0'),
  );
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));
  const [activeTab, setActiveTab] = useState<ActiveTab>('list');

  const monthParam = `${selectedYear}-${selectedMonth}`;

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<PayrollRecord | null>(null);
  const [form, setForm] = useState<PayrollForm>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [slipRecord, setSlipRecord] = useState<PayrollRecord | null>(null);

  // ── Data ──────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['payroll', monthParam],
    queryFn: () => payrollService.getAll({ month: monthParam }),
  });

  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['payroll-stats', monthParam],
    queryFn: () => payrollService.getStats(monthParam),
    enabled: activeTab === 'stats',
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeeService.getAll(),
    enabled: canEdit,
  });

  const employees = employeesData?.results ?? employeesData ?? [];
  const payrollRecords: PayrollRecord[] = data?.results ?? data ?? [];
  const stats: PayrollStats | null = statsData ?? null;

  const { pageItems: pagedRecords, currentPage, setCurrentPage, totalPages } = usePagination(payrollRecords);

  const totalMass     = payrollRecords.reduce((s, r) => s + Number(r.base_salary), 0);
  const averageSalary = payrollRecords.length > 0 ? Math.round(totalMass / payrollRecords.length) : 0;
  const paidCount     = payrollRecords.filter((r) => r.status === 'paid').length;
  const pendingCount  = payrollRecords.filter((r) => r.status !== 'paid').length;

  // ── Mutations ─────────────────────────────────────────────────────
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['payroll'] });

  const createMutation = useMutation({
    mutationFn: payrollService.create,
    onSuccess: () => { toast({ title: 'Fiche de paie créée' }); invalidate(); closeForm(); },
    onError:   () => toast({ title: 'Erreur', description: 'Impossible de créer la fiche.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: payload }: { id: number; data: Record<string, unknown> }) =>
      payrollService.update(id, payload),
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
    onSuccess: () => { toast({ title: 'Marqué comme payé — email envoyé à l\'employé' }); invalidate(); },
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
            { label: 'Masse salariale', value: formatCurrency(totalMass),     icon: DollarSign, color: 'text-primary' },
            { label: 'Salaire moyen',   value: formatCurrency(averageSalary),  icon: TrendingUp, color: 'text-success' },
            { label: 'Payés',           value: String(paidCount),              icon: Users,      color: 'text-success' },
            { label: 'En attente',      value: String(pendingCount),           icon: Clock,      color: 'text-warning' },
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

        {/* ── Tabs ── */}
        <div className="flex gap-1 border-b border-border">
          {([
            { key: 'list',  label: 'Fiches de paie', icon: List },
            { key: 'stats', label: 'Analyse masse salariale', icon: BarChart2 },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ══ Tab: Liste ══ */}
        {activeTab === 'list' && (
          <div className="border border-border bg-card rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">
                Fiches — {formatMonthLabel(monthParam)}
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => exportToCSV(payrollRecords, monthParam)}
                disabled={payrollRecords.length === 0}
              >
                <Download className="h-4 w-4" />
                Exporter CSV
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Employé</TableHead>
                    <TableHead className="hidden sm:table-cell">Département</TableHead>
                    <TableHead className="text-right">Brut</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Primes</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Déductions</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                        <TableCell className="text-right text-sm text-success hidden md:table-cell">
                          +{formatCurrency(record.bonuses)}
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
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Voir la fiche"
                              onClick={() => setSlipRecord(record)}
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                            {canEdit && record.status !== 'paid' && (
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
                            {canEdit && (
                              <>
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
                              </>
                            )}
                          </div>
                        </TableCell>
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
                  Aucune fiche pour {formatMonthLabel(monthParam)}.
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
        )}

        {/* ══ Tab: Stats ══ */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            {isStatsLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">Chargement des statistiques…</p>
              </div>
            ) : stats ? (
              <>
                {/* Cards résumé */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Total fiches',        value: String(stats.total_payrolls) },
                    { label: 'Masse salariale nette', value: formatCurrency(stats.total_net_salary) },
                    { label: 'Mois analysé',         value: formatMonthLabel(monthParam) },
                  ].map((s) => (
                    <div key={s.label} className="border border-border bg-card rounded-xl shadow-sm p-4">
                      <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                      <p className="text-lg font-bold text-foreground">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Par statut */}
                <div className="border border-border bg-card rounded-xl shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Répartition par statut</h3>
                  <div className="space-y-3">
                    {Object.entries(stats.by_status).map(([statusKey, count]) => {
                      const cfg = STATUS_CONFIG[statusKey];
                      const total = stats.total_payrolls || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={statusKey} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{cfg?.label ?? statusKey}</span>
                            <span className="font-medium text-foreground">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all', {
                                'bg-success': statusKey === 'paid',
                                'bg-warning': statusKey === 'pending',
                                'bg-blue-500': statusKey === 'processed',
                              })}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Par département */}
                {stats.by_department.length > 0 && (
                  <div className="border border-border bg-card rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border">
                      <h3 className="text-sm font-semibold text-foreground">Masse salariale par département</h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Département</TableHead>
                          <TableHead className="text-center">Effectif</TableHead>
                          <TableHead className="text-right">Total net</TableHead>
                          <TableHead className="text-right">Part</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.by_department.map((dept) => {
                          const totalNet = Number(stats.total_net_salary) || 1;
                          const deptNet  = Number(dept.total_net);
                          const share    = Math.round((deptNet / totalNet) * 100);
                          return (
                            <TableRow key={dept.employee__department__name ?? 'none'} className="border-b border-border">
                              <TableCell className="font-medium text-sm">
                                {dept.employee__department__name ?? 'Sans département'}
                              </TableCell>
                              <TableCell className="text-center text-sm text-muted-foreground">
                                {dept.count}
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium text-foreground">
                                {formatCurrency(dept.total_net)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full bg-primary rounded-full" style={{ width: `${share}%` }} />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-8 text-right">{share}%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BarChart2 className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-sm text-muted-foreground">Aucune donnée pour ce mois.</p>
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
              {editTarget ? 'Modifier la fiche de paie' : 'Nouvelle fiche de paie'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Mois <span className="text-destructive">*</span></Label>
                <Select
                  value={form.month.split('-')[1]}
                  onValueChange={(m) => setForm((f) => ({ ...f, month: `${f.month.split('-')[0]}-${m}` }))}
                >
                  <SelectTrigger><SelectValue placeholder="Mois" /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Année <span className="text-destructive">*</span></Label>
                <Select
                  value={form.month.split('-')[0]}
                  onValueChange={(y) => setForm((f) => ({ ...f, month: `${y}-${f.month.split('-')[1]}` }))}
                >
                  <SelectTrigger><SelectValue placeholder="Année" /></SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

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

            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as PayrollStatus }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
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

      {/* ══ Modale Fiche de Paie (impression) ══ */}
      <Dialog open={slipRecord !== null} onOpenChange={(open) => !open && setSlipRecord(null)}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>Bulletin de Paie</DialogTitle>
          </DialogHeader>
          {slipRecord && (
            <div id="payslip-print" className="space-y-4 py-2 text-sm">
              <div className="flex justify-between items-start border-b border-border pb-3">
                <div>
                  <p className="font-bold text-foreground text-base">{slipRecord.employee_name}</p>
                  <p className="text-muted-foreground">{slipRecord.employee_email}</p>
                  <p className="text-muted-foreground">{slipRecord.department_name || 'Sans département'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Période</p>
                  <p className="font-semibold text-foreground">{formatMonthLabel(slipRecord.month)}</p>
                  <Badge className={cn('text-xs mt-1', STATUS_CONFIG[slipRecord.status]?.className ?? '')}>
                    {STATUS_CONFIG[slipRecord.status]?.label ?? slipRecord.status}
                  </Badge>
                </div>
              </div>

              <table className="w-full">
                <tbody className="divide-y divide-border">
                  {[
                    { label: 'Salaire de base',  value: formatCurrency(slipRecord.base_salary),  className: '' },
                    { label: 'Primes / Ancienneté', value: `+ ${formatCurrency(slipRecord.bonuses)}`, className: 'text-success' },
                    { label: 'Déductions',        value: `- ${formatCurrency(slipRecord.deductions)}`, className: 'text-destructive' },
                  ].map(({ label, value, className }) => (
                    <tr key={label}>
                      <td className="py-2 text-muted-foreground">{label}</td>
                      <td className={cn('py-2 text-right font-medium', className)}>{value}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-3 text-foreground text-base border-t-2 border-border">Net à payer</td>
                    <td className="py-3 text-right text-primary text-base border-t-2 border-border">
                      {formatCurrency(slipRecord.net_salary)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSlipRecord(null)}>
              <X className="mr-1 h-4 w-4" /> Fermer
            </Button>
            <Button onClick={() => slipRecord && printPayslip(slipRecord)} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Confirmation Suppression ══ */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette fiche de paie ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
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
