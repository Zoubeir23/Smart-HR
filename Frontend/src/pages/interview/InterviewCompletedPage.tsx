import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, BarChart3, MessageSquare, Lightbulb, Briefcase } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface InterviewFeedbackRating {
  technicalSkills: number;
  communication: number;
  problemSolving: number;
  experience: number;
  totalRating: number;
}

interface InterviewFeedback {
  rating: InterviewFeedbackRating;
  summary: string;
  recommendation: boolean;
  recommendationMessage: string;
}

interface LocationState {
  feedback: InterviewFeedback | null;
  recommended: boolean;
  candidateName: string;
}

export default function InterviewCompletedPage() {
  const location = useLocation();
  const state = location.state as LocationState | null;

  const feedback = state?.feedback ?? null;
  const candidateName = state?.candidateName ?? 'Candidat';

  if (!feedback) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h1 className="text-xl font-bold">Entretien terminé</h1>
        <p className="text-center text-sm text-muted-foreground">
          Merci {candidateName}, votre entretien a bien été enregistré. Vous recevrez un retour prochainement.
        </p>
      </div>
    );
  }

  const { rating, summary, recommendation, recommendationMessage } = feedback;

  const scoreItems = [
    { label: 'Compétences techniques', value: rating.technicalSkills, icon: BarChart3 },
    { label: 'Communication', value: rating.communication, icon: MessageSquare },
    { label: 'Résolution de problèmes', value: rating.problemSolving, icon: Lightbulb },
    { label: 'Expérience', value: rating.experience, icon: Briefcase },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-background px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Briefcase className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Smart-HR</h1>
          <p className="mt-1 text-sm text-muted-foreground">Résultat de votre entretien</p>
        </div>

        {/* Thank you */}
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Merci pour votre entretien, <span className="font-semibold text-foreground">{candidateName}</span>.
        </p>

        {/* Score global */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 rounded-xl border border-border bg-card p-6 text-center"
        >
          <p className="mb-1 text-sm text-muted-foreground">Score global</p>
          <div className="text-5xl font-bold text-primary">
            {rating.totalRating}
            <span className="text-2xl text-muted-foreground">/10</span>
          </div>
        </motion.div>

        {/* Scores détaillés */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          {scoreItems.map(({ label, value, icon: Icon }, index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">{label}</span>
                </div>
                <span className="text-sm font-bold text-primary">{value}/10</span>
              </div>
              <Progress value={value * 10} className="h-1.5" />
            </motion.div>
          ))}
        </div>

        {/* Résumé */}
        <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Résumé de performance
          </p>
          <p className="text-sm leading-relaxed">{summary}</p>
        </div>

        {/* Recommandation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className={cn(
            'flex items-start gap-3 rounded-lg p-4',
            recommendation
              ? 'border border-success/30 bg-success/10 text-success'
              : 'border border-destructive/30 bg-destructive/10 text-destructive'
          )}
        >
          {recommendation ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <div>
            <p className="text-sm font-semibold">
              {recommendation ? 'Profil retenu' : 'Profil non retenu'}
            </p>
            <p className="text-sm opacity-80">{recommendationMessage}</p>
          </div>
        </motion.div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ces résultats seront transmis à l'équipe RH pour la suite du processus.
        </p>
      </div>
    </div>
  );
}
