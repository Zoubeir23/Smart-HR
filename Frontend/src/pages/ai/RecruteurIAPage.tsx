import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { InterviewFeedbackStep } from '@/components/ai/InterviewFeedbackStep';
import { InterviewFormStep } from '@/components/ai/InterviewFormStep';
import { InterviewQuestionsStep } from '@/components/ai/InterviewQuestionsStep';
import { InterviewSessionStep } from '@/components/ai/InterviewSessionStep';
import { InterviewStepIndicator } from '@/components/ai/InterviewStepIndicator';
import type {
  InterviewFeedback,
  InterviewFormData,
  InterviewPageStep,
  InterviewQuestion,
} from '@/components/ai/recruteurIaTypes';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { aiService, type ConversationMessage } from '@/services/aiService';

export default function RecruteurIAPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<InterviewPageStep>('form');
  const [jobPosition, setJobPosition] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [duration, setDuration] = useState('30 Min');
  const [interviewType, setInterviewType] = useState('Technique');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const { toast } = useToast();

  const userName = user?.first_name || user?.email || 'Candidat';

  const questionsMutation = useMutation({
    mutationFn: aiService.generateInterviewQuestions,
    onSuccess: (data) => {
      const list: InterviewQuestion[] = data?.interviewQuestions ?? [];
      if (!list.length) {
        toast({ title: 'Erreur', description: 'Aucune question générée. Réessayez.', variant: 'destructive' });
        return;
      }
      setQuestions(list);
      setStep('questions');
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de générer les questions.', variant: 'destructive' });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: (conversation: ConversationMessage[]) =>
      aiService.generateInterviewFeedback(conversation),
    onSuccess: (data) => {
      const raw = data?.feedback;
      const isValidFeedback =
        raw &&
        typeof raw === 'object' &&
        raw.rating &&
        typeof raw.rating.technicalSkills === 'number' &&
        typeof raw.rating.communication === 'number' &&
        typeof raw.rating.problemSolving === 'number' &&
        typeof raw.rating.experience === 'number' &&
        typeof raw.rating.totalRating === 'number' &&
        typeof raw.summary === 'string' &&
        typeof raw.recommendation === 'boolean';

      if (!isValidFeedback) {
        toast({ title: 'Erreur', description: 'Réponse du serveur invalide. Réessayez.', variant: 'destructive' });
        return;
      }
      setFeedback(raw as InterviewFeedback);
      setStep('feedback');
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Erreur lors de la génération du feedback.', variant: 'destructive' });
    },
  });

  const handleFormSubmit = (formData: InterviewFormData) => {
    setJobPosition(formData.job_position);
    setJobDescription(formData.job_description);
    setDuration(formData.duration);
    setInterviewType(formData.interview_type);
    questionsMutation.mutate(formData);
  };

  const handleInterviewComplete = (conversation: ConversationMessage[]) => {
    if (!conversation.length) {
      toast({ title: 'Entretien annulé', description: 'Aucune conversation enregistrée.' });
      setStep('questions');
      return;
    }
    feedbackMutation.mutate(conversation);
  };

  const handleRestart = () => {
    setStep('form');
    setQuestions([]);
    setFeedback(null);
    setJobPosition('');
    setJobDescription('');
    setDuration('30 Min');
    setInterviewType('Technique');
  };

  return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary"
          >
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Recruteur IA</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Générez des questions personnalisées et conduisez des entretiens vocaux assistés par IA
          </p>
        </div>

        <InterviewStepIndicator current={step} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {step === 'form' && (
              <InterviewFormStep
                onSubmit={handleFormSubmit}
                isLoading={questionsMutation.isPending}
              />
            )}

            {step === 'questions' && questions.length > 0 && (
              <InterviewQuestionsStep
                questions={questions}
                jobPosition={jobPosition}
                jobDescription={jobDescription}
                duration={duration}
                interviewType={interviewType}
                onStart={() => setStep('interview')}
                onBack={() => setStep('form')}
              />
            )}

            {step === 'interview' && (
              <InterviewSessionStep
                questions={questions}
                jobPosition={jobPosition}
                userName={userName}
                onComplete={handleInterviewComplete}
              />
            )}

            {step === 'feedback' && feedbackMutation.isPending && (
              <div className="flex flex-col items-center gap-3 py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Analyse de l'entretien en cours...</p>
              </div>
            )}

            {step === 'feedback' && !feedbackMutation.isPending && feedback && (
              <InterviewFeedbackStep
                feedback={feedback}
                jobPosition={jobPosition}
                onRestart={handleRestart}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
  );
}
