import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Mic, PhoneOff, Bot, User, Loader2 } from 'lucide-react';
import Vapi from '@vapi-ai/web';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { aiService, type InterviewSessionData } from '@/services/aiService';
import type { ConversationMessage } from '@/services/aiService';

interface LocationState {
  candidateName: string;
  candidateEmail: string;
  sessionData: InterviewSessionData;
}

export default function InterviewStartPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;

  const [sessionData, setSessionData] = useState<InterviewSessionData | null>(
    locationState?.sessionData ?? null
  );
  const [candidateName] = useState<string>(locationState?.candidateName ?? '');
  const [candidateEmail] = useState<string>(locationState?.candidateEmail ?? '');

  const [isLoadingSession, setIsLoadingSession] = useState(!locationState?.sessionData);
  const [callActive, setCallActive] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [callStarted, setCallStarted] = useState(false);

  const conversationRef = useRef<ConversationMessage[]>([]);
  const vapiRef = useRef<Vapi | null>(null);

  // Fallback: re-fetch session if state was lost (e.g. hard refresh)
  useEffect(() => {
    if (sessionData || !token) return;

    aiService
      .getInterviewSession(token)
      .then((data) => setSessionData(data))
      .catch(() => navigate(`/interview/${token}`))
      .finally(() => setIsLoadingSession(false));
  }, [token, sessionData, navigate]);

  // Redirect to landing page if candidate info is missing
  useEffect(() => {
    if (!isLoadingSession && sessionData && !candidateName) {
      navigate(`/interview/${token}`);
    }
  }, [isLoadingSession, sessionData, candidateName, token, navigate]);

  const buildQuestionList = (questions: InterviewSessionData['questions']) =>
    questions.map((q, i) => `${i + 1}. ${q.question}`).join('\n');

  const startVapiCall = (data: InterviewSessionData) => {
    const apiKey = import.meta.env.VITE_VAPI_PUBLIC_KEY as string;
    if (!apiKey || apiKey === 'your-vapi-public-key') {
      return;
    }

    const vapi = new Vapi(apiKey);
    vapiRef.current = vapi;

    const assistantOptions = {
      name: 'Smart-HR Recruteur',
      firstMessage: `Bonjour ${candidateName}, je suis votre recruteur IA Smart-HR. Êtes-vous prêt(e) pour votre entretien pour le poste de ${data.job_position} ? Commençons dès que vous le souhaitez.`,
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
Tu conduis un entretien pour le poste de ${data.job_position}.
Pose les questions suivantes une par une, dans l'ordre, et attends la réponse du candidat avant de passer à la suivante.
Après chaque réponse, donne un bref encouragement (une phrase).
Questions à poser :
${buildQuestionList(data.questions)}
Une fois toutes les questions posées, remercie le candidat chaleureusement et conclus l'entretien.`,
          },
        ],
      },
    };

    vapi.on('call-start', () => setCallActive(true));
    vapi.on('speech-start', () => setAiSpeaking(true));
    vapi.on('speech-end', () => {
      setAiSpeaking(false);
      setUserSpeaking(true);
    });
    vapi.on('message', (message: { conversation?: { role: string; content: string }[] }) => {
      if (message?.conversation) {
        conversationRef.current = message.conversation.map((m) => ({
          role: m.role as ConversationMessage['role'],
          content: m.content,
        }));
      }
    });
    vapi.on('call-end', () => {
      setCallActive(false);
      setCallEnded(true);
      setAiSpeaking(false);
      setUserSpeaking(false);
      handleSubmitFeedback(conversationRef.current);
    });

    vapi.start(assistantOptions);
  };

  const handleSubmitFeedback = async (conversation: ConversationMessage[]) => {
    if (!token) return;
    setIsSubmittingFeedback(true);

    try {
      const result = await aiService.submitInterviewFeedback(token, {
        candidate_name: candidateName,
        candidate_email: candidateEmail,
        conversation,
      });
      navigate(`/interview/${token}/completed`, {
        state: { feedback: result.feedback, recommended: result.recommended, candidateName },
      });
    } catch {
      navigate(`/interview/${token}/completed`, {
        state: { feedback: null, recommended: false, candidateName },
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const stopCall = () => {
    vapiRef.current?.stop();
  };

  useEffect(() => {
    return () => {
      const vapi = vapiRef.current;
      if (vapi) {
        vapi.stop();
        vapi.removeAllListeners?.();
        vapiRef.current = null;
      }
    };
  }, []);

  if (isLoadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sessionData) return null;

  if (isSubmittingFeedback || (callEnded && !isSubmittingFeedback)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-medium">Analyse de votre entretien en cours...</p>
        <p className="text-sm text-muted-foreground">Nous préparons votre feedback.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold">{sessionData.job_position}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sessionData.duration} — {sessionData.interview_type}
          </p>
        </div>

        {/* Participants */}
        <div className="grid grid-cols-2 gap-6">
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card">
            <div className="relative">
              {aiSpeaking && (
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
              )}
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-8 w-8 text-primary" />
              </div>
            </div>
            <p className="font-medium">Recruteur IA</p>
            {aiSpeaking && <p className="text-xs text-muted-foreground">Parle...</p>}
          </div>

          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card">
            <div className="relative">
              {userSpeaking && (
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
              )}
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                <User className="h-8 w-8" />
              </div>
            </div>
            <p className="font-medium">{candidateName}</p>
            {userSpeaking && <p className="text-xs text-muted-foreground">Parle...</p>}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-8 flex flex-col items-center gap-4">
          {!callStarted ? (
            <Button
              className="gap-2 bg-gradient-primary px-8"
              onClick={() => {
                setCallStarted(true);
                startVapiCall(sessionData);
              }}
            >
              <Mic className="h-4 w-4" />
              Rejoindre l'entretien
            </Button>
          ) : (
            <div className="flex items-center gap-6">
              <div
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full',
                  callActive ? 'bg-muted' : 'bg-muted/50'
                )}
              >
                <Mic
                  className={cn(
                    'h-6 w-6',
                    callActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                />
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
          )}

          <p className="text-xs text-muted-foreground">
            {!callStarted
              ? 'Cliquez sur "Rejoindre" quand vous êtes prêt(e)'
              : callActive
              ? 'Entretien en cours — cliquez sur le bouton rouge pour terminer'
              : 'Connexion en cours...'}
          </p>
        </div>
      </div>
    </div>
  );
}
