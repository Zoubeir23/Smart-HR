import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Star, TrendingUp, Award, BookOpen,
  Plus, Pencil, Trash2, Check, X,
} from 'lucide-react';
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { performanceService, type SkillPayload, type EvaluationPayload } from '@/services/performanceService';
import { employeeService } from '@/services/employeeService';
import SearchableSelect from '@/components/common/SearchableSelect';
import DataPagination, { usePagination } from '@/components/common/DataPagination';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import SkillReferentialTab from '@/components/performance/SkillReferentialTab';

type ActiveTab = 'skills' | 'evaluations' | 'referentiel';
type SkillCategory = 'technical' | 'managerial' | 'linguistic' | 'behavioral' | 'other';
type EvaluationStatus = 'draft' | 'submitted' | 'approved';

interface SkillRecord {
  id: number;
  employee: number;
  employee_name: string;
  name: string;
  category: SkillCategory;
  category_display: string;
  level: number;
  notes: string;
}

interface EvaluationRecord {
  id: number;
  employee: number;
  employee_name: string;
  reviewer: number | null;
  reviewer_name: string;
  year: number;
  objectives: string;
  achievements: string;
  global_score: number | null;
  status: EvaluationStatus;
  status_display: string;
  comments: string;
}

interface SkillForm {
  employee: string;
  name: string;
  category: SkillCategory;
  level: string;
  notes: string;
}

interface EvaluationForm {
  employee: string;
  year: string;
  objectives: string;
  achievements: string;
  global_score: string;
  status: EvaluationStatus;
  comments: string;
}

const EMPTY_SKILL_FORM: SkillForm = {
  employee: '',
  name: '',
  category: 'technical',
  level: '3',
  notes: '',
};

const EMPTY_EVAL_FORM: EvaluationForm = {
  employee: '',
  year: String(new Date().getFullYear()),
  objectives: '',
  achievements: '',
  global_score: '',
  status: 'draft',
  comments: '',
};

const SKILL_CATEGORY_CONFIG: Record<SkillCategory, { label: string; className: string }> = {
  technical:   { label: 'Technique',       className: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200' },
  managerial:  { label: 'Managériale',     className: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200' },
  linguistic:  { label: 'Linguistique',    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' },
  behavioral:  { label: 'Comportementale', className: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200' },
  other:       { label: 'Autre',           className: 'bg-muted text-muted-foreground' },
};

const EVAL_STATUS_CONFIG: Record<EvaluationStatus, { label: string; className: string }> = {
  draft:     { label: 'Brouillon', className: 'bg-muted text-muted-foreground' },
  submitted: { label: 'Soumise',   className: 'bg-warning text-warning-foreground' },
  approved:  { label: 'Validée',   className: 'bg-success/20 text-success' },
};

function SkillStars({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            'h-3.5 w-3.5',
            i < level ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/30',
          )}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{level}/5</span>
    </div>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground text-sm">—</span>;
  const color =
    score >= 80 ? 'bg-success/20 text-success' :
    score >= 60 ? 'bg-warning/20 text-warning-foreground' :
    'bg-destructive/10 text-destructive';
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', color)}>
      {score}/100
    </span>
  );
}

export default function PerformancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canEdit = user?.role === 'RH' || user?.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState<ActiveTab>('skills');

  // ── Skills state ───────────────────────────────────────────────────
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [editSkill, setEditSkill] = useState<SkillRecord | null>(null);
  const [skillForm, setSkillForm] = useState<SkillForm>(EMPTY_SKILL_FORM);
  const [deleteSkillId, setDeleteSkillId] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // ── Evaluations state ──────────────────────────────────────────────
  const [showEvalForm, setShowEvalForm] = useState(false);
  const [editEval, setEditEval] = useState<EvaluationRecord | null>(null);
  const [evalForm, setEvalForm] = useState<EvaluationForm>(EMPTY_EVAL_FORM);
  const [deleteEvalId, setDeleteEvalId] = useState<number | null>(null);
  const [filterEvalStatus, setFilterEvalStatus] = useState<string>('all');

  // ── Data ────────────────────────────────────────────────────────────
  const { data: skillsData, isLoading: skillsLoading } = useQuery({
    queryKey: ['skills', filterCategory],
    queryFn: () => performanceService.getAllSkills(
      filterCategory !== 'all' ? { category: filterCategory } : undefined
    ),
  });

  const { data: evalsData, isLoading: evalsLoading } = useQuery({
    queryKey: ['evaluations', filterEvalStatus],
    queryFn: () => performanceService.getAllEvaluations(
      filterEvalStatus !== 'all' ? { status: filterEvalStatus } : undefined
    ),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeeService.getAll(),
    enabled: canEdit,
  });

  const skills: SkillRecord[] = skillsData?.results ?? skillsData ?? [];
  const evaluations: EvaluationRecord[] = evalsData?.results ?? evalsData ?? [];
  const employees = employeesData?.results ?? employeesData ?? [];

  const { pageItems: pagedSkills, currentPage: skillPage, setCurrentPage: setSkillPage, totalPages: skillTotalPages } =
    usePagination(skills);
  const { pageItems: pagedEvals, currentPage: evalPage, setCurrentPage: setEvalPage, totalPages: evalTotalPages } =
    usePagination(evaluations);

  // KPIs
  const avgScore = evaluations.filter((e) => e.global_score !== null).length > 0
    ? Math.round(evaluations.filter((e) => e.global_score !== null).reduce((sum, e) => sum + (e.global_score ?? 0), 0) /
        evaluations.filter((e) => e.global_score !== null).length)
    : null;

  // ── Mutations skills ────────────────────────────────────────────────
  const invalidateSkills = () => queryClient.invalidateQueries({ queryKey: ['skills'] });
  const invalidateEvals = () => queryClient.invalidateQueries({ queryKey: ['evaluations'] });

  const createSkillMutation = useMutation({
    mutationFn: performanceService.createSkill,
    onSuccess: () => { toast({ title: 'Compétence ajoutée' }); invalidateSkills(); closeSkillForm(); },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  const updateSkillMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<SkillPayload> }) =>
      performanceService.updateSkill(id, payload),
    onSuccess: () => { toast({ title: 'Compétence mise à jour' }); invalidateSkills(); closeSkillForm(); },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  const deleteSkillMutation = useMutation({
    mutationFn: performanceService.deleteSkill,
    onSuccess: () => { toast({ title: 'Compétence supprimée' }); invalidateSkills(); setDeleteSkillId(null); },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  // ── Mutations evaluations ───────────────────────────────────────────
  const createEvalMutation = useMutation({
    mutationFn: performanceService.createEvaluation,
    onSuccess: () => { toast({ title: 'Évaluation créée' }); invalidateEvals(); closeEvalForm(); },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  const updateEvalMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<EvaluationPayload> }) =>
      performanceService.updateEvaluation(id, payload),
    onSuccess: () => { toast({ title: 'Évaluation mise à jour' }); invalidateEvals(); closeEvalForm(); },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  const deleteEvalMutation = useMutation({
    mutationFn: performanceService.deleteEvaluation,
    onSuccess: () => { toast({ title: 'Évaluation supprimée' }); invalidateEvals(); setDeleteEvalId(null); },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  // ── Handlers skills ─────────────────────────────────────────────────
  function openCreateSkill() { setEditSkill(null); setSkillForm(EMPTY_SKILL_FORM); setShowSkillForm(true); }
  function openEditSkill(s: SkillRecord) {
    setEditSkill(s);
    setSkillForm({ employee: String(s.employee), name: s.name, category: s.category, level: String(s.level), notes: s.notes ?? '' });
    setShowSkillForm(true);
  }
  function closeSkillForm() { setShowSkillForm(false); setEditSkill(null); setSkillForm(EMPTY_SKILL_FORM); }

  function handleSkillSubmit() {
    const payload: SkillPayload = {
      employee: Number(skillForm.employee),
      name: skillForm.name.trim(),
      category: skillForm.category,
      level: Number(skillForm.level),
      notes: skillForm.notes.trim(),
    };
    if (editSkill) {
      updateSkillMutation.mutate({ id: editSkill.id, payload });
    } else {
      createSkillMutation.mutate(payload);
    }
  }

  // ── Handlers evaluations ────────────────────────────────────────────
  function openCreateEval() { setEditEval(null); setEvalForm(EMPTY_EVAL_FORM); setShowEvalForm(true); }
  function openEditEval(e: EvaluationRecord) {
    setEditEval(e);
    setEvalForm({
      employee:     String(e.employee),
      year:         String(e.year),
      objectives:   e.objectives,
      achievements: e.achievements ?? '',
      global_score: e.global_score !== null ? String(e.global_score) : '',
      status:       e.status,
      comments:     e.comments ?? '',
    });
    setShowEvalForm(true);
  }
  function closeEvalForm() { setShowEvalForm(false); setEditEval(null); setEvalForm(EMPTY_EVAL_FORM); }

  function handleEvalSubmit() {
    const payload: EvaluationPayload = {
      employee:     Number(evalForm.employee),
      year:         Number(evalForm.year),
      objectives:   evalForm.objectives.trim(),
      achievements: evalForm.achievements.trim(),
      global_score: evalForm.global_score !== '' ? Number(evalForm.global_score) : null,
      status:       evalForm.status,
      comments:     evalForm.comments.trim(),
    };
    if (editEval) {
      updateEvalMutation.mutate({ id: editEval.id, payload });
    } else {
      createEvalMutation.mutate(payload);
    }
  }

  const canSubmitSkill = skillForm.employee && skillForm.name.trim() && Number(skillForm.level) >= 1 && Number(skillForm.level) <= 5;
  const canSubmitEval = evalForm.employee && evalForm.year && evalForm.objectives.trim();

  // ── Render ──────────────────────────────────────────────────────────
  return (
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Formation & Performance</h1>
            <p className="text-sm text-muted-foreground">
              Compétences, évaluations annuelles et suivi de performance
            </p>
          </div>
          {canEdit && activeTab !== 'referentiel' && (
            <Button
              onClick={activeTab === 'skills' ? openCreateSkill : openCreateEval}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {activeTab === 'skills' ? 'Ajouter une compétence' : 'Nouvelle évaluation'}
            </Button>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Compétences enregistrées', value: skills.length, icon: Star, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
            { label: 'Évaluations totales',      value: evaluations.length, icon: TrendingUp, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
            { label: 'Score moyen',              value: avgScore !== null ? `${avgScore}/100` : '—', icon: Award, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
            { label: 'Évaluations validées',     value: evaluations.filter((e) => e.status === 'approved').length, icon: BookOpen, color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/30' },
          ].map(({ label, value, icon: Icon, color }) => (
            <motion.div key={label} whileHover={{ scale: 1.02 }} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
          {([['skills', 'Compétences'], ['evaluations', 'Évaluations'], ['referentiel', 'Référentiel']] as [ActiveTab, string][]).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm font-medium transition-all',
                activeTab === tab
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Skills Tab ── */}
        {activeTab === 'skills' && (
          <>
            <div className="flex items-center gap-3">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Toutes les catégories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  <SelectItem value="technical">Technique</SelectItem>
                  <SelectItem value="managerial">Managériale</SelectItem>
                  <SelectItem value="linguistic">Linguistique</SelectItem>
                  <SelectItem value="behavioral">Comportementale</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Compétence</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Niveau</TableHead>
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skillsLoading ? (
                    <TableRow><TableCell colSpan={canEdit ? 5 : 4} className="py-10 text-center text-muted-foreground">Chargement…</TableCell></TableRow>
                  ) : pagedSkills.length === 0 ? (
                    <TableRow><TableCell colSpan={canEdit ? 5 : 4} className="py-10 text-center text-muted-foreground">Aucune compétence enregistrée</TableCell></TableRow>
                  ) : pagedSkills.map((skill) => (
                    <TableRow key={skill.id}>
                      <TableCell className="font-medium">{skill.employee_name}</TableCell>
                      <TableCell>{skill.name}</TableCell>
                      <TableCell>
                        <Badge className={cn('font-medium', SKILL_CATEGORY_CONFIG[skill.category]?.className)}>
                          {skill.category_display}
                        </Badge>
                      </TableCell>
                      <TableCell><SkillStars level={skill.level} /></TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditSkill(skill)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteSkillId(skill.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DataPagination currentPage={skillPage} totalPages={skillTotalPages} onPageChange={setSkillPage} />
          </>
        )}

        {/* ── Référentiel Tab ── */}
        {activeTab === 'referentiel' && <SkillReferentialTab canEdit={canEdit} />}

        {/* ── Evaluations Tab ── */}
        {activeTab === 'evaluations' && (
          <>
            <div className="flex items-center gap-3">
              <Select value={filterEvalStatus} onValueChange={setFilterEvalStatus}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="submitted">Soumise</SelectItem>
                  <SelectItem value="approved">Validée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Année</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Évaluateur</TableHead>
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evalsLoading ? (
                    <TableRow><TableCell colSpan={canEdit ? 6 : 5} className="py-10 text-center text-muted-foreground">Chargement…</TableCell></TableRow>
                  ) : pagedEvals.length === 0 ? (
                    <TableRow><TableCell colSpan={canEdit ? 6 : 5} className="py-10 text-center text-muted-foreground">Aucune évaluation enregistrée</TableCell></TableRow>
                  ) : pagedEvals.map((evaluation) => (
                    <TableRow key={evaluation.id}>
                      <TableCell className="font-medium">{evaluation.employee_name}</TableCell>
                      <TableCell>{evaluation.year}</TableCell>
                      <TableCell><ScoreBadge score={evaluation.global_score} /></TableCell>
                      <TableCell>
                        <Badge className={cn('font-medium', EVAL_STATUS_CONFIG[evaluation.status]?.className)}>
                          {evaluation.status_display}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{evaluation.reviewer_name}</TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditEval(evaluation)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteEvalId(evaluation.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DataPagination currentPage={evalPage} totalPages={evalTotalPages} onPageChange={setEvalPage} />
          </>
        )}

        {/* ── Skill Form Dialog ── */}
        <Dialog open={showSkillForm} onOpenChange={(open) => !open && closeSkillForm()}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editSkill ? 'Modifier la compétence' : 'Ajouter une compétence'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              {canEdit && (
                <div className="space-y-1.5">
                  <Label>Employé *</Label>
                  <SearchableSelect
                    options={employees.map((e: { id: number; user?: { first_name?: string; last_name?: string; email?: string }; first_name?: string; last_name?: string; email?: string }) => ({
                      value: String(e.id),
                      label: `${e.user?.first_name ?? e.first_name ?? ''} ${e.user?.last_name ?? e.last_name ?? ''}`.trim() || (e.user?.email ?? e.email ?? ''),
                    }))}
                    value={skillForm.employee}
                    onValueChange={(v) => setSkillForm((f) => ({ ...f, employee: v }))}
                    placeholder="Sélectionner un employé"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="skill-name">Compétence *</Label>
                  <Input
                    id="skill-name"
                    placeholder="Ex: Python, Leadership…"
                    value={skillForm.name}
                    onChange={(e) => setSkillForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Catégorie</Label>
                  <Select value={skillForm.category} onValueChange={(v) => setSkillForm((f) => ({ ...f, category: v as SkillCategory }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technique</SelectItem>
                      <SelectItem value="managerial">Managériale</SelectItem>
                      <SelectItem value="linguistic">Linguistique</SelectItem>
                      <SelectItem value="behavioral">Comportementale</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Niveau : {skillForm.level}/5</Label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={skillForm.level}
                  onChange={(e) => setSkillForm((f) => ({ ...f, level: e.target.value }))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Débutant</span><span>Expert</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="skill-notes">Observations</Label>
                <Textarea id="skill-notes" rows={2} value={skillForm.notes} onChange={(e) => setSkillForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeSkillForm}><X className="mr-2 h-4 w-4" />Annuler</Button>
              <Button onClick={handleSkillSubmit} disabled={!canSubmitSkill}>
                <Check className="mr-2 h-4 w-4" />{editSkill ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Evaluation Form Dialog ── */}
        <Dialog open={showEvalForm} onOpenChange={(open) => !open && closeEvalForm()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editEval ? "Modifier l'évaluation" : 'Nouvelle évaluation'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Employé *</Label>
                  <SearchableSelect
                    options={employees.map((e: { id: number; user?: { first_name?: string; last_name?: string; email?: string }; first_name?: string; last_name?: string; email?: string }) => ({
                      value: String(e.id),
                      label: `${e.user?.first_name ?? e.first_name ?? ''} ${e.user?.last_name ?? e.last_name ?? ''}`.trim() || (e.user?.email ?? e.email ?? ''),
                    }))}
                    value={evalForm.employee}
                    onValueChange={(v) => setEvalForm((f) => ({ ...f, employee: v }))}
                    placeholder="Sélectionner un employé"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="eval-year">Année *</Label>
                    <Input id="eval-year" type="number" min={2000} max={2100} value={evalForm.year} onChange={(e) => setEvalForm((f) => ({ ...f, year: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Statut</Label>
                    <Select value={evalForm.status} onValueChange={(v) => setEvalForm((f) => ({ ...f, status: v as EvaluationStatus }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Brouillon</SelectItem>
                        <SelectItem value="submitted">Soumise</SelectItem>
                        <SelectItem value="approved">Validée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eval-objectives">Objectifs fixés *</Label>
                <Textarea id="eval-objectives" rows={3} placeholder="Décrire les objectifs de l'année…" value={evalForm.objectives} onChange={(e) => setEvalForm((f) => ({ ...f, objectives: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eval-achievements">Réalisations</Label>
                <Textarea id="eval-achievements" rows={3} placeholder="Ce qui a été accompli…" value={evalForm.achievements} onChange={(e) => setEvalForm((f) => ({ ...f, achievements: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="eval-score">Score global (0–100)</Label>
                  <Input id="eval-score" type="number" min={0} max={100} placeholder="Ex: 78" value={evalForm.global_score} onChange={(e) => setEvalForm((f) => ({ ...f, global_score: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="eval-comments">Commentaires</Label>
                  <Input id="eval-comments" placeholder="Notes complémentaires…" value={evalForm.comments} onChange={(e) => setEvalForm((f) => ({ ...f, comments: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeEvalForm}><X className="mr-2 h-4 w-4" />Annuler</Button>
              <Button onClick={handleEvalSubmit} disabled={!canSubmitEval}>
                <Check className="mr-2 h-4 w-4" />{editEval ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Skill */}
        <AlertDialog open={deleteSkillId !== null} onOpenChange={(open) => !open && setDeleteSkillId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette compétence ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteSkillId !== null && deleteSkillMutation.mutate(deleteSkillId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Evaluation */}
        <AlertDialog open={deleteEvalId !== null} onOpenChange={(open) => !open && setDeleteEvalId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette évaluation ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteEvalId !== null && deleteEvalMutation.mutate(deleteEvalId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}
