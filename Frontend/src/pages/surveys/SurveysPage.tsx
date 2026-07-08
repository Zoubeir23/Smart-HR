import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Trash2, Play, Square, BarChart3, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { surveyService, type Survey } from '@/services/surveyService';
import CreateSurveyDialog from '@/components/surveys/CreateSurveyDialog';
import RespondToSurveyDialog from '@/components/surveys/RespondToSurveyDialog';
import SurveyResultsDialog from '@/components/surveys/SurveyResultsDialog';

const STATUS_BADGE_STYLES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-success/20 text-success border-success/30',
  closed: 'bg-muted text-muted-foreground border-border',
};

export default function SurveysPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canManage = user?.role === 'RH' || user?.role === 'ADMIN';

  const [respondingTo, setRespondingTo] = useState<Survey | null>(null);
  const [viewingResultsOf, setViewingResultsOf] = useState<Survey | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['surveys'],
    queryFn: surveyService.getAll,
  });

  const surveys: Survey[] = (data as { results?: Survey[] })?.results ?? (data as Survey[]) ?? [];

  const activateMutation = useMutation({
    mutationFn: surveyService.activate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast({ title: 'Enquête activée' });
    },
  });

  const closeMutation = useMutation({
    mutationFn: surveyService.close,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast({ title: 'Enquête clôturée' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: surveyService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast({ title: 'Enquête supprimée' });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de supprimer cette enquête.', variant: 'destructive' });
      setDeleteId(null);
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Enquêtes internes</h1>
          <p className="mt-1 text-muted-foreground">
            {canManage ? "Créez et suivez vos enquêtes d'engagement et de satisfaction" : 'Consultez et répondez aux enquêtes en cours'}
          </p>
        </div>
        {canManage && <CreateSurveyDialog />}
      </div>

      {isLoading && <p className="py-10 text-center text-muted-foreground">Chargement…</p>}

      {!isLoading && surveys.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <ClipboardCheck className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">Aucune enquête pour le moment.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {surveys.map((survey) => (
          <Card key={survey.id} className="border border-border shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <CardTitle className="text-base">{survey.title}</CardTitle>
              <Badge variant="outline" className={STATUS_BADGE_STYLES[survey.status]}>{survey.status_display}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {survey.description && <p className="text-sm text-muted-foreground line-clamp-2">{survey.description}</p>}
              <p className="text-xs text-muted-foreground">
                {survey.questions.length} question{survey.questions.length > 1 ? 's' : ''}
                {survey.is_anonymous && ' · Anonyme'}
              </p>

              {!canManage && survey.status === 'active' && (
                survey.has_responded ? (
                  <div className="flex items-center gap-1.5 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    Réponse envoyée
                  </div>
                ) : (
                  <Button size="sm" className="w-full" onClick={() => setRespondingTo(survey)}>Répondre</Button>
                )
              )}

              {canManage && (
                <div className="flex flex-wrap gap-2">
                  {survey.status === 'draft' && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => activateMutation.mutate(survey.id)}>
                      <Play className="h-3.5 w-3.5" />
                      Activer
                    </Button>
                  )}
                  {survey.status === 'active' && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => closeMutation.mutate(survey.id)}>
                      <Square className="h-3.5 w-3.5" />
                      Clôturer
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setViewingResultsOf(survey)}>
                    <BarChart3 className="h-3.5 w-3.5" />
                    Résultats
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(survey.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <RespondToSurveyDialog survey={respondingTo} onClose={() => setRespondingTo(null)} />
      <SurveyResultsDialog survey={viewingResultsOf} onClose={() => setViewingResultsOf(null)} />

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette enquête ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. Les réponses déjà collectées seront perdues.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
