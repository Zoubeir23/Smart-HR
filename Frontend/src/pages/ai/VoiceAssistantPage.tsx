import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  Loader2,
  RefreshCcw,
  Radio,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { aiService } from '@/services/aiService';
import { cn } from '@/lib/utils';

/* ─── Types ─── */

type VoiceType = 'nova' | 'alloy' | 'echo';

interface VoiceProfile {
  id: VoiceType;
  name: string;
  description: string;
  useCase: string;
  pitch: number;
  rate: number;
}

interface ConversationEntry {
  id: number;
  question: string;
  answer: string;
  voice: VoiceType;
  timestamp: Date;
}

/* ─── Voice profiles mapped to Web Speech Synthesis params ─── */

const VOICE_PROFILES: VoiceProfile[] = [
  {
    id: 'nova',
    name: 'Nova',
    description: 'Féminine, douce',
    useCase: "Onboarding et support candidat",
    pitch: 1.2,
    rate: 0.95,
  },
  {
    id: 'alloy',
    name: 'Alloy',
    description: 'Neutre, claire',
    useCase: "FAQ et procédures RH",
    pitch: 1.0,
    rate: 1.0,
  },
  {
    id: 'echo',
    name: 'Echo',
    description: 'Masculine, posée',
    useCase: "Briefings d'entretien",
    pitch: 0.85,
    rate: 0.9,
  },
];

const EXAMPLE_QUESTIONS = [
  'Comment poser une demande de congé ?',
  'Où trouver mes fiches de paie ?',
  "Comment se préparer pour l'entretien technique ?",
  "Quels sont les avantages offerts par l'entreprise ?",
  "Quelle est la procédure en cas d'absence ?",
];

/* ─── TTS helper ─── */

function speakText(text: string, profile: VoiceProfile): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR';
  utterance.pitch = profile.pitch;
  utterance.rate = profile.rate;

  const voices = window.speechSynthesis.getVoices();
  const frenchVoice = voices.find(
    (v) => v.lang.startsWith('fr') && v.localService
  ) ?? voices.find((v) => v.lang.startsWith('fr'));
  if (frenchVoice) utterance.voice = frenchVoice;

  window.speechSynthesis.speak(utterance);
}

function stopSpeech(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

/* ─── Main component ─── */

export default function VoiceAssistantPage() {
  const [selectedVoice, setSelectedVoice] = useState<VoiceType>('nova');
  const [textQuery, setTextQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const entryCounterRef = useRef(0);

  const currentProfile = VOICE_PROFILES.find((v) => v.id === selectedVoice) ?? VOICE_PROFILES[0];

  /* ── Submit query to backend ── */

  const submitQuery = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || isProcessing) return;

      setIsProcessing(true);
      setTextQuery('');
      stopSpeech();
      setIsSpeaking(false);

      try {
        const data = await aiService.voiceAsk(trimmed, selectedVoice);
        const answer: string = data.text_response ?? "Je n'ai pas pu générer de réponse.";

        entryCounterRef.current += 1;
        setConversation((prev) => [
          {
            id: entryCounterRef.current,
            question: trimmed,
            answer,
            voice: selectedVoice,
            timestamp: new Date(),
          },
          ...prev,
        ]);

        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(answer);
        utterance.lang = 'fr-FR';
        utterance.pitch = currentProfile.pitch;
        utterance.rate = currentProfile.rate;
        const voices = window.speechSynthesis.getVoices();
        const frenchVoice =
          voices.find((v) => v.lang.startsWith('fr') && v.localService) ??
          voices.find((v) => v.lang.startsWith('fr'));
        if (frenchVoice) utterance.voice = frenchVoice;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch {
        entryCounterRef.current += 1;
        setConversation((prev) => [
          {
            id: entryCounterRef.current,
            question: trimmed,
            answer: "Une erreur s'est produite. Veuillez réessayer.",
            voice: selectedVoice,
            timestamp: new Date(),
          },
          ...prev,
        ]);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, selectedVoice, currentProfile]
  );

  /* ── Speech recognition ── */

  const toggleMic = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognitionApi =
      (window as unknown as Record<string, unknown>).SpeechRecognition ??
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      alert("La reconnaissance vocale n'est pas supportée par ce navigateur. Utilisez Chrome ou Edge.");
      return;
    }

    const recognition = new (SpeechRecognitionApi as new () => SpeechRecognition)();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);
      submitQuery(transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    setIsRecording(true);
    recognition.start();
  }, [isRecording, submitQuery]);

  /* ── Replay TTS for a past entry ── */

  const replayEntry = useCallback(
    (entry: ConversationEntry) => {
      const profile = VOICE_PROFILES.find((v) => v.id === entry.voice) ?? currentProfile;
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(entry.answer);
      utterance.lang = 'fr-FR';
      utterance.pitch = profile.pitch;
      utterance.rate = profile.rate;
      const voices = window.speechSynthesis.getVoices();
      const frenchVoice =
        voices.find((v) => v.lang.startsWith('fr') && v.localService) ??
        voices.find((v) => v.lang.startsWith('fr'));
      if (frenchVoice) utterance.voice = frenchVoice;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [currentProfile]
  );

  const handleStopSpeech = () => {
    stopSpeech();
    setIsSpeaking(false);
  };

  const handleClearConversation = () => {
    stopSpeech();
    setIsSpeaking(false);
    setConversation([]);
  };

  /* ── Render ── */

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-purple-600 mb-3">
            <Volume2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Assistant Vocal RH</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Posez vos questions par texte ou par micro, obtenez des réponses lues à voix haute
          </p>
        </motion.div>

        {/* Voice selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Voix de l'assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {VOICE_PROFILES.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setSelectedVoice(profile.id)}
                  className={cn(
                    'rounded-lg border-2 p-3 text-left transition-all',
                    selectedVoice === profile.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-foreground">{profile.name}</span>
                    {selectedVoice === profile.id && (
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{profile.description}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 italic">{profile.useCase}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Input zone */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={textQuery}
                onChange={(e) => setTextQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitQuery(textQuery);
                  }
                }}
                placeholder="Votre question (ou cliquez sur le micro)..."
                disabled={isProcessing || isRecording}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              />
              <Button
                onClick={() => submitQuery(textQuery)}
                disabled={isProcessing || !textQuery.trim() || isRecording}
                size="icon"
                className="shrink-0"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
              <motion.button
                onClick={toggleMic}
                disabled={isProcessing}
                whileTap={{ scale: 0.93 }}
                className={cn(
                  'shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                  isRecording
                    ? 'bg-red-500 shadow-lg shadow-red-500/30'
                    : 'bg-gradient-to-br from-primary to-purple-600'
                )}
              >
                {isRecording ? (
                  <MicOff className="w-4 h-4 text-white" />
                ) : (
                  <Mic className="w-4 h-4 text-white" />
                )}
              </motion.button>
            </div>

            <AnimatePresence>
              {isRecording && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 text-xs text-red-500 text-center"
                >
                  En écoute... parlez maintenant
                </motion.p>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* TTS status bar */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-2"
            >
              <div className="flex items-center gap-2 text-sm text-primary">
                <Radio className="w-4 h-4 animate-pulse" />
                <span>Lecture en cours — {currentProfile.name}</span>
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.span
                      key={i}
                      className="block h-3 w-0.5 rounded-full bg-primary"
                      animate={{ scaleY: [1, 2, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleStopSpeech} className="h-7 px-2 text-xs">
                <VolumeX className="w-3 h-3 mr-1" />
                Arrêter
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversation history */}
        <AnimatePresence>
          {conversation.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Historique ({conversation.length})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearConversation}
                  className="h-7 px-2 text-xs text-muted-foreground"
                >
                  <RefreshCcw className="w-3 h-3 mr-1" />
                  Effacer
                </Button>
              </div>

              {conversation.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border-l-4 border-l-primary/40">
                    <CardContent className="pt-4 pb-3">
                      {/* Question */}
                      <div className="flex items-start gap-2 mb-3">
                        <div className="h-6 w-6 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                          Q
                        </div>
                        <p className="text-sm text-foreground">{entry.question}</p>
                      </div>
                      {/* Answer */}
                      <div className="flex items-start gap-2">
                        <div className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                          <Volume2 className="w-3 h-3 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-foreground leading-relaxed">{entry.answer}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {VOICE_PROFILES.find((v) => v.id === entry.voice)?.name}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {entry.timestamp.toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => replayEntry(entry)}
                              className="h-6 px-2 text-xs"
                            >
                              <Volume2 className="w-3 h-3 mr-1" />
                              Rejouer
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Example questions */}
        {conversation.length === 0 && !isProcessing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.3 } }}>
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">
                  Exemples de questions
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      onClick={() => submitQuery(question)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:border-primary/50 hover:text-primary transition-colors text-foreground"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
