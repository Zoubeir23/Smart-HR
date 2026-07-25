import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Calendar, Users, Video, Clock, BookOpen, Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trainingService } from '@/services/trainingService';
import CompletionRateSection from '@/components/training/CompletionRateSection';
import TrainingProviderDirectory from '@/components/training/TrainingProviderDirectory';
import FormationFormDialog from '@/components/training/FormationFormDialog';
import MeetingFormDialog from '@/components/training/MeetingFormDialog';
import ConfirmDeleteDialog from '@/components/training/ConfirmDeleteDialog';
import {
  EMPTY_FORMATION_FORM,
  EMPTY_MEETING_FORM,
  FORMATION_STATUS_CONFIG,
  getFormationStatus,
  type ApiFormation,
  type ApiMeeting,
  type FormationFormValues,
  type MeetingFormValues,
} from '@/components/training/trainingTypes';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

/** Règles de validation communes à la création et à la modification d'une formation. */
function validateFormationForm(values: FormationFormValues): string | null {
  if (!values.title || !values.start_date || !values.end_date || !values.instructor) {
    return 'Le titre, le formateur et les dates sont obligatoires.';
  }
  if (new Date(values.end_date) <= new Date(values.start_date)) {
    return 'La date de fin doit être après la date de début.';
  }
  return null;
}

/** Règles de validation communes à la création et à la modification d'une réunion. */
function validateMeetingForm(values: MeetingFormValues): string | null {
  if (!values.title || !values.formation || !values.start_time || !values.end_time) {
    return 'Le titre, la formation et les dates sont obligatoires.';
  }
  if (new Date(values.end_time) <= new Date(values.start_time)) {
    return 'La date de fin doit être après la date de début.';
  }
  return null;
}

function toFormationPayload(values: FormationFormValues): Record<string, unknown> {
  return { ...values, cost: values.cost ? Number(values.cost) : 0 };
}

function toMeetingPayload(values: MeetingFormValues): Record<string, unknown> {
  return {
    title: values.title,
    formation: Number(values.formation),
    start_time: values.start_time,
    end_time: values.end_time,
    meeting_link: values.meeting_link || null,
  };
}

export default function TrainingPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // Seuls RH/Admin planifient des formations ; l'employé consulte.
  const canManage = user?.role === 'RH' || user?.role === 'ADMIN';

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFormationForm, setNewFormationForm] = useState<FormationFormValues>(EMPTY_FORMATION_FORM);
  const [editFormationTarget, setEditFormationTarget] = useState<ApiFormation | null>(null);
  const [editFormationForm, setEditFormationForm] = useState<FormationFormValues>(EMPTY_FORMATION_FORM);
  const [deleteFormationId, setDeleteFormationId] = useState<number | null>(null);

  const [isCreateMeetingDialogOpen, setIsCreateMeetingDialogOpen] = useState(false);
  const [newMeetingForm, setNewMeetingForm] = useState<MeetingFormValues>(EMPTY_MEETING_FORM);
  const [editMeetingTarget, setEditMeetingTarget] = useState<ApiMeeting | null>(null);
  const [editMeetingForm, setEditMeetingForm] = useState<MeetingFormValues>(EMPTY_MEETING_FORM);
  const [deleteMeetingId, setDeleteMeetingId] = useState<number | null>(null);

  const { data: formationsData, isLoading: isLoadingFormations } = useQuery({
    queryKey: ['formations'],
    queryFn: trainingService.getFormations,
  });

  const { data: reunionsData, isLoading: isLoadingReunions } = useQuery({
    queryKey: ['reunions'],
    queryFn: trainingService.getMeetings,
  });

  const formations: ApiFormation[] = formationsData?.results ?? formationsData ?? [];
  const reunions: ApiMeeting[] = reunionsData?.results ?? reunionsData ?? [];

  const invalidateFormations = () => queryClient.invalidateQueries({ queryKey: ['formations'] });
  const invalidateMeetings = () => queryClient.invalidateQueries({ queryKey: ['reunions'] });

  // ── Formations ────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => trainingService.createFormation(data),
    onSuccess: () => {
      invalidateFormations();
      toast.success('Formation créée avec succès.');
      setIsCreateDialogOpen(false);
      setNewFormationForm(EMPTY_FORMATION_FORM);
    },
    onError: () => {
      toast.error('Erreur lors de la création de la formation.');
    },
  });

  const updateFormationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      trainingService.updateFormation(id, data),
    onSuccess: () => {
      invalidateFormations();
      toast.success('Formation modifiée avec succès.');
      setEditFormationTarget(null);
    },
    onError: () => {
      toast.error('Erreur lors de la modification de la formation.');
    },
  });

  const deleteFormationMutation = useMutation({
    mutationFn: (id: number) => trainingService.deleteFormation(id),
    onSuccess: () => {
      invalidateFormations();
      invalidateMeetings();
      toast.success('Formation supprimée.');
      setDeleteFormationId(null);
    },
    onError: () => {
      toast.error('Erreur lors de la suppression de la formation.');
    },
  });

  const handleCreateSubmit = () => {
    const validationError = validateFormationForm(newFormationForm);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    createMutation.mutate(toFormationPayload(newFormationForm));
  };

  const openEditFormation = (formation: ApiFormation) => {
    setEditFormationTarget(formation);
    setEditFormationForm({
      title: formation.title,
      description: formation.description,
      start_date: formation.start_date,
      end_date: formation.end_date,
      instructor: formation.instructor,
      cost: String(formation.cost ?? ''),
    });
  };

  const handleEditFormationSubmit = () => {
    if (!editFormationTarget) return;
    const validationError = validateFormationForm(editFormationForm);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    updateFormationMutation.mutate({
      id: editFormationTarget.id,
      data: toFormationPayload(editFormationForm),
    });
  };

  // ── Réunions ──────────────────────────────────────────────────────
  const createMeetingMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => trainingService.createMeeting(data),
    onSuccess: () => {
      invalidateMeetings();
      invalidateFormations();
      toast.success('Réunion planifiée avec succès.');
      setIsCreateMeetingDialogOpen(false);
      setNewMeetingForm(EMPTY_MEETING_FORM);
    },
    onError: () => {
      toast.error('Erreur lors de la planification de la réunion.');
    },
  });

  const updateMeetingMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      trainingService.updateMeeting(id, data),
    onSuccess: () => {
      invalidateMeetings();
      invalidateFormations();
      toast.success('Réunion modifiée avec succès.');
      setEditMeetingTarget(null);
    },
    onError: () => {
      toast.error('Erreur lors de la modification de la réunion.');
    },
  });

  const deleteMeetingMutation = useMutation({
    mutationFn: (id: number) => trainingService.deleteMeeting(id),
    onSuccess: () => {
      invalidateMeetings();
      invalidateFormations();
      toast.success('Réunion supprimée.');
      setDeleteMeetingId(null);
    },
    onError: () => {
      toast.error('Erreur lors de la suppression de la réunion.');
    },
  });

  const handleCreateMeetingSubmit = () => {
    const validationError = validateMeetingForm(newMeetingForm);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    createMeetingMutation.mutate(toMeetingPayload(newMeetingForm));
  };

  const openEditMeeting = (meeting: ApiMeeting) => {
    setEditMeetingTarget(meeting);
    setEditMeetingForm({
      title: meeting.title,
      formation: String(meeting.formation),
      start_time: meeting.start_time,
      end_time: meeting.end_time,
      meeting_link: meeting.meeting_link || '',
    });
  };

  const handleEditMeetingSubmit = () => {
    if (!editMeetingTarget) return;
    const validationError = validateMeetingForm(editMeetingForm);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    updateMeetingMutation.mutate({
      id: editMeetingTarget.id,
      data: toMeetingPayload(editMeetingForm),
    });
  };

  if (isLoadingFormations || isLoadingReunions) {
    return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  const formationsEnCours = formations.filter((f) => getFormationStatus(f) === 'en_cours').length;
  const formationsTerminees = formations.filter((f) => getFormationStatus(f) === 'termine').length;
  const prochaineFormation = formations
    .filter((f) => getFormationStatus(f) === 'planifie')
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];

  return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Formations & Réunions</h1>
            <p className="text-muted-foreground mt-1">
              {canManage
                ? 'Gérez les formations et les réunions de votre équipe'
                : 'Consultez les formations et réunions auxquelles vous participez'}
            </p>
          </div>
          {canManage && (
            <Button className="bg-primary text-primary-foreground" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Planifier une formation
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-border shadow-sm rounded-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Formations en cours</p>
                  <p className="text-2xl font-bold text-foreground">{formationsEnCours}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm rounded-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Formations terminées</p>
                  <p className="text-2xl font-bold text-foreground">{formationsTerminees}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm rounded-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Users className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total formations</p>
                  <p className="text-2xl font-bold text-foreground">{formations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm rounded-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prochaine session</p>
                  <p className="text-sm font-bold text-foreground">
                    {prochaineFormation
                      ? new Date(prochaineFormation.start_date).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Aucune'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Taux de complétion */}
        {canManage && <CompletionRateSection />}

        {/* Annuaire des fournisseurs de formation */}
        <TrainingProviderDirectory canManage={canManage} />

        {/* Formations */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Formations</h2>
          {formations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
              <GraduationCap className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Aucune formation planifiée</p>
              {canManage && (
                <Button className="mt-4" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer une formation
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formations.map((formation) => {
                const status = getFormationStatus(formation);
                return (
                  <motion.div
                    key={formation.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border border-border shadow-sm rounded-lg">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg text-foreground">{formation.title}</CardTitle>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={FORMATION_STATUS_CONFIG[status].className}>
                              {FORMATION_STATUS_CONFIG[status].label}
                            </Badge>
                            {canManage && (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  aria-label="Modifier la formation"
                                  title="Modifier la formation"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => openEditFormation(formation)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  aria-label="Supprimer la formation"
                                  title="Supprimer la formation"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteFormationId(formation.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {formation.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {formation.description}
                          </p>
                        )}
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-foreground">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            <span>Formateur : <strong>{formation.instructor}</strong></span>
                          </div>
                          <div className="flex items-center gap-2 text-foreground">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {new Date(formation.start_date).toLocaleDateString('fr-FR')} -{' '}
                              {new Date(formation.end_date).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          {formation.meetings.length > 0 && (
                            <div className="flex items-center gap-2 text-foreground">
                              <Video className="h-4 w-4 text-muted-foreground" />
                              <span>{formation.meetings.length} réunion{formation.meetings.length > 1 ? 's' : ''}</span>
                            </div>
                          )}
                          {canManage && formation.cost > 0 && (
                            <div className="flex items-center gap-2 text-foreground">
                              <span className="text-muted-foreground">Coût :</span>
                              <strong>{new Intl.NumberFormat('fr-FR').format(formation.cost)} FCFA</strong>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Prochaines réunions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Réunions</h2>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateMeetingDialogOpen(true)}
                disabled={formations.length === 0}
                title={formations.length === 0 ? "Créez d'abord une formation pour pouvoir y rattacher une réunion." : undefined}
              >
                <Plus className="mr-2 h-4 w-4" />
                Planifier une réunion
              </Button>
            )}
          </div>
          {reunions.length === 0 ? (
            <Card className="border border-dashed border-border shadow-none rounded-lg">
              <CardContent className="flex flex-col items-center justify-center gap-1 py-10 text-center">
                <p className="text-sm font-medium text-foreground">Aucune réunion planifiée</p>
                <p className="text-sm text-muted-foreground">
                  {canManage
                    ? 'Planifiez une réunion liée à une formation existante.'
                    : "Aucune réunion n'est prévue pour le moment."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-border shadow-sm rounded-lg">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {reunions.map((reunion) => (
                    <motion.div
                      key={reunion.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0 p-3 bg-primary/10 rounded-lg text-center min-w-[60px]">
                        <p className="text-xs text-muted-foreground">
                          {new Date(reunion.start_time).toLocaleDateString('fr-FR', { month: 'short' })}
                        </p>
                        <p className="text-lg font-bold text-primary">
                          {new Date(reunion.start_time).toLocaleDateString('fr-FR', { day: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{reunion.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {new Date(reunion.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {reunion.meeting_link && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Video className="h-3.5 w-3.5" />
                              <a href={reunion.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                Rejoindre
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {reunion.status === 'scheduled' ? 'Planifiée' : reunion.status === 'completed' ? 'Terminée' : 'Annulée'}
                      </Badge>
                      {canManage && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Modifier la réunion"
                            title="Modifier la réunion"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditMeeting(reunion)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Supprimer la réunion"
                            title="Supprimer la réunion"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteMeetingId(reunion.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialogues de gestion — réservés RH/Admin */}
        {canManage && (
          <>
            <FormationFormDialog
              isOpen={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
              title="Planifier une formation"
              submitLabel="Créer"
              values={newFormationForm}
              onValuesChange={setNewFormationForm}
              onSubmit={handleCreateSubmit}
              isPending={createMutation.isPending}
            />

            <FormationFormDialog
              isOpen={editFormationTarget !== null}
              onOpenChange={(open) => { if (!open) setEditFormationTarget(null); }}
              title="Modifier la formation"
              submitLabel="Enregistrer"
              values={editFormationForm}
              onValuesChange={setEditFormationForm}
              onSubmit={handleEditFormationSubmit}
              isPending={updateFormationMutation.isPending}
            />

            <ConfirmDeleteDialog
              isOpen={deleteFormationId !== null}
              onOpenChange={(open) => { if (!open) setDeleteFormationId(null); }}
              title="Supprimer cette formation ?"
              description="Cette action est définitive. Les réunions et participations associées à cette formation seront également supprimées."
              onConfirm={() => deleteFormationId !== null && deleteFormationMutation.mutate(deleteFormationId)}
            />

            <MeetingFormDialog
              isOpen={isCreateMeetingDialogOpen}
              onOpenChange={setIsCreateMeetingDialogOpen}
              title="Planifier une réunion"
              submitLabel="Créer"
              values={newMeetingForm}
              onValuesChange={setNewMeetingForm}
              formations={formations}
              onSubmit={handleCreateMeetingSubmit}
              isPending={createMeetingMutation.isPending}
            />

            <MeetingFormDialog
              isOpen={editMeetingTarget !== null}
              onOpenChange={(open) => { if (!open) setEditMeetingTarget(null); }}
              title="Modifier la réunion"
              submitLabel="Enregistrer"
              values={editMeetingForm}
              onValuesChange={setEditMeetingForm}
              formations={formations}
              onSubmit={handleEditMeetingSubmit}
              isPending={updateMeetingMutation.isPending}
            />

            <ConfirmDeleteDialog
              isOpen={deleteMeetingId !== null}
              onOpenChange={(open) => { if (!open) setDeleteMeetingId(null); }}
              title="Supprimer cette réunion ?"
              description="Cette action est définitive et ne peut pas être annulée."
              onConfirm={() => deleteMeetingId !== null && deleteMeetingMutation.mutate(deleteMeetingId)}
            />
          </>
        )}
      </motion.div>
  );
}
