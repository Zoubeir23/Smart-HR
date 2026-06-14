import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { GraduationCap, Calendar, Users, Video, Clock, BookOpen, Plus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trainingService } from '@/services/trainingService';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface ApiMeeting {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  meeting_link: string | null;
  status: string;
  formation: number;
}

interface ApiFormation {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  instructor: string;
  meetings: ApiMeeting[];
  created_at: string;
}

function getFormationStatus(formation: ApiFormation): 'en_cours' | 'planifie' | 'termine' {
  const now = new Date();
  const start = new Date(formation.start_date);
  const end = new Date(formation.end_date);
  if (now < start) return 'planifie';
  if (now > end) return 'termine';
  return 'en_cours';
}

const statusConfig = {
  en_cours: { label: 'En cours', className: 'bg-primary text-primary-foreground' },
  planifie: { label: 'Planifié', className: 'bg-warning text-warning-foreground' },
  termine: { label: 'Terminé', className: 'bg-success text-success-foreground' },
};

interface NewFormationForm {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  instructor: string;
}

export default function TrainingPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // Seuls RH/Admin planifient des formations ; l'employé consulte.
  const canManage = user?.role === 'RH' || user?.role === 'ADMIN';
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFormationForm, setNewFormationForm] = useState<NewFormationForm>({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    instructor: '',
  });

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

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => trainingService.createFormation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formations'] });
      toast.success('Formation créée avec succès.');
      setIsCreateDialogOpen(false);
      setNewFormationForm({ title: '', description: '', start_date: '', end_date: '', instructor: '' });
    },
    onError: () => {
      toast.error('Erreur lors de la création de la formation.');
    },
  });

  const handleCreateSubmit = () => {
    if (!newFormationForm.title || !newFormationForm.start_date || !newFormationForm.end_date || !newFormationForm.instructor) {
      toast.error('Le titre, le formateur et les dates sont obligatoires.');
      return;
    }
    if (new Date(newFormationForm.end_date) <= new Date(newFormationForm.start_date)) {
      toast.error('La date de fin doit être après la date de début.');
      return;
    }
    createMutation.mutate({ ...newFormationForm });
  };

  if (isLoadingFormations || isLoadingReunions) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const formationsEnCours = formations.filter((f) => getFormationStatus(f) === 'en_cours').length;
  const formationsTerminees = formations.filter((f) => getFormationStatus(f) === 'termine').length;
  const prochaineFormation = formations
    .filter((f) => getFormationStatus(f) === 'planifie')
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];

  return (
    <DashboardLayout>
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
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg text-foreground">{formation.title}</CardTitle>
                          <Badge className={statusConfig[status].className}>
                            {statusConfig[status].label}
                          </Badge>
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
        {reunions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Réunions</h2>
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
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Formation Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Planifier une formation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label>Titre *</Label>
                <Input
                  value={newFormationForm.title}
                  onChange={(e) => setNewFormationForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Formation Django REST Framework"
                />
              </div>
              <div className="grid gap-2">
                <Label>Formateur *</Label>
                <Input
                  value={newFormationForm.instructor}
                  onChange={(e) => setNewFormationForm((prev) => ({ ...prev, instructor: e.target.value }))}
                  placeholder="Ex: Marie Dupont"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Date de début *</Label>
                  <Input
                    type="datetime-local"
                    value={newFormationForm.start_date}
                    onChange={(e) => setNewFormationForm((prev) => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Date de fin *</Label>
                  <Input
                    type="datetime-local"
                    value={newFormationForm.end_date}
                    onChange={(e) => setNewFormationForm((prev) => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  value={newFormationForm.description}
                  onChange={(e) => setNewFormationForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Objectifs et contenu de la formation..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleCreateSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </DashboardLayout>
  );
}
