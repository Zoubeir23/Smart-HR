import { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Mic, PhoneOff } from 'lucide-react';
import Vapi from '@vapi-ai/web';
import type { InterviewQuestion } from '@/components/ai/recruteurIaTypes';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { type ConversationMessage } from '@/services/aiService';
import { cn } from '@/lib/utils';

interface InterviewSessionStepProps {
  questions: InterviewQuestion[];
  jobPosition: string;
  userName: string;
  onComplete: (conversation: ConversationMessage[]) => void;
}

export function InterviewSessionStep({ questions, jobPosition, userName, onComplete }: InterviewSessionStepProps) {
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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
