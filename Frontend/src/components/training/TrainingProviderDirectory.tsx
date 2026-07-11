import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Building2, Globe, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { trainingProviderService, type TrainingProvider, type TrainingProviderPayload } from '@/services/trainingProviderService';
import { useToast } from '@/hooks/use-toast';

const EMPTY_FORM: TrainingProviderPayload = {
  name: '',
  provider_type: 'external',
  contact_name: '',
  phone: '',
  email: '',
  website: '',
  specialties: '',
};

interface TrainingProviderDirectoryProps {
  canManage: boolean;
}

export default function TrainingProviderDirectory({ canManage }: TrainingProviderDirectoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TrainingProviderPayload>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['training-providers'],
    queryFn: () => trainingProviderService.getAll(),
  });

  const providers: TrainingProvider[] = data?.results ?? data ?? [];

  const createMutation = useMutation({
    mutationFn: trainingProviderService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-providers'] });
      toast({ title: 'Fournisseur ajouté' });
      setOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible d'ajouter ce fournisseur.", variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: trainingProviderService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-providers'] });
      toast({ title: 'Fournisseur retiré' });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de supprimer ce fournisseur.', variant: 'destructive' });
      setDeleteId(null);
    },
  });

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          Annuaire des fournisseurs de formation
        </CardTitle>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Ajouter un fournisseur
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau fournisseur</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label>Nom</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: CEGOS, Coursera..." />
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={form.provider_type} onValueChange={(v) => setForm({ ...form, provider_type: v as 'internal' | 'external' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="external">Externe</SelectItem>
                      <SelectItem value="internal">Interne</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Contact</Label>
                  <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Nom du contact" />
                </div>
                <div className="space-y-1">
                  <Label>Téléphone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+221 77 000 00 00" />
                </div>
                <div className="space-y-1">
                  <Label>E-mail</Label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@fournisseur.com" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Site web</Label>
                  <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Spécialités</Label>
                  <Textarea
                    value={form.specialties}
                    onChange={(e) => setForm({ ...form, specialties: e.target.value })}
                    placeholder="Ex: Management, Leadership, Techniques commerciales..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => createMutation.mutate(form)} disabled={!form.name.trim() || createMutation.isPending}>
                  Ajouter
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="py-4 text-center text-sm text-muted-foreground">Chargement…</p>}
        {!isLoading && providers.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">Aucun fournisseur enregistré.</p>
        )}
        {providers.map((provider) => (
          <div key={provider.id} className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{provider.name}</p>
                  <Badge variant="outline">{provider.provider_type_display}</Badge>
                </div>
                {provider.contact_name && <p className="text-sm text-muted-foreground">{provider.contact_name}</p>}
              </div>
              {canManage && (
                <button onClick={() => setDeleteId(provider.id)} className="text-muted-foreground/50 hover:text-destructive" aria-label="Supprimer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {provider.phone && (
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{provider.phone}</span>
              )}
              {provider.email && (
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{provider.email}</span>
              )}
              {provider.website && (
                <a href={provider.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary">
                  <Globe className="h-3 w-3" />{provider.website}
                </a>
              )}
            </div>
            {provider.specialties && (
              <p className="mt-2 text-xs text-muted-foreground">{provider.specialties}</p>
            )}
          </div>
        ))}
      </CardContent>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce fournisseur de l'annuaire ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
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
    </Card>
  );
}
