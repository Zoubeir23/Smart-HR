import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Users, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { positionService, type Position } from '@/services/positionService';
import { departmentService } from '@/services/departmentService';
import { serviceService, type Service } from '@/services/serviceService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Department {
  id: number;
  name: string;
}

interface PositionForm {
  title: string;
  service: number | null;
  profile_type: 'cadre' | 'non_cadre';
  indicative_salary: number;
}

const EMPTY_FORM: PositionForm = {
  title: '',
  service: null,
  profile_type: 'non_cadre',
  indicative_salary: 0,
};

export default function PositionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canEdit = user?.role === 'RH' || user?.role === 'ADMIN';

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Position | null>(null);
  const [form, setForm] = useState<PositionForm>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  // Pour la sélection en cascade dans le formulaire
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);

  // ── Data ──────────────────────────────────────────────────────────
  const { data: positionsData, isLoading } = useQuery({
    queryKey: ['positions'],
    queryFn: () => positionService.getAll(),
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentService.getAll,
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services', selectedDepartmentId],
    queryFn: () => serviceService.getAll(selectedDepartmentId ?? undefined),
    enabled: selectedDepartmentId !== null,
  });

  const positions: Position[] = positionsData?.results ?? (Array.isArray(positionsData) ? positionsData : []);
  const departments: Department[] = departmentsData?.results ?? departmentsData ?? [];
  const filteredServices: Service[] = Array.isArray(servicesData)
    ? servicesData
    : (servicesData?.results ?? []);

  // ── Mutations ─────────────────────────────────────────────────────
  const invalidatePositions = () => queryClient.invalidateQueries({ queryKey: ['positions'] });

  const createMutation = useMutation({
    mutationFn: positionService.create,
    onSuccess: () => { toast({ title: 'Poste créé' }); invalidatePositions(); closeForm(); },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de créer le poste.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PositionForm }) =>
      positionService.update(id, payload),
    onSuccess: () => { toast({ title: 'Poste mis à jour' }); invalidatePositions(); closeForm(); },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de modifier.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: positionService.delete,
    onSuccess: () => { toast({ title: 'Poste supprimé' }); invalidatePositions(); setDeleteId(null); },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de supprimer.', variant: 'destructive' }),
  });

  // ── Handlers ──────────────────────────────────────────────────────
  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setSelectedDepartmentId(null);
    setShowForm(true);
  }

  function openEdit(position: Position) {
    setEditTarget(position);
    setForm({
      title: position.title,
      service: position.service,
      profile_type: position.profile_type,
      indicative_salary: position.indicative_salary,
    });
    setSelectedDepartmentId(position.department_id ?? null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setSelectedDepartmentId(null);
  }

  function handleSubmit() {
    if (!form.title.trim()) return;
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, payload: form });
    } else {
      createMutation.mutate(form);
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
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Postes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Niveau 3 de l'arborescence : Département ➔ Service ➔ <span className="font-semibold text-foreground">Poste</span>
            </p>
          </div>
          {canEdit && (
            <Button onClick={openCreate} className="gap-2 self-start sm:self-auto">
              <Plus className="h-4 w-4" />
              Nouveau poste
            </Button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="border border-border bg-card rounded-xl shadow-sm p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{positions.length}</p>
              <p className="text-xs text-muted-foreground">Postes</p>
            </div>
          </div>
          <div className="border border-border bg-card rounded-xl shadow-sm p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {positions.reduce((sum, position) => sum + position.employee_count, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Employés actifs</p>
            </div>
          </div>
        </div>

        {/* Grille des postes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {positions.map((position) => (
              <motion.div
                key={position.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="group border border-border bg-card rounded-xl shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{position.title}</h3>
                      {position.service_name && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {position.department_name} / {position.service_name}
                        </p>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(position)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(position.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      <strong className="text-foreground">{position.employee_count}</strong> employé(s) actif(s)
                    </span>
                  </div>
                  <Badge variant={position.profile_type === 'cadre' ? 'default' : 'secondary'} className="text-xs">
                    {position.profile_type === 'cadre' ? 'Cadre' : 'Non-cadre'}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {positions.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-base font-semibold text-foreground">Aucun poste</h3>
            <p className="mt-1 text-sm text-muted-foreground">Commencez par créer votre premier poste.</p>
            {canEdit && (
              <Button className="mt-4 gap-2" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Créer un poste
              </Button>
            )}
          </div>
        )}
      </motion.div>

      {/* Modale Création / Édition avec sélection en cascade */}
      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Modifier le poste' : 'Nouveau poste'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 1. Intitulé */}
            <div className="space-y-1.5">
              <Label htmlFor="position-title">
                Intitulé du poste <span className="text-destructive">*</span>
              </Label>
              <Input
                id="position-title"
                placeholder="ex : Développeur Backend"
                value={form.title}
                onChange={(e) => setForm((previous) => ({ ...previous, title: e.target.value }))}
              />
            </div>

            {/* 2. Sélection Département (cascade step 1) */}
            <div className="space-y-1.5">
              <Label htmlFor="position-department">Département</Label>
              <Select
                value={selectedDepartmentId?.toString() ?? 'none'}
                onValueChange={(value) => {
                  const departmentId = value === 'none' ? null : Number(value);
                  setSelectedDepartmentId(departmentId);
                  setForm((previous) => ({ ...previous, service: null }));
                }}
              >
                <SelectTrigger id="position-department">
                  <SelectValue placeholder="Sélectionner un département" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun département</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={String(department.id)}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Sélection Service (cascade step 2) — apparaît après le choix du département */}
            <div className="space-y-1.5">
              <Label htmlFor="position-service">Service</Label>
              <Select
                value={form.service !== null ? String(form.service) : 'none'}
                onValueChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    service: value === 'none' ? null : Number(value),
                  }))
                }
                disabled={!selectedDepartmentId && !editTarget?.service}
              >
                <SelectTrigger id="position-service">
                  <SelectValue placeholder={selectedDepartmentId ? 'Sélectionner un service' : 'Choisir un département d\'abord'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun service</SelectItem>
                  {filteredServices.map((service) => (
                    <SelectItem key={service.id} value={String(service.id)}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. Profil (cadre / non-cadre) */}
            <div className="space-y-1.5">
              <Label htmlFor="position-profile">Profil</Label>
              <Select
                value={form.profile_type}
                onValueChange={(value: 'cadre' | 'non_cadre') =>
                  setForm((previous) => ({ ...previous, profile_type: value }))
                }
              >
                <SelectTrigger id="position-profile">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="non_cadre">Non-cadre</SelectItem>
                  <SelectItem value="cadre">Cadre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 5. Salaire indicatif */}
            <div className="space-y-1.5">
              <Label htmlFor="position-salary">Salaire indicatif (FCFA)</Label>
              <Input
                id="position-salary"
                type="number"
                min={0}
                value={form.indicative_salary}
                onChange={(e) =>
                  setForm((previous) => ({ ...previous, indicative_salary: Number(e.target.value) }))
                }
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeForm} disabled={isPending}>
              <X className="mr-1 h-4 w-4" /> Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.title.trim()}>
              <Check className="mr-1 h-4 w-4" />
              {editTarget ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Suppression */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce poste ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les employés rattachés à ce poste ne seront pas supprimés, mais ils n'auront plus de poste assigné.
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
