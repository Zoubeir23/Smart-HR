import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Users, Briefcase, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { serviceService, type Service } from '@/services/serviceService';
import { departmentService } from '@/services/departmentService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Department {
  id: number;
  name: string;
}

interface ServiceForm {
  name: string;
  description: string;
  department: number | null;
}

const EMPTY_FORM: ServiceForm = { name: '', description: '', department: null };

export default function ServicePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canEdit = user?.role === 'RH' || user?.role === 'ADMIN';

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filterDepartmentId, setFilterDepartmentId] = useState<number | undefined>(undefined);

  // ── Data ──────────────────────────────────────────────────────────
  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['services', filterDepartmentId],
    queryFn: () => serviceService.getAll(filterDepartmentId),
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentService.getAll,
  });

  const services: Service[] = Array.isArray(servicesData) ? servicesData : (servicesData?.results ?? []);
  const departments: Department[] = departmentsData?.results ?? departmentsData ?? [];

  // ── Mutations ─────────────────────────────────────────────────────
  const invalidateServices = () => queryClient.invalidateQueries({ queryKey: ['services'] });

  const createMutation = useMutation({
    mutationFn: (payload: ServiceForm) => serviceService.create({
      name: payload.name,
      description: payload.description,
      department: payload.department!,
    }),
    onSuccess: () => { toast({ title: 'Service créé' }); invalidateServices(); closeForm(); },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de créer le service.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ServiceForm }) =>
      serviceService.update(id, {
        name: payload.name,
        description: payload.description,
        department: payload.department ?? undefined,
      }),
    onSuccess: () => { toast({ title: 'Service mis à jour' }); invalidateServices(); closeForm(); },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de modifier.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: serviceService.delete,
    onSuccess: () => { toast({ title: 'Service supprimé' }); invalidateServices(); setDeleteId(null); },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de supprimer.', variant: 'destructive' }),
  });

  // ── Handlers ──────────────────────────────────────────────────────
  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(service: Service) {
    setEditTarget(service);
    setForm({ name: service.name, description: service.description, department: service.department });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditTarget(null);
    setForm(EMPTY_FORM);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.department) return;
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Services</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Niveau 2 de l'arborescence : Département ➔ <span className="font-semibold text-foreground">Service</span> ➔ Poste
            </p>
          </div>
          {canEdit && (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau service
            </Button>
          )}
        </div>

        {/* Filtre département */}
        <div className="flex items-center gap-3">
          <Label className="text-sm shrink-0">Filtrer par département :</Label>
          <Select
            value={filterDepartmentId?.toString() ?? 'all'}
            onValueChange={(value) => setFilterDepartmentId(value === 'all' ? undefined : Number(value))}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Tous les départements" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les départements</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grille de services */}
        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Building2 className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Aucun service</p>
            <p className="text-sm mt-1">Commencez par créer un département, puis ajoutez des services.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {services.map((service) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="rounded-xl border bg-card p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{service.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{service.department_name}</p>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => openEdit(service)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(service.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {service.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                  )}
                  <div className="flex items-center gap-4 pt-1 border-t text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {service.employee_count} employé{service.employee_count !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" />
                      {service.position_count} poste{service.position_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Dialogue création/édition */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Modifier le service' : 'Nouveau service'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="service-department">Département *</Label>
              <Select
                value={form.department?.toString() ?? ''}
                onValueChange={(value) => setForm((prev) => ({ ...prev, department: Number(value) }))}
              >
                <SelectTrigger id="service-department">
                  <SelectValue placeholder="Sélectionner un département" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-name">Nom du service *</Label>
              <Input
                id="service-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="ex: Service Développement"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-description">Description</Label>
              <Textarea
                id="service-description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description du service…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Annuler</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.name.trim() || !form.department || isPending}
            >
              {isPending ? 'Enregistrement…' : editTarget ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue confirmation suppression */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce service ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les postes et employés rattachés seront dissociés.
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
