import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Target, Plus, X, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { objectiveService } from '@/services/objectiveService';

interface ObjectivesCardProps {
  employeeId: number;
}

interface KeyResultDraft {
  title: string;
  unit: string;
  target_value: string;
}

const EMPTY_KEY_RESULT: KeyResultDraft = { title: '', unit: '', target_value: '' };

const statusBadgeStyles: Record<string, string> = {
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-warning/20 text-warning border-warning/30',
  completed: 'bg-success/20 text-success border-success/30',
};

export default function ObjectivesCard({ employeeId }: ObjectivesCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canManageAny = user?.role === 'RH' || user?.role === 'ADMIN';

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [period, setPeriod] = useState('');
  const [keyResults, setKeyResults] = useState<KeyResultDraft[]>([{ ...EMPTY_KEY_RESULT }]);

  const queryKey = ['objectives', employeeId];

  const { data: objectives = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => objectiveService.getForEmployee(employeeId),
  });

  const createMutation = useMutation({
    mutationFn: objectiveService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Objectif créé' });
      resetForm();
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible de créer l'objectif.", variant: 'destructive' });
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ objectiveId, keyResultId, value }: { objectiveId: number; keyResultId: number; value: number }) =>
      objectiveService.updateKeyResultProgress(objectiveId, keyResultId, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour la progression.', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: objectiveService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Objectif supprimé' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de supprimer.', variant: 'destructive' });
    },
  });

  function resetForm() {
    setShowForm(false);
    setTitle('');
    setPeriod('');
    setKeyResults([{ ...EMPTY_KEY_RESULT }]);
  }

  function updateKeyResult(index: number, field: keyof KeyResultDraft, value: string) {
    setKeyResults((prev) => prev.map((kr, i) => (i === index ? { ...kr, [field]: value } : kr)));
  }

  function handleSubmit() {
    const validKeyResults = keyResults.filter((kr) => kr.title.trim() && kr.target_value);
    if (!title.trim() || !period.trim() || validKeyResults.length === 0) {
      toast({
        title: 'Champs requis',
        description: 'Titre, période et au moins un résultat clé (avec sa cible) sont requis.',
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate({
      employee: employeeId,
      title: title.trim(),
      period: period.trim(),
      key_results: validKeyResults.map((kr) => ({
        title: kr.title.trim(),
        unit: kr.unit.trim(),
        target_value: Number(kr.target_value),
      })),
    });
  }

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          Objectifs (OKR)
        </CardTitle>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowForm((prev) => !prev)}>
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? 'Annuler' : 'Nouvel objectif'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Titre de l'objectif</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Améliorer la couverture de tests" />
              </div>
              <div className="space-y-1">
                <Label>Période</Label>
                <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Ex: Q1 2026" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Résultats clés</Label>
              {keyResults.map((kr, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={kr.title}
                    onChange={(e) => updateKeyResult(index, 'title', e.target.value)}
                    placeholder={`Résultat clé ${index + 1}`}
                    className="flex-[2]"
                  />
                  <Input
                    value={kr.target_value}
                    onChange={(e) => updateKeyResult(index, 'target_value', e.target.value)}
                    placeholder="Cible"
                    type="number"
                    className="flex-1"
                  />
                  <Input
                    value={kr.unit}
                    onChange={(e) => updateKeyResult(index, 'unit', e.target.value)}
                    placeholder="Unité"
                    className="flex-1"
                  />
                  {keyResults.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setKeyResults((prev) => prev.filter((_, i) => i !== index))}
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
                onClick={() => setKeyResults((prev) => [...prev, { ...EMPTY_KEY_RESULT }])}
              >
                <Plus className="h-3 w-3" />
                Ajouter un résultat clé
              </Button>
            </div>

            <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending}>
              Créer l'objectif
            </Button>
          </div>
        )}

        {isLoading && <p className="py-4 text-center text-sm text-muted-foreground">Chargement…</p>}

        {!isLoading && objectives.length === 0 && !showForm && (
          <p className="py-4 text-center text-sm text-muted-foreground">Aucun objectif défini.</p>
        )}

        {objectives.map((objective) => (
          <div key={objective.id} className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{objective.title}</p>
                <p className="text-xs text-muted-foreground">{objective.period}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusBadgeStyles[objective.status]}>
                  {objective.status_display}
                </Badge>
                {canManageAny && (
                  <button
                    onClick={() => deleteMutation.mutate(objective.id)}
                    className="text-muted-foreground/50 hover:text-destructive"
                    aria-label="Supprimer l'objectif"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${objective.progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{objective.progress}% atteint</p>

            <ul className="mt-3 space-y-2">
              {objective.key_results.map((keyResult) => (
                <li key={keyResult.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-foreground">{keyResult.title}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Input
                      type="number"
                      defaultValue={keyResult.current_value}
                      className="h-7 w-20 text-xs"
                      onBlur={(e) => {
                        const value = Number(e.target.value);
                        if (!Number.isNaN(value) && value !== keyResult.current_value) {
                          updateProgressMutation.mutate({ objectiveId: objective.id, keyResultId: keyResult.id, value });
                        }
                      }}
                    />
                    / {keyResult.target_value} {keyResult.unit} ({keyResult.progress}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
