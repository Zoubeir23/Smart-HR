import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Bot,
  User,
  CheckCircle2,
  XCircle,
  BarChart3,
  MessageSquare,
  Lightbulb,
  Briefcase,
  Clock,
  Sparkles,
  RotateCcw,
  Phone,
  PhoneOff,
} from 'lucide-react';
import Vapi from '@vapi-ai/web';
import { useMutation } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { aiService, type ConversationMessage } from '@/services/aiService';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

/* ─────────── Types ─────────── */

interface InterviewQuestion {
  question: string;
  type: string;
}


interface InterviewFeedback {
  rating: {
    technicalSkills: number;
    communication: number;
    problemSolving: number;
    experience: number;
    totalRating: number;
  };
  summary: string;
  recommendation: boolean;
  recommendationMessage: string;
}

type PageStep = 'form' | 'questions' | 'interview' | 'feedback';

const INTERVIEW_TYPES = ['Technique', 'Comportemental', 'Expérience', 'Résolution de problèmes', 'Leadership'];
const DURATIONS = ['5 Min', '15 Min', '30 Min', '45 Min', '60 Min'];

const STEP_LABELS: Record<PageStep, string> = {
  form: 'Configurer',
  questions: 'Questions',
  interview: 'Entretien',
  feedback: 'Feedback',
};

const STEPS: PageStep[] = ['form', 'questions', 'interview', 'feedback'];

/* ─────────── Step indicator ─────────── */

function StepIndicator({ current }: { current: PageStep }) {
  const currentIndex = STEPS.indexOf(current);
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, index) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
              index < currentIndex
                ? 'bg-success text-white'
                : index === currentIndex
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {index < currentIndex ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
          </div>
          <span
            className={cn(
              'text-xs font-medium',
              index === currentIndex ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {STEP_LABELS[step]}
          </span>
          {index < STEPS.length - 1 && (
            <div className={cn('h-px w-8 bg-border', index < currentIndex && 'bg-success')} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ÉTAPE 1 — FORMULAIRE
   ═══════════════════════════════════════════ */

interface FormData {
  job_position: string;
  job_description: string;
  duration: string;
  interview_type: string;
}

function InterviewFormStep({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<FormData>({
    job_position: '',
    job_description: '',
    duration: '30 Min',
    interview_type: 'Technique',
  });

  const handleChange = (field: keyof FormData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const canSubmit = formData.job_position.trim() && formData.job_description.trim();

  return (
    <div className="mx-auto max-w-2xl space-y-5 rounded-xl border border-border bg-card p-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Intitulé du poste</label>
        <Input
          placeholder="ex : Développeur Full Stack Django / React"
          value={formData.job_position}
          onChange={(e) => handleChange('job_position', e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Description du poste</label>
        <Textarea
          placeholder="Décrivez les responsabilités, compétences requises et profil recherché..."
          className="h-[160px] resize-none"
          value={formData.job_description}
          onChange={(e) => handleChange('job_description', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Durée de l'entretien</label>
          <Select value={formData.duration} onValueChange={(v) => handleChange('duration', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  <Clock className="mr-2 inline h-3.5 w-3.5" />
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Type d'entretien</label>
          <Select value={formData.interview_type} onValueChange={(v) => handleChange('interview_type', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVIEW_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={() => onSubmit(formData)}
          disabled={!canSubmit || isLoading}
          className="gap-2 bg-gradient-primary"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              Générer les questions
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ÉTAPE 2 — QUESTIONS GÉNÉRÉES
   ═══════════════════════════════════════════ */

function QuestionsStep({
  questions,
  jobPosition,
  onStart,
  onBack,
}: {
  questions: InterviewQuestion[];
  jobPosition: string;
  onStart: () => void;
  onBack: () => void;
}) {
  const typeColors: Record<string, string> = {
    Technique: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Comportemental: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Expérience: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Résolution de problèmes': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Leadership: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
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
                  typeColors[q.type] ?? 'bg-muted text-muted-foreground'
                )}
              >
                {q.type}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-5 flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-1.5">
          <ChevronLeft className="h-4 w-4" />
          Reconfigurer
        </Button>
        <Button onClick={onStart} className="gap-2 bg-gradient-primary">
          <Phone className="h-4 w-4" />
          Démarrer l'entretien vocal
        </Button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ÉTAPE 3 — SESSION ENTRETIEN VOCAL (VAPI)
   ═══════════════════════════════════════════ */

function InterviewSessionStep({
  questions,
  jobPosition,
  userName,
  onComplete,
}: {
  questions: InterviewQuestion[];
  jobPosition: string;
  userName: string;
  onComplete: (conversation: ConversationMessage[]) => void;
}) {
  const [callActive, setCallActive] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const conversationRef = useRef<ConversationMessage[]>([]);
  const vapiRef = useRef<Vapi | null>(null);
  const { toast } = useToast();

  const buildQuestionList = () =>
    questions.map((q, i) => `${i + 1}. ${q.question}`).join('\n');

  const startCall = () => {
    const apiKey = import.meta.env.VITE_VAPI_PUBLIC_KEY as string;
    if (!apiKey || apiKey === 'your-vapi-public-key') {
      toast({
        title: 'Clé Vapi manquante',
        description: 'Configurez VITE_VAPI_PUBLIC_KEY dans votre .env.',
        variant: 'destructive',
      });
      return;
    }

    const vapi = new Vapi(apiKey);
    vapiRef.current = vapi;

    const assistantOptions = {
      name: 'Smart-HR Recruteur',
      firstMessage: `Bonjour ${userName}, je suis votre recruteur IA Smart-HR. Êtes-vous prêt(e) pour votre entretien pour le poste de ${jobPosition} ? Commençons dès que vous le souhaitez.`,
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'fr',
      },
      voice: {
        provider: 'playht',
        voiceId: 'jennifer',
      },
      model: {
        provider: 'openai',
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `Tu es un recruteur IA professionnel et bienveillant de Smart-HR.
Tu conduis un entretien pour le poste de ${jobPosition}.
Pose les questions suivantes une par une, dans l'ordre, et attends la réponse du candidat avant de passer à la suivante.
Après chaque réponse, donne un bref encouragement (une phrase).
Questions à poser :
${buildQuestionList()}
Une fois toutes les questions posées, remercie le candidat chaleureusement et conclus l'entretien.`,
          },
        ],
      },
    };

    vapi.on('call-start', () => {
      setCallActive(true);
      toast({ title: 'Appel connecté', description: 'L\'entretien vocal a démarré.' });
    });

    vapi.on('speech-start', () => setAiSpeaking(true));
    vapi.on('speech-end', () => {
      setAiSpeaking(false);
      setUserSpeaking(true);
    });

    vapi.on('message', (message: { conversation?: { role: string; content: string }[] }) => {
      if (message?.conversation) {
        conversationRef.current = message.conversation.map((m) => ({
          role: m.role,
          content: m.content,
        }));
      }
    });

    vapi.on('call-end', () => {
      setCallActive(false);
      setCallEnded(true);
      setAiSpeaking(false);
      setUserSpeaking(false);
      setIsGeneratingFeedback(true);
      toast({ title: 'Entretien terminé', description: 'Génération du feedback en cours...' });
      onComplete(conversationRef.current);
    });

    vapi.start(assistantOptions);
  };

  const stopCall = () => {
    vapiRef.current?.stop();
  };

  useEffect(() => {
    startCall();
    return () => {
      const vapi = vapiRef.current;
      if (vapi) {
        vapi.stop();
        vapi.removeAllListeners?.();
        vapiRef.current = null;
      }
    };
    // startCall dépend de questions/jobPosition/userName qui sont stables à ce stade
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isGeneratingFeedback) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-medium">Analyse de votre entretien en cours...</p>
        <p className="text-sm text-muted-foreground">Le feedback sera prêt dans quelques secondes.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="grid grid-cols-2 gap-6">
        {/* Recruteur IA */}
        <div className="flex h-[340px] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card">
          <div className="relative">
            {aiSpeaking && (
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
            )}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-8 w-8 text-primary" />
            </div>
          </div>
          <p className="font-medium">Recruteur IA</p>
          {aiSpeaking && (
            <p className="text-xs text-muted-foreground">Parle...</p>
          )}
        </div>

        {/* Candidat */}
        <div className="flex h-[340px] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card">
          <div className="relative">
            {userSpeaking && (
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
            )}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {userName?.[0]?.toUpperCase() ?? 'C'}
            </div>
          </div>
          <p className="font-medium">{userName}</p>
          {userSpeaking && (
            <p className="text-xs text-muted-foreground">Parle...</p>
          )}
        </div>
      </div>

      {/* Contrôles */}
      <div className="mt-8 flex items-center justify-center gap-6">
        <div
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full',
            callActive ? 'bg-muted' : 'bg-muted/50'
          )}
        >
          <Mic className={cn('h-6 w-6', callActive ? 'text-foreground' : 'text-muted-foreground')} />
        </div>

        <Button
          variant="destructive"
          size="lg"
          className="h-14 w-14 rounded-full p-0"
          onClick={stopCall}
          disabled={!callActive || callEnded}
          title="Terminer l'appel"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {callActive ? 'Entretien en cours — cliquez sur le bouton rouge pour terminer' : 'Connexion en cours...'}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ÉTAPE 4 — FEEDBACK
   ═══════════════════════════════════════════ */

function FeedbackStep({
  feedback,
  jobPosition,
  onRestart,
}: {
  feedback: InterviewFeedback;
  jobPosition: string;
  onRestart: () => void;
}) {
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

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */

export default function RecruteurIAPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<PageStep>('form');
  const [jobPosition, setJobPosition] = useState('');
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

  const handleFormSubmit = (formData: {
    job_position: string;
    job_description: string;
    duration: string;
    interview_type: string;
  }) => {
    setJobPosition(formData.job_position);
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
  };

  return (
    <DashboardLayout>
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

        <StepIndicator current={step} />

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
              <QuestionsStep
                questions={questions}
                jobPosition={jobPosition}
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
              <FeedbackStep
                feedback={feedback}
                jobPosition={jobPosition}
                onRestart={handleRestart}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
