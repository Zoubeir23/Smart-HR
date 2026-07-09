import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Route, Plus, X, Trash2, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import SearchableSelect from '@/components/common/SearchableSelect';
import { useToast } from '@/hooks/use-toast';
import { talentService, type CareerPath } from '@/services/talentService';
import { positionService } from '@/services/positionService';

interface CareerPathsTabProps {
  canManage: boolean;
}

export default function CareerPathsTab({ canManage }: CareerPathsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stepPositions, setStepPositions] = useState<string[]>(['']);

  const { data: careerPaths = [], isLoading } = useQuery({
    queryKey: ['career-paths'],
    queryFn: talentService.getAllCareerPaths,
  });

  const { data: positions = [] } = useQuery({
    queryKey: ['positions', 'all'],
    queryFn: () => positionService.getAll(),
    enabled: canManage,
  });

  const createMutation = useMutation({
    mutationFn: talentService.createCareerPath,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-paths'] });
      toast({ title: 'Parcours de carrière créé' });
      resetForm();
    },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de créer ce parcours.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: talentService.deleteCareerPath,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-paths'] });
      toast({ title: 'Parcours supprimé' });
    },
  });

  function resetForm() {
    setShowForm(false);
    setTitle('');
    setDescription('');
    setStepPositions(['']);
  }

  function handleSubmit() {
    const validSteps = stepPositions.filter(Boolean);
    if (!title.trim() || validSteps.length === 0) {
      toast({ title: 'Champs requis', description: 'Titre et au moins un poste sont requis.', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      steps: validSteps.map((positionId, index) => ({ position: Number(positionId), order: index })),
    });
  }

  const positionOptions = positions.map((p) => ({ value: String(p.id), label: p.title }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Parcours de carrière type (ex: "Parcours Directeur Général")</p>
        {canManage && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showForm ? 'Annuler' : 'Nouveau parcours'}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border border-border">
          <CardContent className="space-y-3 p-4">
            <div className="space-y-1">
              <Label>Titre</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Parcours Directeur Général" />
            </div>
            <div className="space-y-1">
              <Label>Description (optionnel)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Étapes (postes, dans l'ordre)</Label>
              {stepPositions.map((positionId, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-xs text-muted-foreground">{index + 1}.</span>
                  <div className="flex-1">
                    <SearchableSelect
                      options={positionOptions}
                      value={positionId}
                      onChange={(value) => setStepPositions((prev) => prev.map((p, i) => (i === index ? value : p)))}
                      placeholder="Choisir un poste"
                    />
                  </div>
                  {stepPositions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setStepPositions((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => setStepPositions((prev) => [...prev, ''])}
              >
                <Plus className="h-3 w-3" />
                Ajouter une étape
              </Button>
            </div>
            <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending}>
              Créer le parcours
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>}

      {!isLoading && careerPaths.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
          <Route className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">Aucun parcours de carrière défini.</p>
        </div>
      )}

      <div className="space-y-3">
        {careerPaths.map((path: CareerPath) => (
          <Card key={path.id} className="border border-border">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{path.title}</p>
                  {path.description && <p className="text-xs text-muted-foreground">{path.description}</p>}
                </div>
                {canManage && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(path.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {path.steps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-2">
                    <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                      {step.position_title}
                    </span>
                    {index < path.steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
