import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, LogOut, Plus, X, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { onboardingService } from '@/services/onboardingService';
import { cn } from '@/lib/utils';

interface OnboardingProgramsCardProps {
  employeeId: number;
}

interface StepDraft {
  title: string;
  description: string;
}

const EMPTY_STEP: StepDraft = { title: '', description: '' };

export default function OnboardingProgramsCard({ employeeId }: OnboardingProgramsCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canManage = user?.role === 'RH' || user?.role === 'ADMIN';

  const [showForm, setShowForm] = useState(false);
  const [programType, setProgramType] = useState<'onboarding' | 'offboarding'>('onboarding');
  const [title, setTitle] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([{ ...EMPTY_STEP }]);

  const queryKey = ['onboarding-programs', employeeId];

  const { data: programs = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => onboardingService.getForEmployee(employeeId),
  });

  const createMutation = useMutation({
    mutationFn: onboardingService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Programme créé' });
      resetForm();
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de créer le programme.', variant: 'destructive' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ programId, stepId }: { programId: number; stepId: number }) =>
      onboardingService.toggleStep(programId, stepId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible de mettre à jour l'étape.", variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: onboardingService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Programme supprimé' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de supprimer.', variant: 'destructive' });
    },
  });

  function resetForm() {
    setShowForm(false);
    setProgramType('onboarding');
    setTitle('');
    setSteps([{ ...EMPTY_STEP }]);
  }

  function updateStep(index: number, field: keyof StepDraft, value: string) {
    setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, [field]: value } : step)));
  }

  function handleSubmit() {
    const validSteps = steps.filter((step) => step.title.trim());
    if (!title.trim() || validSteps.length === 0) {
      toast({ title: 'Champs requis', description: 'Titre du programme et au moins une étape sont requis.', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      employee: employeeId,
      program_type: programType,
      title: title.trim(),
      steps: validSteps,
    });
  }

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Intégration &amp; départ
        </CardTitle>
        {canManage && (
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showForm ? 'Annuler' : 'Nouveau programme'}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={programType} onValueChange={(v) => setProgramType(v as 'onboarding' | 'offboarding')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onboarding">Intégration</SelectItem>
                    <SelectItem value="offboarding">Départ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Titre du programme</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Intégration développeur" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Étapes</Label>
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={step.title}
                    onChange={(e) => updateStep(index, 'title', e.target.value)}
                    placeholder={`Étape ${index + 1}`}
                    className="flex-1"
                  />
                  {steps.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setSteps((prev) => prev.filter((_, i) => i !== index))}
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
                onClick={() => setSteps((prev) => [...prev, { ...EMPTY_STEP }])}
              >
                <Plus className="h-3 w-3" />
                Ajouter une étape
              </Button>
            </div>

            <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending}>
              Créer le programme
            </Button>
          </div>
        )}

        {isLoading && <p className="py-4 text-center text-sm text-muted-foreground">Chargement…</p>}

        {!isLoading && programs.length === 0 && !showForm && (
          <p className="py-4 text-center text-sm text-muted-foreground">Aucun programme d'intégration ou de départ.</p>
        )}

        {programs.map((program) => {
          const completedCount = program.steps.filter((s) => s.is_completed).length;
          return (
            <div key={program.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {program.program_type === 'onboarding' ? (
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                  ) : (
                    <LogOut className="h-4 w-4 text-warning" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">{program.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {program.program_type_display} · {completedCount}/{program.steps.length} étapes
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={program.status === 'completed' ? 'default' : 'outline'}>
                    {program.status_display}
                  </Badge>
                  {canManage && (
                    <button
                      onClick={() => deleteMutation.mutate(program.id)}
                      className="text-muted-foreground/50 hover:text-destructive"
                      aria-label="Supprimer le programme"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {program.steps.map((step) => (
                  <li key={step.id}>
                    <button
                      onClick={() => toggleMutation.mutate({ programId: program.id, stepId: step.id })}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/60',
                        step.is_completed ? 'text-muted-foreground line-through' : 'text-foreground'
                      )}
                    >
                      {step.is_completed ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                      )}
                      {step.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
