import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Plus, X, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import SearchableSelect from '@/components/common/SearchableSelect';
import { useToast } from '@/hooks/use-toast';
import { talentService, READINESS_OPTIONS, type SuccessionPlan, type SuccessionReadiness } from '@/services/talentService';
import { positionService } from '@/services/positionService';
import { employeeService } from '@/services/employeeService';

interface EmployeeOption {
  id: number;
  user_full_name: string;
}

const READINESS_BADGE_STYLES: Record<SuccessionReadiness, string> = {
  ready_now: 'bg-success/20 text-success border-success/30',
  ready_1_2_years: 'bg-warning/20 text-warning border-warning/30',
  ready_3_5_years: 'bg-muted text-muted-foreground',
};

interface SuccessionPlansTabProps {
  canManage: boolean;
}

export default function SuccessionPlansTab({ canManage }: SuccessionPlansTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [position, setPosition] = useState('');
  const [notes, setNotes] = useState('');
  const [candidateFormPlanId, setCandidateFormPlanId] = useState<number | null>(null);
  const [candidateEmployee, setCandidateEmployee] = useState('');
  const [candidateReadiness, setCandidateReadiness] = useState<SuccessionReadiness>('ready_3_5_years');

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['succession-plans'],
    queryFn: talentService.getAllSuccessionPlans,
  });

  const { data: positions = [] } = useQuery({
    queryKey: ['positions', 'all'],
    queryFn: () => positionService.getAll(),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: () => employeeService.getAll(),
  });
  const employees: EmployeeOption[] = employeesData?.results ?? employeesData ?? [];

  const createMutation = useMutation({
    mutationFn: talentService.createSuccessionPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['succession-plans'] });
      toast({ title: 'Plan de succession créé' });
      setShowForm(false);
      setPosition('');
      setNotes('');
    },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de créer ce plan.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: talentService.deleteSuccessionPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['succession-plans'] });
      toast({ title: 'Plan supprimé' });
    },
  });

  const addCandidateMutation = useMutation({
    mutationFn: ({ planId, employee, readiness }: { planId: number; employee: number; readiness: SuccessionReadiness }) =>
      talentService.addSuccessionCandidate(planId, { employee, readiness }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['succession-plans'] });
      toast({ title: 'Successeur ajouté' });
      setCandidateFormPlanId(null);
      setCandidateEmployee('');
    },
    onError: () => toast({ title: 'Erreur', description: "Impossible d'ajouter ce successeur.", variant: 'destructive' }),
  });

  const positionOptions = positions.map((p) => ({ value: String(p.id), label: p.title }));
  const employeeOptions = employees.map((e) => ({ value: String(e.id), label: e.user_full_name }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Matrice de succession — postes clés et successeurs potentiels</p>
        {canManage && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showForm ? 'Annuler' : 'Nouveau plan'}
          </Button>
        )}
      </div>

      {canManage && showForm && (
        <Card className="border border-border">
          <CardContent className="space-y-3 p-4">
            <div className="space-y-1">
              <Label>Poste clé</Label>
              <SearchableSelect options={positionOptions} value={position} onChange={setPosition} placeholder="Choisir un poste" />
            </div>
            <div className="space-y-1">
              <Label>Notes (optionnel)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <Button
              size="sm"
              disabled={!position || createMutation.isPending}
              onClick={() => createMutation.mutate({ position: Number(position), notes: notes.trim() })}
            >
              Créer le plan
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>}

      {!isLoading && plans.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
          <ShieldCheck className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">Aucun plan de succession défini.</p>
        </div>
      )}

      <div className="space-y-3">
        {plans.map((plan: SuccessionPlan) => (
          <Card key={plan.id} className="border border-border">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{plan.position_title}</p>
                  {plan.notes && <p className="text-xs text-muted-foreground">{plan.notes}</p>}
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-xs"
                      onClick={() => setCandidateFormPlanId(plan.id === candidateFormPlanId ? null : plan.id)}
                    >
                      <Plus className="h-3 w-3" />
                      Successeur
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(plan.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {canManage && candidateFormPlanId === plan.id && (
                <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Employé</Label>
                    <SearchableSelect options={employeeOptions} value={candidateEmployee} onChange={setCandidateEmployee} />
                  </div>
                  <div className="w-full space-y-1 sm:w-48">
                    <Label className="text-xs">Préparation</Label>
                    <Select value={candidateReadiness} onValueChange={(v) => setCandidateReadiness(v as SuccessionReadiness)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {READINESS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    disabled={!candidateEmployee || addCandidateMutation.isPending}
                    onClick={() =>
                      addCandidateMutation.mutate({ planId: plan.id, employee: Number(candidateEmployee), readiness: candidateReadiness })
                    }
                  >
                    Ajouter
                  </Button>
                </div>
              )}

              {plan.candidates.length > 0 && (
                <ul className="space-y-1.5">
                  {plan.candidates.map((candidate) => (
                    <li key={candidate.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-1.5 text-sm">
                      <span className="text-foreground">{candidate.employee_full_name}</span>
                      <Badge variant="outline" className={READINESS_BADGE_STYLES[candidate.readiness]}>
                        {candidate.readiness_display}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
