import { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Check, ChevronLeft, Copy, Link2, Loader2, Phone } from 'lucide-react';
import type { InterviewQuestion } from '@/components/ai/recruteurIaTypes';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { aiService, type InterviewQuestion as InterviewQuestionType } from '@/services/aiService';
import { cn } from '@/lib/utils';

const TYPE_COLORS: Record<string, string> = {
  Technique: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Comportemental: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Expérience: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Résolution de problèmes': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Leadership: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

interface InterviewQuestionsStepProps {
  questions: InterviewQuestion[];
  jobPosition: string;
  jobDescription: string;
  duration: string;
  interviewType: string;
  onStart: () => void;
  onBack: () => void;
}

export function InterviewQuestionsStep({
  questions,
  jobPosition,
  jobDescription,
  duration,
  interviewType,
  onStart,
  onBack,
}: InterviewQuestionsStepProps) {
  const { toast } = useToast();
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleGenerateShareLink = async () => {
    setIsGeneratingLink(true);
    try {
      const result = await aiService.createInterviewSession({
        job_position: jobPosition,
        job_description: jobDescription,
        duration,
        interview_type: interviewType,
        questions: questions as InterviewQuestionType[],
      });
      const link = `${window.location.origin}/interview/${result.token}`;
      setShareLink(link);
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le lien. Réessayez.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setIsCopied(true);
      toast({ title: 'Lien copié', description: 'Le lien a été copié dans le presse-papier.' });
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de copier le lien.', variant: 'destructive' });
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 rounded-lg border border-secondary/30 bg-secondary/5 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <Briefcase className="h-4 w-4 text-primary" />
          <span className="font-medium">{jobPosition}</span>
          <span className="ml-auto text-muted-foreground">{questions.length} questions générées</span>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        {questions.map((q, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex gap-3 rounded-lg border border-border/50 bg-muted/20 p-3.5"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {index + 1}
            </span>
            <div className="flex-1">
              <p className="text-sm leading-relaxed">{q.question}</p>
              <span
                className={cn(
                  'mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium',
                  TYPE_COLORS[q.type] ?? 'bg-muted text-muted-foreground'
                )}
              >
                {q.type}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Share link card */}
      {shareLink && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
            Lien de partage
          </p>
          <div className="flex items-center gap-2">
            <p className="flex-1 truncate rounded border border-border bg-background px-3 py-1.5 text-xs font-mono text-muted-foreground">
              {shareLink}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={handleCopyLink}
            >
              {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {isCopied ? 'Copié' : 'Copier'}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Envoyez ce lien au candidat. Il pourra passer l'entretien sans se connecter.
          </p>
        </motion.div>
      )}

      <div className="mt-5 flex flex-wrap justify-between gap-3">
        <Button variant="outline" onClick={onBack} className="gap-1.5">
          <ChevronLeft className="h-4 w-4" />
          Reconfigurer
        </Button>

        <div className="flex gap-2">
          {!shareLink && (
            <Button
              variant="outline"
              onClick={handleGenerateShareLink}
              disabled={isGeneratingLink}
              className="gap-1.5"
            >
              {isGeneratingLink ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Générer le lien
            </Button>
          )}
          <Button onClick={onStart} className="gap-2 bg-gradient-primary">
            <Phone className="h-4 w-4" />
            Démarrer l'entretien vocal
          </Button>
        </div>
      </div>
    </div>
  );
}
