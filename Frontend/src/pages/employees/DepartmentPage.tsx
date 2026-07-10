import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Users, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
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
import { departmentService, UNIT_TYPE_OPTIONS } from '@/services/departmentService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Department {
  id: number;
  name: string;
  description: string;
  unit_type?: string;
  unit_type_display?: string;
  parent?: number | null;
  parent_name?: string | null;
  employee_count: number;
  total_salary?: number;
}

interface DeptForm {
  name: string;
  description: string;
  unit_type: string;
  parent: string;
}

const EMPTY_FORM: DeptForm = { name: '', description: '', unit_type: 'department', parent: '' };

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

export default function DepartmentPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // RH et Admin peuvent créer / modifier / supprimer
  const canEdit = user?.role === 'RH' || user?.role === 'ADMIN';

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [form, setForm] = useState<DeptForm>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // ── Data ──────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentService.getAll,
  });

  const departments: Department[] = data?.results ?? data ?? [];

  // ── Mutations ─────────────────────────────────────────────────────
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['departments'] });

  const createMutation = useMutation({
    mutationFn: departmentService.create,
    onSuccess: () => { toast({ title: 'Unité organisationnelle créée' }); invalidate(); closeForm(); },
    onError:   () => toast({ title: 'Erreur', description: 'Impossible de créer l\'unité organisationnelle.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DeptForm> & { parent?: number | null } }) =>
      departmentService.update(id, data),
    onSuccess: () => { toast({ title: 'Unité organisationnelle mise à jour' }); invalidate(); closeForm(); },
    onError:   () => toast({ title: 'Erreur', description: 'Impossible de modifier.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: departmentService.delete,
    onSuccess: () => { toast({ title: 'Unité organisationnelle supprimée' }); invalidate(); setDeleteId(null); },
    onError:   () => toast({ title: 'Erreur', description: 'Impossible de supprimer.', variant: 'destructive' }),
  });

  // ── Handlers ──────────────────────────────────────────────────────
  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(dept: Department) {
    setEditTarget(dept);
    setForm({
      name: dept.name,
      description: dept.description,
      unit_type: dept.unit_type ?? 'department',
      parent: dept.parent ? String(dept.parent) : '',
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditTarget(null);
    setForm(EMPTY_FORM);
  }

  function handleSubmit() {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name,
      description: form.description,
      unit_type: form.unit_type,
      parent: form.parent ? Number(form.parent) : null,
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Unités organisationnelles</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {canEdit
                ? 'Gérez les unités organisationnelles de l\'entreprise (directions, départements, services…) — RH / Admin uniquement.'
                : 'Liste des unités organisationnelles de l\'entreprise.'}
            </p>
          </div>
          {canEdit && (
            <Button onClick={openCreate} className="gap-2 self-start sm:self-auto">
              <Plus className="h-4 w-4" />
              Nouvelle unité
            </Button>
          )}
        </div>

        {/* ── KPI rapide ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="border border-border bg-card rounded-xl shadow-sm p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{departments.length}</p>
              <p className="text-xs text-muted-foreground">Unités organisationnelles</p>
            </div>
          </div>
          <div className="border border-border bg-card rounded-xl shadow-sm p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {departments.reduce((s, d) => s + d.employee_count, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Employés actifs</p>
            </div>
          </div>
        </div>

        {/* ── Grille des départements ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {departments.map((dept) => (
              <motion.div
                key={dept.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="group border border-border bg-card rounded-xl shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-foreground truncate">{dept.name}</h3>
                        {dept.unit_type_display && (
                          <span className="shrink-0 rounded-full bg-secondary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-secondary-foreground">
                            {dept.unit_type_display}
                          </span>
                        )}
                      </div>
                      {dept.parent_name && (
                        <p className="text-xs text-muted-foreground/80 truncate">Rattaché à {dept.parent_name}</p>
                      )}
                      {dept.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{dept.description}</p>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(dept)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(dept.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    <strong className="text-foreground">{dept.employee_count}</strong> employé(s) actif(s)
                  </span>
                </div>

                {dept.total_salary != null && dept.total_salary > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Masse salariale : <strong className="text-foreground">{formatCurrency(dept.total_salary)}</strong>
                  </p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {departments.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-base font-semibold text-foreground">Aucune unité organisationnelle</h3>
            <p className="mt-1 text-sm text-muted-foreground">Commencez par créer votre première unité organisationnelle.</p>
            {canEdit && (
              <Button className="mt-4 gap-2" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Créer une unité
              </Button>
            )}
          </div>
        )}
      </motion.div>

      {/* ══ Modale Création / Édition ══ */}
      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-sm w-full">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? 'Modifier l\'unité organisationnelle' : 'Nouvelle unité organisationnelle'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="dept-name">Nom <span className="text-destructive">*</span></Label>
              <Input
                id="dept-name"
                placeholder="ex : Ressources Humaines"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept-desc">Description</Label>
              <Input
                id="dept-desc"
                placeholder="Description optionnelle…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type d'unité</Label>
              <Select value={form.unit_type} onValueChange={(value) => setForm((f) => ({ ...f, unit_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unité racine (optionnel)</Label>
              <Select
                value={form.parent || 'none'}
                onValueChange={(value) => setForm((f) => ({ ...f, parent: value === 'none' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucune — unité de premier niveau" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune — unité de premier niveau</SelectItem>
                  {departments
                    .filter((dept) => dept.id !== editTarget?.id)
                    .map((dept) => (
                      <SelectItem key={dept.id} value={String(dept.id)}>
                        {dept.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeForm} disabled={isPending}>
              <X className="mr-1 h-4 w-4" /> Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.name.trim()}>
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
            <AlertDialogTitle>Supprimer cette unité organisationnelle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les employés rattachés ne seront pas supprimés, mais ils n'auront plus d'unité assignée.
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
