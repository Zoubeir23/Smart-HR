import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, Clock, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { aiService, type InterviewSessionData } from '@/services/aiService';

export default function InterviewLandingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [sessionData, setSessionData] = useState<InterviewSessionData | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');

  useEffect(() => {
    if (!token) return;

    aiService
      .getInterviewSession(token)
      .then((data) => setSessionData(data))
      .catch(() => setSessionError('Lien d\'entretien invalide ou expiré.'))
      .finally(() => setIsLoadingSession(false));
  }, [token]);

  const canStart = candidateName.trim().length > 0 && candidateEmail.trim().includes('@');

  const handleStartInterview = () => {
    if (!canStart || !sessionData || !token) return;
    navigate(`/interview/${token}/start`, {
      state: {
        candidateName: candidateName.trim(),
        candidateEmail: candidateEmail.trim(),
        sessionData,
      },
    });
  };

  if (isLoadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (sessionError || !sessionData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold">Lien invalide ou expiré</h1>
        <p className="text-center text-sm text-muted-foreground">
          {sessionError ?? 'Ce lien d\'entretien n\'est plus disponible.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Briefcase className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Smart-HR</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entretien IA</p>
        </div>

        {/* Session info */}
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">{sessionData.job_position}</h2>
          {sessionData.job_description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {sessionData.job_description}
            </p>
          )}
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {sessionData.duration}
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
              {sessionData.interview_type}
            </span>
            <span>{sessionData.questions.length} questions</span>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 font-medium">Vos informations</h3>

          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Nom complet</label>
              <Input
                placeholder="ex : Moussa Diop"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Adresse email</label>
              <Input
                type="email"
                placeholder="ex : moussa@example.com"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
              />
            </div>
          </div>

          <Button
            className="mt-5 w-full gap-2 bg-gradient-primary"
            disabled={!canStart}
            onClick={handleStartInterview}
          >
            Démarrer l'entretien
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Cet entretien est conduit par un assistant vocal IA. Vos réponses seront enregistrées.
        </p>
      </motion.div>
    </div>
  );
}
