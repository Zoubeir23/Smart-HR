import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Search,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { recruitmentService } from '@/services/recruitmentService';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type ApplicationStatus = 'pending' | 'reviewing' | 'interview' | 'accepted' | 'rejected';

interface JobOffer {
  id: number;
  title: string;
}

interface Application {
  id: number;
  candidate_name: string;
  candidate_first_name?: string;
  candidate_last_name?: string;
  email: string;
  job_offer: JobOffer | number;
  job_title?: string;
  status: ApplicationStatus;
  matching_score: number;
  skills_extracted?: string[];
  created_at: string;
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const APPLICATION_STATUSES: { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'reviewing', label: 'En revue' },
  { value: 'interview', label: 'Entretien' },
  { value: 'accepted', label: 'Accepté' },
  { value: 'rejected', label: 'Rejeté' },
];

const STATUS_TRANSITIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'reviewing', label: 'En revue' },
  { value: 'interview', label: 'Entretien' },
  { value: 'accepted', label: 'Accepté' },
  { value: 'rejected', label: 'Rejeté' },
];

const INTERVIEW_DURATIONS = [
  { value: '15', label: '15 Min' },
  { value: '30', label: '30 Min' },
  { value: '45', label: '45 Min' },
  { value: '60', label: '60 Min' },
];

const INTERVIEW_TYPES = [
  { value: 'Technique', label: 'Technique' },
  { value: 'Comportemental', label: 'Comportemental' },
  { value: 'Leadership', label: 'Leadership' },
  { value: 'Expérience', label: 'Expérience' },
];

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function getStatusBadgeVariant(status: ApplicationStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'accepted':
      return 'default';
    case 'rejected':
      return 'destructive';
    case 'interview':
      return 'secondary';
    default:
      return 'outline';
  }
}

function getStatusLabel(status: ApplicationStatus): string {
  return STATUS_TRANSITIONS.find((s) => s.value === status)?.label ?? status;
}

function getMatchingScoreColorClass(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-orange-400';
  return 'bg-red-500';
}

function getMatchingScoreTextClass(score: number): string {
  if (score >= 70) return 'text-green-600 dark:text-green-400';
  if (score >= 40) return 'text-orange-500 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function getCandidateInitials(application: Application): string {
  if (application.candidate_first_name && application.candidate_last_name) {
    return `${application.candidate_first_name[0]}${application.candidate_last_name[0]}`.toUpperCase();
  }
  if (application.candidate_name) {
    const nameParts = application.candidate_name.trim().split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return application.candidate_name.slice(0, 2).toUpperCase();
  }
  return 'CA';
}

function getCandidateFullName(application: Application): string {
  if (application.candidate_first_name && application.candidate_last_name) {
    return `${application.candidate_first_name} ${application.candidate_last_name}`;
  }
  return application.candidate_name || 'Candidat inconnu';
}

function getJobTitle(application: Application): string {
  if (application.job_title) return application.job_title;
  if (typeof application.job_offer === 'object' && application.job_offer?.title) {
    return application.job_offer.title;
  }
  return 'Poste non spécifié';
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

interface MatchingScoreGaugeProps {
  score: number;
}

function MatchingScoreGauge({ score }: MatchingScoreGaugeProps) {
  const colorClass = getMatchingScoreColorClass(score);
  const textClass = getMatchingScoreTextClass(score);

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-0">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full rounded-full', colorClass)}
        />
      </div>
      <span className={cn('text-sm font-semibold tabular-nums shrink-0', textClass)}>
        {score}%
      </span>
    </div>
  );
}

interface SkillTagListProps {
  skills: string[];
  maxVisible?: number;
}

function SkillTagList({ skills, maxVisible = 3 }: SkillTagListProps) {
  const visibleSkills = skills.slice(0, maxVisible);
  const remainingSkillsCount = skills.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1">
      {visibleSkills.map((skill) => (
        <span
          key={skill}
          className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium border border-primary/20"
        >
          {skill}
        </span>
      ))}
      {remainingSkillsCount > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-medium">
          +{remainingSkillsCount}
        </span>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Interview Dialog
// ──────────────────────────────────────────────

interface InterviewDialogProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (applicationId: number, duration: string, interviewType: string) => void;
  isPending: boolean;
}

function InterviewDialog({ application, isOpen, onClose, onConfirm, isPending }: InterviewDialogProps) {
  const [selectedDuration, setSelectedDuration] = useState('30');
  const [selectedInterviewType, setSelectedInterviewType] = useState('Technique');

  if (!application) return null;

  const handleConfirm = () => {
    onConfirm(application.id, selectedDuration, selectedInterviewType);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Envoyer l'invitation d'entretien IA
          </DialogTitle>
          <DialogDescription>
            Configurez les paramètres de l'entretien pour{' '}
            <span className="font-medium text-foreground">{getCandidateFullName(application)}</span>.
            Les questions seront générées personnellement à partir du CV du candidat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="interview-duration">Durée de l'entretien</Label>
            <Select value={selectedDuration} onValueChange={setSelectedDuration}>
              <SelectTrigger id="interview-duration">
                <SelectValue placeholder="Sélectionner une durée" />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_DURATIONS.map((duration) => (
                  <SelectItem key={duration.value} value={duration.value}>
                    {duration.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interview-type">Type d'entretien</Label>
            <Select value={selectedInterviewType} onValueChange={setSelectedInterviewType}>
              <SelectTrigger id="interview-type">
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_TYPES.map((interviewType) => (
                  <SelectItem key={interviewType.value} value={interviewType.value}>
                    {interviewType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-muted/50 border border-border p-3 text-sm text-muted-foreground">
            Les questions seront générées personnellement à partir du CV du candidat et envoyées
            automatiquement à <span className="font-medium text-foreground">{application.email}</span>.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={isPending} className="gap-2">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Bot className="h-4 w-4" />
                Envoyer l'invitation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Application Card
// ──────────────────────────────────────────────

interface ApplicationCardProps {
  application: Application;
  interviewAlreadySent: boolean;
  onStatusChange: (applicationId: number, newStatus: ApplicationStatus) => void;
  onSendInterview: (application: Application) => void;
  isStatusChangePending: boolean;
}

function ApplicationCard({
  application,
  interviewAlreadySent,
  onStatusChange,
  onSendInterview,
  isStatusChangePending,
}: ApplicationCardProps) {
  const initials = getCandidateInitials(application);
  const fullName = getCandidateFullName(application);
  const jobTitle = getJobTitle(application);
  const skills = application.skills_extracted ?? [];
  const score = application.matching_score ?? 0;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          {/* Avatar */}
          <div className="flex shrink-0 items-center gap-3 sm:gap-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-primary-foreground shadow-sm">
              {initials}
            </div>
          </div>

          {/* Main info */}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {/* Name, email, job */}
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{fullName}</p>
                <p className="truncate text-sm text-muted-foreground">{application.email}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-primary/80">{jobTitle}</p>
              </div>
              <div className="mt-1 shrink-0 sm:mt-0 sm:ml-4">
                <Badge variant={getStatusBadgeVariant(application.status)}>
                  {getStatusLabel(application.status)}
                </Badge>
              </div>
            </div>

            {/* Matching score */}
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Score de matching</p>
              <MatchingScoreGauge score={score} />
            </div>

            {/* Skills */}
            {skills.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Compétences extraites</p>
                <SkillTagList skills={skills} maxVisible={3} />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Status change dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={isStatusChangePending}
                  >
                    {isStatusChangePending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    )}
                    Changer statut
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  {STATUS_TRANSITIONS.map((statusOption) => (
                    <DropdownMenuItem
                      key={statusOption.value}
                      onClick={() => onStatusChange(application.id, statusOption.value)}
                      className={cn(
                        application.status === statusOption.value && 'font-semibold text-primary'
                      )}
                    >
                      {statusOption.label}
                      {application.status === statusOption.value && (
                        <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Send interview button — only shown when status is 'interview' */}
              {application.status === 'interview' && (
                interviewAlreadySent ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="gap-1.5 border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400 cursor-not-allowed"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Entretien envoyé
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => onSendInterview(application)}
                  >
                    <Bot className="h-3.5 w-3.5" />
                    Envoyer entretien IA
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────

export default function ApplicationsManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters state
  const [selectedJobOfferId, setSelectedJobOfferId] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [candidateSearchQuery, setSearchQuery] = useState('');

  // Interview dialog state
  const [interviewDialogApplication, setInterviewDialogApplication] = useState<Application | null>(null);

  // Track sent interviews locally (by application ID)
  const [sentInterviewApplicationIds, setSentInterviewApplicationIds] = useState<Set<number>>(new Set());

  // ── Data fetching ──

  const { data: jobOffersData, isLoading: isLoadingJobOffers } = useQuery({
    queryKey: ['job-offers-for-filter'],
    queryFn: () => recruitmentService.getJobs(),
  });

  const jobOffers: JobOffer[] = useMemo(() => {
    if (!jobOffersData) return [];
    return jobOffersData?.results ?? jobOffersData ?? [];
  }, [jobOffersData]);

  const applicationsQueryParams = useMemo(() => {
    const params: { job_offer?: number; status?: string } = {};
    if (selectedJobOfferId !== 'all') {
      params.job_offer = Number(selectedJobOfferId);
    }
    if (selectedStatusFilter !== 'all') {
      params.status = selectedStatusFilter;
    }
    return params;
  }, [selectedJobOfferId, selectedStatusFilter]);

  const { data: applicationsData, isLoading: isLoadingApplications } = useQuery({
    queryKey: ['applications-management', applicationsQueryParams],
    queryFn: () => recruitmentService.getApplications(applicationsQueryParams),
  });

  const allApplications: Application[] = useMemo(() => {
    if (!applicationsData) return [];
    return applicationsData?.results ?? applicationsData ?? [];
  }, [applicationsData]);

  // Client-side search filter by candidate name
  const filteredApplicationsList = useMemo(() => {
    if (!candidateSearchQuery.trim()) return allApplications;
    const normalizedQuery = candidateSearchQuery.toLowerCase().trim();
    return allApplications.filter((application) => {
      const fullName = getCandidateFullName(application).toLowerCase();
      return fullName.includes(normalizedQuery) || application.email.toLowerCase().includes(normalizedQuery);
    });
  }, [allApplications, candidateSearchQuery]);

  // ── Mutations ──

  const updateStatusMutation = useMutation({
    mutationFn: ({ applicationId, newStatus }: { applicationId: number; newStatus: ApplicationStatus }) =>
      recruitmentService.updateApplicationStatus(applicationId, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications-management'] });
      toast({ title: 'Statut mis à jour', description: 'Le statut de la candidature a été modifié.' });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut. Réessayez.',
        variant: 'destructive',
      });
    },
  });

  const createInterviewMutation = useMutation({
    mutationFn: ({ applicationId, duration, interviewType }: { applicationId: number; duration: string; interviewType: string }) =>
      recruitmentService.createInterview(applicationId, { duration, interview_type: interviewType }),
    onSuccess: (_, variables) => {
      const application = filteredApplicationsList.find((app) => app.id === variables.applicationId);
      const candidateEmail = application?.email ?? '';

      setSentInterviewApplicationIds((previousSet) => {
        const updatedSet = new Set(previousSet);
        updatedSet.add(variables.applicationId);
        return updatedSet;
      });

      setInterviewDialogApplication(null);

      toast({
        title: 'Invitation envoyée',
        description: `Invitation envoyée à ${candidateEmail}`,
      });
    },
    onError: () => {
      toast({
        title: 'Erreur lors de l\'envoi',
        description: 'Impossible d\'envoyer l\'invitation d\'entretien. Réessayez.',
        variant: 'destructive',
      });
    },
  });

  // ── Handlers ──

  const handleStatusChange = (applicationId: number, newStatus: ApplicationStatus) => {
    updateStatusMutation.mutate({ applicationId, newStatus });
  };

  const handleOpenInterviewDialog = (application: Application) => {
    setInterviewDialogApplication(application);
  };

  const handleCloseInterviewDialog = () => {
    setInterviewDialogApplication(null);
  };

  const handleConfirmSendInterview = (applicationId: number, duration: string, interviewType: string) => {
    createInterviewMutation.mutate({ applicationId, duration, interviewType });
  };

  // ── Render ──

  const isLoading = isLoadingApplications || isLoadingJobOffers;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-1"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Gestion des candidatures
              </h1>
              <p className="text-sm text-muted-foreground">
                Consultez et gérez toutes les candidatures reçues
              </p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Card>
            <CardHeader className="pb-3 pt-4">
              <p className="text-sm font-semibold text-foreground">Filtres</p>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {/* Job offer filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Offre d'emploi</Label>
                  <Select
                    value={selectedJobOfferId}
                    onValueChange={setSelectedJobOfferId}
                    disabled={isLoadingJobOffers}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les offres" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les offres</SelectItem>
                      {jobOffers.map((jobOffer) => (
                        <SelectItem key={jobOffer.id} value={String(jobOffer.id)}>
                          {jobOffer.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Statut</Label>
                  <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLICATION_STATUSES.map((statusOption) => (
                        <SelectItem key={statusOption.value} value={statusOption.value}>
                          {statusOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Candidate name search */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Rechercher un candidat</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Nom ou email..."
                      value={candidateSearchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Applications list */}
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Chargement des candidatures...</span>
            </div>
          ) : filteredApplicationsList.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-20 text-center"
            >
              <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">Aucune candidature trouvée</p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                Modifiez vos filtres pour afficher des résultats.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {filteredApplicationsList.length} candidature{filteredApplicationsList.length > 1 ? 's' : ''} trouvée{filteredApplicationsList.length > 1 ? 's' : ''}
              </p>
              {filteredApplicationsList.map((application, index) => (
                <motion.div
                  key={application.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                >
                  <ApplicationCard
                    application={application}
                    interviewAlreadySent={sentInterviewApplicationIds.has(application.id)}
                    onStatusChange={handleStatusChange}
                    onSendInterview={handleOpenInterviewDialog}
                    isStatusChangePending={
                      updateStatusMutation.isPending &&
                      updateStatusMutation.variables?.applicationId === application.id
                    }
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Interview dialog */}
      <InterviewDialog
        application={interviewDialogApplication}
        isOpen={interviewDialogApplication !== null}
        onClose={handleCloseInterviewDialog}
        onConfirm={handleConfirmSendInterview}
        isPending={createInterviewMutation.isPending}
      />
    </DashboardLayout>
  );
}
