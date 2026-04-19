import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Volume2, Sparkles, Send, Loader2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { aiService } from '@/services/aiService';

type VoiceType = 'nova' | 'alloy' | 'echo';

interface Voice {
  id: VoiceType;
  name: string;
  description: string;
  gender: string;
}

interface VoiceResponse {
  text_response: string;
  audio_url: string | null;
  sources: string[];
  mode: string;
}

const VoiceAssistantPage = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceType>('nova');
  const [response, setResponse] = useState<VoiceResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textQuery, setTextQuery] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  const voices: Voice[] = [
    {
      id: 'nova',
      name: 'Nova',
      description: 'Féminine, douce',
      gender: 'Idéale pour l\'onboarding et le support candidat'
    },
    {
      id: 'alloy',
      name: 'Alloy',
      description: 'Neutre, claire',
      gender: 'Parfaite pour les FAQ et procédures'
    },
    {
      id: 'echo',
      name: 'Echo',
      description: 'Masculine, posée',
      gender: 'Recommandée pour les briefings d\'entretien'
    }
  ];

  const handleSubmitQuery = async (query: string) => {
    if (!query.trim() || isProcessing) return;

    setIsProcessing(true);
    setResponse(null);

    try {
      const data = await aiService.voiceAsk(query.trim(), selectedVoice);
      setResponse(data);
      setTextQuery('');
    } catch {
      setResponse({
        text_response: 'Désolé, une erreur est survenue. Veuillez réessayer.',
        audio_url: null,
        sources: [],
        mode: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      setIsRecording(false);
      // Use Web Speech API for voice-to-text
      // Falls back to a prompt if not supported
    } else {
      setIsRecording(true);
      setResponse(null);

      // Try Web Speech API
      const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition ||
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new (SpeechRecognition as new () => SpeechRecognition)();
        (recognition as unknown as Record<string, unknown>).lang = 'fr-FR';
        (recognition as unknown as Record<string, unknown>).continuous = false;
        (recognition as unknown as Record<string, unknown>).interimResults = false;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setTextQuery(transcript);
          setIsRecording(false);
          handleSubmitQuery(transcript);
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
      } else {
        setIsRecording(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitQuery(textQuery);
    }
  };

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const baseUrl = apiBaseUrl.replace('/api', '');

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-purple-600 rounded-2xl mb-4"
            >
              <Volume2 className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Assistant Vocal IA
            </h1>
            <p className="text-muted-foreground">
              Posez vos questions par texte ou vocalement et recevez des réponses instantanées
            </p>
          </div>

          {/* Voice Selection */}
          <Card className="mb-8">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Sélectionnez une voix
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {voices.map((voice) => (
                  <motion.button
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedVoice === voice.id
                        ? 'border-primary bg-secondary/5'
                        : 'border-border bg-card hover:border-secondary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground">{voice.name}</h3>
                      {selectedVoice === voice.id && (
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {voice.description}
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      {voice.gender}
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>
          </Card>

          {/* Text Input + Mic */}
          <Card className="mb-8">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={textQuery}
                    onChange={(e) => setTextQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Posez votre question ici..."
                    disabled={isProcessing}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 disabled:opacity-50"
                  />
                </div>
                <motion.button
                  onClick={() => handleSubmitQuery(textQuery)}
                  disabled={isProcessing || !textQuery.trim()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </motion.button>
                <motion.button
                  onClick={handleMicClick}
                  disabled={isProcessing}
                  whileHover={{ scale: isProcessing ? 1 : 1.05 }}
                  whileTap={{ scale: isProcessing ? 1 : 0.95 }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-50 ${
                    isRecording
                      ? 'bg-red-500 shadow-lg shadow-red-500/50'
                      : 'bg-gradient-to-br from-primary to-purple-600'
                  }`}
                >
                  {isRecording ? (
                    <MicOff className="w-5 h-5 text-white" />
                  ) : (
                    <Mic className="w-5 h-5 text-white" />
                  )}
                </motion.button>
              </div>
              {isRecording && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 text-sm text-red-500 text-center"
                >
                  En écoute... Parlez maintenant
                </motion.p>
              )}
            </div>
          </Card>

          {/* Response Section */}
          {response && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center">
                      <Volume2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          Assistant Vocal ({voices.find(v => v.id === selectedVoice)?.name})
                        </h3>
                        {response.mode === 'simulated' && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                            Mode simulé
                          </span>
                        )}
                        <motion.div
                          className="flex gap-1"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-1 h-4 bg-primary rounded-full"
                              animate={{ scaleY: [1, 1.5, 1] }}
                              transition={{
                                duration: 0.5,
                                repeat: Infinity,
                                delay: i * 0.15
                              }}
                            />
                          ))}
                        </motion.div>
                      </div>
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                        {response.text_response}
                      </p>

                      {/* Audio Player */}
                      {response.audio_url && (
                        <div className="mt-4">
                          <audio
                            ref={audioRef}
                            controls
                            autoPlay
                            className="w-full"
                            src={`${baseUrl}${response.audio_url}`}
                          />
                        </div>
                      )}

                      {/* Sources */}
                      {response.sources && response.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground font-medium mb-1">Sources:</p>
                          <div className="flex flex-wrap gap-1">
                            {response.sources.map((source, i) => (
                              <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
                                {source}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Instructions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <Card className="bg-secondary/5 border-secondary/20">
              <div className="p-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Exemples de questions
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[
                    'Comment fonctionne le processus de recrutement?',
                    'Comment puis-je poser une demande de congé?',
                    'Quels sont les avantages offerts par l\'entreprise?',
                    'Comment se préparer pour l\'entretien technique?',
                  ].map((question, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <button
                        onClick={() => {
                          setTextQuery(question);
                          handleSubmitQuery(question);
                        }}
                        className="text-left hover:text-primary transition-colors"
                      >
                        {question}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default VoiceAssistantPage;
