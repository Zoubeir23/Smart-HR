import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, BookMarked } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { performanceService, type SkillDefinitionPayload } from '@/services/performanceService';
import { useToast } from '@/hooks/use-toast';

interface SkillDefinitionRecord {
  id: number;
  name: string;
  category: string;
  category_display: string;
  description: string;
}

const CATEGORY_OPTIONS = [
  { value: 'technical', label: 'Technique' },
  { value: 'managerial', label: 'Managériale' },
  { value: 'linguistic', label: 'Linguistique' },
  { value: 'behavioral', label: 'Comportementale' },
  { value: 'other', label: 'Autre' },
];

const EMPTY_FORM: SkillDefinitionPayload = { name: '', category: 'technical', description: '' };

interface SkillReferentialTabProps {
  canEdit: boolean;
}

export default function SkillReferentialTab({ canEdit }: SkillReferentialTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SkillDefinitionPayload>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['skill-definitions'],
    queryFn: () => performanceService.getAllSkillDefinitions(),
  });

  const skillDefinitions: SkillDefinitionRecord[] = data?.results ?? data ?? [];

  const createMutation = useMutation({
    mutationFn: performanceService.createSkillDefinition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-definitions'] });
      toast({ title: 'Compétence ajoutée au référentiel' });
      setOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Cette compétence existe peut-être déjà.', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: performanceService.deleteSkillDefinition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-definitions'] });
      toast({ title: 'Compétence retirée du référentiel' });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de supprimer cette compétence.', variant: 'destructive' });
      setDeleteId(null);
    },
  });

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter au référentiel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle compétence du référentiel</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Nom</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Python" />
                </div>
                <div className="space-y-1">
                  <Label>Catégorie</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Description (optionnel)</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Précisions sur cette compétence..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => createMutation.mutate(form)}
                  disabled={!form.name.trim() || createMutation.isPending}
                >
                  Ajouter
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Compétence</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Description</TableHead>
            {canEdit && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow><TableCell colSpan={canEdit ? 4 : 3} className="py-10 text-center text-muted-foreground">Chargement…</TableCell></TableRow>
          )}
          {!isLoading && skillDefinitions.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 4 : 3} className="py-10 text-center text-muted-foreground">
                <BookMarked className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                Aucune compétence dans le référentiel.
              </TableCell>
            </TableRow>
          )}
          {skillDefinitions.map((skillDefinition) => (
            <TableRow key={skillDefinition.id}>
              <TableCell className="font-medium">{skillDefinition.name}</TableCell>
              <TableCell><Badge variant="outline">{skillDefinition.category_display}</Badge></TableCell>
              <TableCell className="max-w-md truncate text-muted-foreground">{skillDefinition.description || '—'}</TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(skillDefinition.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer cette compétence du référentiel ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les compétences déjà attribuées à des employés ne seront pas affectées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
