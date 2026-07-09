import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Target, Plus, X, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import SearchableSelect from '@/components/common/SearchableSelect';
import { useToast } from '@/hooks/use-toast';
import { objectiveService, type Objective, type ObjectiveLevel } from '@/services/objectiveService';
import { departmentService } from '@/services/departmentService';

interface DepartmentOption {
  id: number;
  name: string;
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-warning/20 text-warning border-warning/30',
  completed: 'bg-success/20 text-success border-success/30',
};

const LEVEL_LABELS: Record<ObjectiveLevel, string> = {
  company: 'Entreprise',
  department: 'Département',
  individual: 'Individuel',
};

export default function StrategicObjectivesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [levelFilter, setLevelFilter] = useState<'company' | 'department'>('company');
  const [showForm, setShowForm] = useState(false);
  const [formLevel, setFormLevel] = useState<'company' | 'department'>('company');
  const [department, setDepartment] = useState('');
  const [title, setTitle] = useState('');
  const [period, setPeriod] = useState('');
  const [keyResultTitle, setKeyResultTitle] = useState('');
  const [keyResultTarget, setKeyResultTarget] = useState('');
  const [keyResultUnit, setKeyResultUnit] = useState('');

  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ['objectives', 'level', levelFilter],
    queryFn: () => objectiveService.getByLevel(levelFilter),
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentService.getAll,
  });
  const departments: DepartmentOption[] = departmentsData?.results ?? departmentsData ?? [];

  const createMutation = useMutation({
    mutationFn: objectiveService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      toast({ title: 'Objectif stratégique créé' });
      resetForm();
    },
    onError: () => toast({ title: 'Erreur', description: "Impossible de créer l'objectif.", variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: objectiveService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      toast({ title: 'Objectif supprimé' });
    },
  });

  function resetForm() {
    setShowForm(false);
    setDepartment('');
    setTitle('');
    setPeriod('');
    setKeyResultTitle('');
    setKeyResultTarget('');
    setKeyResultUnit('');
  }

  function handleSubmit() {
    if (!title.trim() || !period.trim() || !keyResultTitle.trim() || !keyResultTarget) {
      toast({ title: 'Champs requis', description: 'Titre, période et un résultat clé sont requis.', variant: 'destructive' });
      return;
    }
    if (formLevel === 'department' && !department) {
      toast({ title: 'Département requis', description: 'Choisissez un département pour ce niveau.', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      level: formLevel,
      department: formLevel === 'department' ? Number(department) : undefined,
      title: title.trim(),
      period: period.trim(),
      key_results: [{ title: keyResultTitle.trim(), unit: keyResultUnit.trim(), target_value: Number(keyResultTarget) }],
    });
  }

  const departmentOptions = departments.map((d) => ({ value: String(d.id), label: d.name }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
          {(['company', 'department'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={
                levelFilter === level
                  ? 'rounded-md bg-background px-3 py-1 text-sm font-medium text-foreground shadow'
                  : 'rounded-md px-3 py-1 text-sm font-medium text-muted-foreground hover:text-foreground'
              }
            >
              {LEVEL_LABELS[level]}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setFormLevel(levelFilter); setShowForm((prev) => !prev); }}>
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? 'Annuler' : 'Nouvel objectif'}
        </Button>
      </div>

      {showForm && (
        <Card className="border border-border">
          <CardContent className="space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Niveau</Label>
                <Select value={formLevel} onValueChange={(v) => setFormLevel(v as 'company' | 'department')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Entreprise</SelectItem>
                    <SelectItem value="department">Département</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formLevel === 'department' && (
                <div className="space-y-1">
                  <Label>Département</Label>
                  <SearchableSelect options={departmentOptions} value={department} onChange={setDepartment} />
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Titre</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Croissance du CA de 20%" />
              </div>
              <div className="space-y-1">
                <Label>Période</Label>
                <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Ex: 2026" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1 sm:col-span-2">
                <Label>Résultat clé</Label>
                <Input value={keyResultTitle} onChange={(e) => setKeyResultTitle(e.target.value)} placeholder="Ex: CA annuel" />
              </div>
              <div className="space-y-1">
                <Label>Cible</Label>
                <Input type="number" value={keyResultTarget} onChange={(e) => setKeyResultTarget(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Unité (optionnel)</Label>
              <Input value={keyResultUnit} onChange={(e) => setKeyResultUnit(e.target.value)} placeholder="Ex: FCFA, %, clients" />
            </div>
            <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending}>
              Créer l'objectif
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>}

      {!isLoading && objectives.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
          <Target className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">Aucun objectif à ce niveau.</p>
        </div>
      )}

      <div className="space-y-3">
        {objectives.map((objective: Objective) => (
          <Card key={objective.id} className="border border-border">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{objective.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {objective.period}
                    {objective.department_name && ` · ${objective.department_name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={STATUS_BADGE_STYLES[objective.status]}>
                    {objective.status_display}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(objective.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${objective.progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{objective.progress}% atteint</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
