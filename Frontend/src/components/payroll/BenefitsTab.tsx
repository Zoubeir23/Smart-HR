import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Gift, Plus, X, Trash2, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import SearchableSelect from '@/components/common/SearchableSelect';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  benefitService, BENEFIT_CATEGORY_OPTIONS, type BenefitPlan, type EmployeeBenefit, type EmployeeBenefitStatus,
} from '@/services/benefitService';
import { employeeService } from '@/services/employeeService';

interface EmployeeOption {
  id: number;
  user_full_name: string;
}

const STATUS_BADGE_STYLES: Record<EmployeeBenefitStatus, string> = {
  active: 'bg-success/20 text-success border-success/30',
  pending: 'bg-warning/20 text-warning border-warning/30',
  terminated: 'bg-muted text-muted-foreground',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

export default function BenefitsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canManage = user?.role === 'RH' || user?.role === 'ADMIN';

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planCategory, setPlanCategory] = useState('other');
  const [employerContribution, setEmployerContribution] = useState('');
  const [employeeContribution, setEmployeeContribution] = useState('');

  const [enrollFormPlanId, setEnrollFormPlanId] = useState<number | null>(null);
  const [enrollEmployee, setEnrollEmployee] = useState('');

  const { data: plans = [], isLoading: isLoadingPlans } = useQuery({
    queryKey: ['benefit-plans'],
    queryFn: benefitService.getAllPlans,
  });

  const { data: myEnrollmentsData } = useQuery({
    queryKey: ['employee-benefits', 'me'],
    queryFn: () => benefitService.getAllEnrollments(),
    enabled: !canManage,
  });
  const myEnrollments: EmployeeBenefit[] = myEnrollmentsData?.results ?? myEnrollmentsData ?? [];

  const { data: employeesData } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: () => employeeService.getAll(),
    enabled: canManage,
  });
  const employees: EmployeeOption[] = employeesData?.results ?? employeesData ?? [];

  const createPlanMutation = useMutation({
    mutationFn: benefitService.createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefit-plans'] });
      toast({ title: "Plan d'avantage créé" });
      resetPlanForm();
    },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de créer ce plan.', variant: 'destructive' }),
  });

  const deletePlanMutation = useMutation({
    mutationFn: benefitService.deletePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefit-plans'] });
      toast({ title: 'Plan supprimé' });
    },
  });

  const enrollMutation = useMutation({
    mutationFn: benefitService.enrollEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefit-plans'] });
      toast({ title: 'Employé inscrit' });
      setEnrollFormPlanId(null);
      setEnrollEmployee('');
    },
    onError: () => toast({ title: 'Erreur', description: "Impossible d'inscrire cet employé (déjà inscrit ?).", variant: 'destructive' }),
  });

  function resetPlanForm() {
    setShowPlanForm(false);
    setPlanName('');
    setPlanCategory('other');
    setEmployerContribution('');
    setEmployeeContribution('');
  }

  function handleCreatePlan() {
    if (!planName.trim()) {
      toast({ title: 'Champ requis', description: 'Le nom du plan est requis.', variant: 'destructive' });
      return;
    }
    createPlanMutation.mutate({
      name: planName.trim(),
      category: planCategory,
      employer_contribution: employerContribution ? Number(employerContribution) : 0,
      employee_contribution: employeeContribution ? Number(employeeContribution) : 0,
    });
  }

  const employeeOptions = employees.map((e) => ({ value: String(e.id), label: e.user_full_name }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {canManage ? 'Catalogue des avantages sociaux (compensations & bénéfices)' : 'Vos avantages sociaux'}
        </p>
        {canManage && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowPlanForm((prev) => !prev)}>
            {showPlanForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showPlanForm ? 'Annuler' : 'Nouveau plan'}
          </Button>
        )}
      </div>

      {showPlanForm && (
        <Card className="border border-border">
          <CardContent className="space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Nom du plan</Label>
                <Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Ex: Mutuelle santé" />
              </div>
              <div className="space-y-1">
                <Label>Catégorie</Label>
                <Select value={planCategory} onValueChange={setPlanCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BENEFIT_CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Part employeur (mensuelle, FCFA)</Label>
                <Input type="number" value={employerContribution} onChange={(e) => setEmployerContribution(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Part salarié (mensuelle, FCFA)</Label>
                <Input type="number" value={employeeContribution} onChange={(e) => setEmployeeContribution(e.target.value)} />
              </div>
            </div>
            <Button size="sm" onClick={handleCreatePlan} disabled={createPlanMutation.isPending}>
              Créer le plan
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoadingPlans && <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>}

      {!isLoadingPlans && plans.length === 0 && !showPlanForm && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
          <Gift className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">Aucun plan d'avantage défini.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {plans.map((plan: BenefitPlan) => {
          const myEnrollment = myEnrollments.find((e) => e.plan === plan.id);
          return (
            <Card key={plan.id} className="border border-border">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                    <Badge variant="outline" className="mt-1 text-xs">{plan.category_display}</Badge>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-xs"
                        onClick={() => setEnrollFormPlanId(plan.id === enrollFormPlanId ? null : plan.id)}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deletePlanMutation.mutate(plan.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                {plan.description && <p className="text-xs text-muted-foreground">{plan.description}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Part employeur : <strong className="text-foreground">{formatCurrency(plan.employer_contribution)}</strong></span>
                  <span>Part salarié : <strong className="text-foreground">{formatCurrency(plan.employee_contribution)}</strong></span>
                </div>
                {canManage && (
                  <p className="text-xs text-muted-foreground">{plan.enrolled_count} employé(s) inscrit(s)</p>
                )}
                {!canManage && myEnrollment && (
                  <Badge variant="outline" className={STATUS_BADGE_STYLES[myEnrollment.status]}>
                    {myEnrollment.status_display}
                  </Badge>
                )}

                {enrollFormPlanId === plan.id && (
                  <div className="flex items-end gap-2 rounded-lg border border-dashed border-border p-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Employé</Label>
                      <SearchableSelect options={employeeOptions} value={enrollEmployee} onChange={setEnrollEmployee} />
                    </div>
                    <Button
                      size="sm"
                      disabled={!enrollEmployee || enrollMutation.isPending}
                      onClick={() => enrollMutation.mutate({ employee: Number(enrollEmployee), plan: plan.id, status: 'active' })}
                    >
                      Inscrire
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
