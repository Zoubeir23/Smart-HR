import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { referenceService, type ReferenceItem } from '@/services/referenceService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

type TableCategory = 'nationalities' | 'familyStatuses' | 'diplomas' | 'departureReasons';

interface TableConfig {
  label: string;
  queryKey: string;
  fieldKey: 'name' | 'label';
  placeholder: string;
  fetchFn: () => Promise<ReferenceItem[]>;
  createFn: (value: string) => Promise<ReferenceItem>;
  updateFn: (id: number, value: string) => Promise<ReferenceItem>;
  deleteFn: (id: number) => Promise<void>;
}

const TABLE_CONFIGS: Record<TableCategory, TableConfig> = {
  nationalities: {
    label: 'Nationalités',
    queryKey: 'ref-nationalities',
    fieldKey: 'name',
    placeholder: 'ex: Sénégalaise',
    fetchFn: referenceService.nationalities.getAll,
    createFn: referenceService.nationalities.create,
    updateFn: referenceService.nationalities.update,
    deleteFn: referenceService.nationalities.delete,
  },
  familyStatuses: {
    label: 'Situations familiales',
    queryKey: 'ref-family-statuses',
    fieldKey: 'label',
    placeholder: 'ex: Marié(e)',
    fetchFn: referenceService.familyStatuses.getAll,
    createFn: referenceService.familyStatuses.create,
    updateFn: referenceService.familyStatuses.update,
    deleteFn: referenceService.familyStatuses.delete,
  },
  diplomas: {
    label: 'Diplômes',
    queryKey: 'ref-diplomas',
    fieldKey: 'label',
    placeholder: 'ex: Master 2',
    fetchFn: referenceService.diplomas.getAll,
    createFn: referenceService.diplomas.create,
    updateFn: referenceService.diplomas.update,
    deleteFn: referenceService.diplomas.delete,
  },
  departureReasons: {
    label: 'Motifs de départ',
    queryKey: 'ref-departure-reasons',
    fieldKey: 'label',
    placeholder: 'ex: Démission',
    fetchFn: referenceService.departureReasons.getAll,
    createFn: referenceService.departureReasons.create,
    updateFn: referenceService.departureReasons.update,
    deleteFn: referenceService.departureReasons.delete,
  },
};

function ReferenceTablePanel({ config }: { config: TableConfig }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const canEdit = user?.role === 'RH' || user?.role === 'ADMIN';

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<ReferenceItem | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: [config.queryKey],
    queryFn: config.fetchFn,
  });

  const items: ReferenceItem[] = Array.isArray(data) ? data : (data?.results ?? []);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [config.queryKey] });

  const createMutation = useMutation({
    mutationFn: config.createFn,
    onSuccess: () => { toast({ title: 'Entrée créée' }); invalidate(); closeForm(); },
    onError: () => toast({ title: 'Erreur', description: 'Valeur déjà existante ou invalide.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: string }) => config.updateFn(id, value),
    onSuccess: () => { toast({ title: 'Entrée mise à jour' }); invalidate(); closeForm(); },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: config.deleteFn,
    onSuccess: () => { toast({ title: 'Entrée supprimée' }); invalidate(); setDeleteId(null); },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  function openCreate() {
    setEditTarget(null);
    setInputValue('');
    setShowForm(true);
  }

  function openEdit(item: ReferenceItem) {
    setEditTarget(item);
    setInputValue(item[config.fieldKey] ?? '');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditTarget(null);
    setInputValue('');
  }

  function handleSubmit() {
    if (!inputValue.trim()) return;
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, value: inputValue.trim() });
    } else {
      createMutation.mutate(inputValue.trim());
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted-foreground text-sm py-4 text-center">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">Aucune entrée. Cliquez sur "Ajouter" pour commencer.</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium">{item[config.fieldKey]}</span>
              {canEdit && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Modifier' : 'Ajouter une entrée'}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="ref-input" className="text-sm mb-2 block">Valeur *</Label>
            <Input
              id="ref-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={config.placeholder}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={!inputValue.trim() || isPending}>
              {isPending ? 'Enregistrement…' : editTarget ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les employés liés à cette valeur seront dissociés. Cette action est irréversible.
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
    </div>
  );
}

export default function ReferenceTablesPage() {
  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Tags className="h-6 w-6" />
            Tables de référence
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Référentiels système personnalisables utilisés dans les fiches employés.
          </p>
        </div>

        <Tabs defaultValue="nationalities">
          <TabsList className="grid h-auto grid-cols-2 w-full max-w-2xl sm:h-10 sm:grid-cols-4">
            <TabsTrigger value="nationalities">Nationalités</TabsTrigger>
            <TabsTrigger value="familyStatuses">Situations</TabsTrigger>
            <TabsTrigger value="diplomas">Diplômes</TabsTrigger>
            <TabsTrigger value="departureReasons">Départs</TabsTrigger>
          </TabsList>
          {(Object.entries(TABLE_CONFIGS) as [TableCategory, TableConfig][]).map(([key, config]) => (
            <TabsContent key={key} value={key} className="mt-4">
              <div className="rounded-xl border bg-card p-6">
                <h2 className="text-base font-semibold mb-4">{config.label}</h2>
                <ReferenceTablePanel config={config} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
  );
}
