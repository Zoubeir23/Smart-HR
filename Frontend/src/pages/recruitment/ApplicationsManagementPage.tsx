import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, Send, Users } from 'lucide-react';
import { recruitmentService } from '@/services/recruitmentService';
import BulkCvUploadDialog from '@/components/recrutement/BulkCvUploadDialog';
import { ApplicationCard } from '@/components/recrutement/ApplicationCard';
import { BulkInterviewDialog } from '@/components/recrutement/BulkInterviewDialog';
import { InterviewDialog } from '@/components/recrutement/InterviewDialog';
import { APPLICATION_STATUSES } from '@/components/recrutement/applicationConstants';
import { getCandidateFullName } from '@/components/recrutement/applicationHelpers';
import type { Application, ApplicationStatus, JobOffer } from '@/components/recrutement/applicationTypes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export default function ApplicationsManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters state
  const [selectedJobOfferId, setSelectedJobOfferId] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [candidateSearchQuery, setSearchQuery] = useState('');
  const [minimumScoreFilter, setMinimumScoreFilter] = useState<string>('0');

  // Interview dialog state
  const [interviewDialogApplication, setInterviewDialogApplication] = useState<Application | null>(null);

  // Bulk selection state
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<Set<number>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkSendProgress, setBulkSendProgress] = useState<{ sent: number; total: number } | null>(null);

  // Track sent interviews locally (by application ID)
  const [sentInterviewApplicationIds, setSentInterviewApplicationIds] = useState<Set<number>>(new Set());

  // Track the application being onboarded
  const [onboardingApplicationId, setOnboardingApplicationId] = useState<number | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);

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
    let list = allApplications;
    const minimumScore = Number(minimumScoreFilter);
    if (minimumScore > 0) {
      list = list.filter((application) => (application.matching_score ?? 0) >= minimumScore);
    }
    if (candidateSearchQuery.trim()) {
      const normalizedQuery = candidateSearchQuery.toLowerCase().trim();
      list = list.filter((application) => {
        const fullName = getCandidateFullName(application).toLowerCase();
        return fullName.includes(normalizedQuery) || application.email.toLowerCase().includes(normalizedQuery);
      });
    }
    return list;
  }, [allApplications, candidateSearchQuery, minimumScoreFilter]);

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

  const onboardMutation = useMutation({
    mutationFn: ({ applicationId }: { applicationId: number }) =>
      recruitmentService.onboardCandidate(applicationId),
    onSuccess: (responseData) => {
      queryClient.invalidateQueries({ queryKey: ['applications-management'] });
      setOnboardingApplicationId(null);
      toast({
        title: 'Onboarding réussi',
        description: responseData?.detail ?? 'Le candidat a été intégré comme employé.',
      });
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      setOnboardingApplicationId(null);
      toast({
        title: 'Erreur lors de l\'onboarding',
        description: error?.response?.data?.detail ?? 'Impossible d\'intégrer ce candidat. Réessayez.',
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

  const deleteApplicationMutation = useMutation({
    mutationFn: (applicationId: number) => recruitmentService.deleteApplication(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications-management'] });
      setDeleteTarget(null);
      toast({ title: 'Candidature supprimée' });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la candidature. Réessayez.',
        variant: 'destructive',
      });
    },
  });

  // ── Handlers ──

  const handleStatusChange = (applicationId: number, newStatus: ApplicationStatus) => {
    updateStatusMutation.mutate({ applicationId, newStatus });
  };

  const handleOnboard = (application: Application) => {
    setOnboardingApplicationId(application.id);
    onboardMutation.mutate({ applicationId: application.id });
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

  // ── Bulk selection handlers ──

  const handleToggleSelectApplication = useCallback((applicationId: number) => {
    setSelectedApplicationIds((previousSet) => {
      const updatedSet = new Set(previousSet);
      if (updatedSet.has(applicationId)) {
        updatedSet.delete(applicationId);
      } else {
        updatedSet.add(applicationId);
      }
      return updatedSet;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    if (selectedApplicationIds.size === filteredApplicationsList.length) {
      setSelectedApplicationIds(new Set());
    } else {
      setSelectedApplicationIds(new Set(filteredApplicationsList.map((a) => a.id)));
    }
  }, [filteredApplicationsList, selectedApplicationIds.size]);

  const handleConfirmBulkSendInterview = async (duration: string, interviewType: string) => {
    const applicationIds = Array.from(selectedApplicationIds);
    setBulkSendProgress({ sent: 0, total: applicationIds.length });
    setBulkDialogOpen(false);

    for (let index = 0; index < applicationIds.length; index++) {
      const applicationId = applicationIds[index];
      try {
        await recruitmentService.createInterview(applicationId, { duration, interview_type: interviewType });
        setSentInterviewApplicationIds((previousSet) => {
          const updatedSet = new Set(previousSet);
          updatedSet.add(applicationId);
          return updatedSet;
        });
      } catch {
        // Silently continue for failed ones
      }
      setBulkSendProgress({ sent: index + 1, total: applicationIds.length });
    }

    setBulkSendProgress(null);
    setSelectedApplicationIds(new Set());
    toast({
      title: 'Invitations envoyées',
      description: `${applicationIds.length} invitation${applicationIds.length > 1 ? 's' : ''} envoyée${applicationIds.length > 1 ? 's' : ''} avec succès.`,
    });
  };

  // ── Render ──

  const isLoading = isLoadingApplications || isLoadingJobOffers;

  return (
    <>
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

                {/* Minimum score filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Score minimum</Label>
                  <Select value={minimumScoreFilter} onValueChange={setMinimumScoreFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les scores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Tous les scores</SelectItem>
                      <SelectItem value="40">40%+</SelectItem>
                      <SelectItem value="60">60%+</SelectItem>
                      <SelectItem value="70">70%+</SelectItem>
                      <SelectItem value="80">80%+</SelectItem>
                      <SelectItem value="90">90%+</SelectItem>
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

        {selectedJobOfferId !== 'all' && (
          <div className="flex justify-end">
            <BulkCvUploadDialog
              jobOfferId={Number(selectedJobOfferId)}
              jobOfferTitle={jobOffers.find((jobOffer) => String(jobOffer.id) === selectedJobOfferId)?.title ?? ''}
            />
          </div>
        )}

        {/* Bulk action bar */}
        <AnimatePresence>
          {selectedApplicationIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedApplicationIds.size === filteredApplicationsList.length}
                  onCheckedChange={handleToggleSelectAll}
                  id="select-all-checkbox"
                />
                <span className="text-sm font-medium text-foreground">
                  {selectedApplicationIds.size} candidat{selectedApplicationIds.size > 1 ? 's' : ''} sélectionné{selectedApplicationIds.size > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {bulkSendProgress && (
                  <span className="text-sm text-muted-foreground">
                    {bulkSendProgress.sent}/{bulkSendProgress.total} envoyé{bulkSendProgress.sent > 1 ? 's' : ''}...
                  </span>
                )}
                <Button
                  size="sm"
                  onClick={() => setBulkDialogOpen(true)}
                  disabled={bulkSendProgress !== null}
                  className="gap-2"
                >
                  {bulkSendProgress ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Envoyer entretien IA à {selectedApplicationIds.size} candidat{selectedApplicationIds.size > 1 ? 's' : ''}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedApplicationIds(new Set())}
                  disabled={bulkSendProgress !== null}
                >
                  Annuler
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                    onOnboard={handleOnboard}
                    onDelete={setDeleteTarget}
                    isStatusChangePending={
                      updateStatusMutation.isPending &&
                      updateStatusMutation.variables?.applicationId === application.id
                    }
                    isOnboardPending={onboardMutation.isPending && onboardingApplicationId === application.id}
                    isSelected={selectedApplicationIds.has(application.id)}
                    onToggleSelect={handleToggleSelectApplication}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Single interview dialog */}
      <InterviewDialog
        application={interviewDialogApplication}
        isOpen={interviewDialogApplication !== null}
        onClose={handleCloseInterviewDialog}
        onConfirm={handleConfirmSendInterview}
        isPending={createInterviewMutation.isPending}
      />

      {/* Bulk interview dialog */}
      <BulkInterviewDialog
        isOpen={bulkDialogOpen}
        candidateCount={selectedApplicationIds.size}
        onClose={() => setBulkDialogOpen(false)}
        onConfirm={handleConfirmBulkSendInterview}
        isPending={bulkSendProgress !== null}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette candidature ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive. Le CV et les documents associés à{' '}
              {deleteTarget ? getCandidateFullName(deleteTarget) : 'ce candidat'} seront également supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteApplicationMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
