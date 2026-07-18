import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart2, DollarSign, Clock, Gift, List, Plus, TrendingUp, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { payrollService } from '@/services/payrollService';
import { employeeService } from '@/services/employeeService';
import DataPagination, { usePagination } from '@/components/common/DataPagination';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import BenefitsTab from '@/components/payroll/BenefitsTab';
import { DeletePayrollDialog } from '@/components/payroll/DeletePayrollDialog';
import { PayrollFormDialog } from '@/components/payroll/PayrollFormDialog';
import { PayrollListTab } from '@/components/payroll/PayrollListTab';
import { PayrollStatsTab } from '@/components/payroll/PayrollStatsTab';
import { PayslipDialog } from '@/components/payroll/PayslipDialog';
import { EMPTY_FORM, MONTHS, YEARS } from '@/components/payroll/payrollConstants';
import { exportToCSV } from '@/components/payroll/payrollCsvExport';
import { formatCurrency } from '@/components/payroll/payrollHelpers';
import type { PayrollForm, PayrollRecord, PayrollStats } from '@/components/payroll/payrollTypes';

type ActiveTab = 'list' | 'stats' | 'benefits';

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
            { key: 'benefits', label: 'Compensations & bénéfices', icon: Gift },
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

        {activeTab === 'list' && (
          <PayrollListTab
            payrollRecords={payrollRecords}
            pagedRecords={pagedRecords}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
            monthParam={monthParam}
            canEdit={canEdit}
            isMarkPaidPending={markPaidMutation.isPending}
            isBulkGeneratePending={bulkMutation.isPending}
            onMarkPaid={(id) => markPaidMutation.mutate(id)}
            onViewSlip={setSlipRecord}
            onEdit={openEdit}
            onDelete={setDeleteId}
            onExportCsv={() => exportToCSV(payrollRecords, monthParam)}
            onBulkGenerate={() => bulkMutation.mutate()}
            onCreate={openCreate}
          />
        )}

        {activeTab === 'stats' && (
          <PayrollStatsTab isLoading={isStatsLoading} stats={stats} monthParam={monthParam} />
        )}

        {activeTab === 'benefits' && <BenefitsTab />}
      </motion.div>

      <PayrollFormDialog
        isOpen={showForm}
        isEditing={editTarget !== null}
        isPending={isPending}
        form={form}
        employees={employees}
        onFormChange={setForm}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />

      <PayslipDialog record={slipRecord} onClose={() => setSlipRecord(null)} />

      <DeletePayrollDialog
        deleteId={deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={(id) => deleteMutation.mutate(id)}
      />
    </>
  );
}
