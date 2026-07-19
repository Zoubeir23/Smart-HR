import { motion } from 'framer-motion';
import { BarChart3, Briefcase, CheckCircle2, Lightbulb, MessageSquare, RotateCcw, XCircle } from 'lucide-react';
import type { InterviewFeedback } from '@/components/ai/recruteurIaTypes';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface InterviewFeedbackStepProps {
  feedback: InterviewFeedback;
  jobPosition: string;
  onRestart: () => void;
}

export function InterviewFeedbackStep({ feedback, jobPosition, onRestart }: InterviewFeedbackStepProps) {
  const { rating, summary, recommendation, recommendationMessage } = feedback;

  const scoreItems = [
    { label: 'Compétences techniques', value: rating.technicalSkills, icon: BarChart3 },
    { label: 'Communication', value: rating.communication, icon: MessageSquare },
    { label: 'Résolution de problèmes', value: rating.problemSolving, icon: Lightbulb },
    { label: 'Expérience', value: rating.experience, icon: Briefcase },
  ];

  return (
    <div className="mx-auto max-w-2xl">
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
        <p className="mt-1 text-sm text-muted-foreground">{jobPosition}</p>
      </motion.div>

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

      <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Résumé de performance
        </p>
        <p className="text-sm leading-relaxed">{summary}</p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className={cn(
          'mb-6 flex items-start gap-3 rounded-lg p-4',
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
            {recommendation ? 'Candidat recommandé' : 'Candidat non recommandé'}
          </p>
          <p className="text-sm opacity-80">{recommendationMessage}</p>
        </div>
      </motion.div>

      <div className="flex justify-center">
        <Button variant="outline" onClick={onRestart} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Nouvel entretien
        </Button>
      </div>
    </div>
  );
}
