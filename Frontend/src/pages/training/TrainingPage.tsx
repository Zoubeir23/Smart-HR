import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, Calendar, Users, Video, Clock, BookOpen, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { trainingService } from '@/services/trainingService';

type FormationStatus = 'en_cours' | 'planifie' | 'termine';

interface Formation {
  id: string;
  titre: string;
  description: string;
  formateur: string;
  dateDebut: string;
  dateFin: string;
  participants: number;
  totalParticipants: number;
  progression: number;
  statut: FormationStatus;
}

interface Reunion {
  id: string;
  sujet: string;
  date: string;
  heure: string;
  organisateur: string;
  lieu: string;
}

const statutConfig = {
  en_cours: { label: 'En cours', className: 'bg-primary text-primary-foreground' },
  planifie: { label: 'Planifié', className: 'bg-warning text-warning-foreground' },
  termine: { label: 'Terminé', className: 'bg-success text-success-foreground' },
};

export default function TrainingPage() {
  const { data: formationsData, isLoading: isLoadingFormations } = useQuery({ queryKey: ['formations'], queryFn: trainingService.getFormations });
  const { data: reunionsData, isLoading: isLoadingReunions } = useQuery({ queryKey: ['reunions'], queryFn: trainingService.getMeetings });

  const formations: Formation[] = formationsData?.results || formationsData || [];
  const reunions: Reunion[] = reunionsData?.results || reunionsData || [];

  if (isLoadingFormations || isLoadingReunions) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </DashboardLayout>
    );
  }

  const formationsEnCours = formations.filter(f => f.statut === 'en_cours').length;
  const formationsTerminees = formations.filter(f => f.statut === 'termine').length;
  const totalParticipants = formations.reduce((sum, f) => sum + f.participants, 0);
  const prochaineSession = formations
    .filter(f => f.statut === 'planifie')
    .sort((a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime())[0];

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
              Gérez les formations et les réunions de votre équipe
            </p>
          </div>
          <Button className="bg-primary text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Planifier une formation
          </Button>
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
                  <p className="text-sm text-muted-foreground">Participants total</p>
                  <p className="text-2xl font-bold text-foreground">{totalParticipants}</p>
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
                    {prochaineSession
                      ? new Date(prochaineSession.dateDebut).toLocaleDateString('fr-FR', {
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

        {/* Formations en cours */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Formations en cours</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formations.map((formation) => (
              <motion.div
                key={formation.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border border-border shadow-sm rounded-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg text-foreground">{formation.titre}</CardTitle>
                      <Badge className={statutConfig[formation.statut].className}>
                        {statutConfig[formation.statut].label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {formation.description}
                    </p>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-foreground">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        <span>Formateur : <strong>{formation.formateur}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {new Date(formation.dateDebut).toLocaleDateString('fr-FR')} - {new Date(formation.dateFin).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{formation.participants}/{formation.totalParticipants} participants</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progression</span>
                        <span className="font-medium text-foreground">{formation.progression}%</span>
                      </div>
                      <Progress value={formation.progression} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Prochaines réunions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Prochaines réunions</h2>
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
                        {new Date(reunion.date).toLocaleDateString('fr-FR', { month: 'short' })}
                      </p>
                      <p className="text-lg font-bold text-primary">
                        {new Date(reunion.date).toLocaleDateString('fr-FR', { day: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{reunion.sujet}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{reunion.heure}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          <span>{reunion.organisateur}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          {reunion.lieu.includes('Zoom') ? (
                            <Video className="h-3.5 w-3.5" />
                          ) : (
                            <Calendar className="h-3.5 w-3.5" />
                          )}
                          <span>{reunion.lieu}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Détails
                    </Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
