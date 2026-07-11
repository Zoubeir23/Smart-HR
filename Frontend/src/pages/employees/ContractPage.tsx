import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Pencil, Trash2, Check, X, Users, Clock, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { contractService, type Contract, type ContractPayload, type ContractType } from '@/services/contractService';
import { employeeService } from '@/services/employeeService';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface EmployeeOption {
  id: number;
  user_full_name: string;
}

interface ContractForm {
  employee: number | null;
  contract_type: ContractType;
  start_date: string;
  end_date: string;
  salary: string;
}

const EMPTY_FORM: ContractForm = {
  employee: null,
  contract_type: 'CDI',
  start_date: '',
  end_date: '',
  salary: '',
};

const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  STAGE: 'Stage',
  FREELANCE: 'Freelance',
};

const STATUS_CONFIG = {
  active: { label: 'Actif', className: 'bg-success/10 text-success' },
  expired: { label: 'Expiré', className: 'bg-destructive/10 text-destructive' },
  upcoming: { label: 'À venir', className: 'bg-warning/10 text-warning-foreground' },
};

export default function ContractPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canEdit = user?.role === 'RH' || user?.role === 'ADMIN';

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Contract | null>(null);
  const [form, setForm] = useState<ContractForm>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // ── Data ──────────────────────────────────────────────────────────
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: contractService.getAll,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeeService.getAll(),
  });

  const employees: EmployeeOption[] = employeesData?.results ?? (Array.isArray(employeesData) ? employeesData : []);

  // ── Mutations ─────────────────────────────────────────────────────
  const invalidateContracts = () => queryClient.invalidateQueries({ queryKey: ['contracts'] });

  const createMutation = useMutation({
    mutationFn: (payload: ContractPayload) => contractService.create(payload),
    onSuccess: () => { toast({ title: 'Contrat créé' }); invalidateContracts(); closeForm(); },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de créer le contrat.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ContractPayload> }) =>
      contractService.update(id, payload),
    onSuccess: () => { toast({ title: 'Contrat mis à jour' }); invalidateContracts(); closeForm(); },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de modifier.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: contractService.delete,
    onSuccess: () => { toast({ title: 'Contrat supprimé' }); invalidateContracts(); setDeleteId(null); },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de supprimer.', variant: 'destructive' }),
  });

  // ── Handlers ──────────────────────────────────────────────────────
  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(contract: Contract) {
    setEditTarget(contract);
    setForm({
      employee: contract.employee,
      contract_type: contract.contract_type,
      start_date: contract.start_date,
      end_date: contract.end_date ?? '',
      salary: contract.salary,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditTarget(null);
    setForm(EMPTY_FORM);
  }

  function buildPayload(): ContractPayload | null {
    if (!form.employee || !form.start_date || !form.salary || parseFloat(form.salary) <= 0) return null;
    return {
      employee: form.employee,
      contract_type: form.contract_type,
      start_date: form.start_date,
      end_date: form.end_date || null,
      salary: parseFloat(form.salary),
    };
  }

  function handleSubmit() {
    const payload = buildPayload();
    if (!payload) return;
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isFormValid = Boolean(
    form.employee &&
      form.start_date &&
      form.salary &&
      (form.contract_type === 'CDI' || form.end_date),
  );

  async function downloadContractPdf(contract: Contract) {
    try {
      const response = await api.get(`/personnel/contracts/${contract.id}/export_pdf/`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `contrat_${contract.employee_full_name.replace(/\s+/g, '_')}_${contract.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de générer le PDF.', variant: 'destructive' });
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────
  const activeCount = contracts.filter((c) => c.status === 'active').length;
  const expiringCount = contracts.filter((c) => c.status === 'expired').length;

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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Contrats</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {canEdit
                ? 'Gérez les contrats des employés — RH / Admin uniquement.'
                : 'Liste des contrats de l\'entreprise.'}
            </p>
          </div>
          {canEdit && (
            <Button onClick={openCreate} className="gap-2 self-start sm:self-auto">
              <Plus className="h-4 w-4" />
              Nouveau contrat
            </Button>
          )}
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="border border-border bg-card rounded-xl shadow-sm p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{contracts.length}</p>
              <p className="text-xs text-muted-foreground">Total contrats</p>
            </div>
          </div>
          <div className="border border-border bg-card rounded-xl shadow-sm p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Actifs</p>
            </div>
          </div>
          <div className="border border-border bg-card rounded-xl shadow-sm p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
              <Clock className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{expiringCount}</p>
              <p className="text-xs text-muted-foreground">Expirés</p>
            </div>
          </div>
        </div>

        {/* ── Liste des contrats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {contracts.map((contract) => {
              const statusConfig = STATUS_CONFIG[contract.status] ?? STATUS_CONFIG.active;
              return (
                <motion.div
                  key={contract.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="group border border-border bg-card rounded-xl shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {contract.employee_full_name}
                        </h3>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
                          {CONTRACT_TYPE_LABELS[contract.contract_type]}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => downloadContractPdf(contract)}
                        title="Exporter PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      {canEdit && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(contract)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteId(contract.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-sm text-muted-foreground pt-1 border-t border-border">
                    <div className="flex justify-between">
                      <span>Début</span>
                      <span className="font-medium text-foreground">{contract.start_date}</span>
                    </div>
                    {contract.end_date && (
                      <div className="flex justify-between">
                        <span>Fin</span>
                        <span className="font-medium text-foreground">{contract.end_date}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Salaire</span>
                      <span className="font-medium text-foreground">
                        {Number(contract.salary).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Statut</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusConfig.className}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {contracts.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-base font-semibold text-foreground">Aucun contrat</h3>
            <p className="mt-1 text-sm text-muted-foreground">Commencez par créer le premier contrat.</p>
            {canEdit && (
              <Button className="mt-4 gap-2" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Créer un contrat
              </Button>
            )}
          </div>
        )}
      </motion.div>

      {/* ══ Modale Création / Édition ══ */}
      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? 'Modifier le contrat' : 'Nouveau contrat'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="contract-employee">
                Employé <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.employee !== null ? String(form.employee) : ''}
                onValueChange={(value) =>
                  setForm((previous) => ({ ...previous, employee: Number(value) }))
                }
                disabled={Boolean(editTarget)}
              >
                <SelectTrigger id="contract-employee">
                  <SelectValue placeholder="Sélectionner un employé" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={String(employee.id)}>
                      {employee.user_full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contract-type">Type de contrat</Label>
              <Select
                value={form.contract_type}
                onValueChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    contract_type: value as ContractType,
                    end_date: value === 'CDI' ? '' : previous.end_date,
                  }))
                }
              >
                <SelectTrigger id="contract-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(CONTRACT_TYPE_LABELS) as [ContractType, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="contract-start">
                  Date de début <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contract-start"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((previous) => ({ ...previous, start_date: e.target.value }))}
                />
              </div>
              {form.contract_type !== 'CDI' && (
                <div className="space-y-1.5">
                  <Label htmlFor="contract-end">
                    Date de fin <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contract-end"
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm((previous) => ({ ...previous, end_date: e.target.value }))}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contract-salary">
                Salaire (FCFA) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contract-salary"
                type="number"
                min="0"
                placeholder="ex : 500000"
                value={form.salary}
                onChange={(e) => setForm((previous) => ({ ...previous, salary: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeForm} disabled={isPending}>
              <X className="mr-1 h-4 w-4" /> Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !isFormValid}>
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
            <AlertDialogTitle>Supprimer ce contrat ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le contrat sera définitivement supprimé.
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
