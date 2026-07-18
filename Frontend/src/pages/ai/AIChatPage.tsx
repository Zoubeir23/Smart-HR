import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Copy,
  Check,
  Lightbulb,
  BarChart3,
  Users,
  Calendar,
  ArrowDown,
  Mic,
  MicOff,
  PhoneForwarded,
  Paperclip,
  X,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { aiService, ChatHistoryEntry } from '@/services/aiService';
import { cn } from '@/lib/utils';
import ConversationSidebar from '@/components/ai/ConversationSidebar';
import ActionResultCard from '@/components/ai/ActionResultCard';

/* ─────────── Types ─────────── */

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  actionType?: string;
  actionData?: Record<string, unknown>;
}

/* ─────────── Suggestion Chips par rôle ─────────── */

const SUGGESTIONS_BY_ROLE: Record<string, { text: string; icon: React.ElementType }[]> = {
  ADMIN: [
    { text: "Combien d'employés sont à risque de départ ?", icon: BarChart3 },
    { text: 'Résumé des congés en attente de validation', icon: Calendar },
    { text: 'Statistiques globales des effectifs', icon: Users },
    { text: 'Quelles actions recommandes-tu pour réduire le churn ?', icon: Lightbulb },
  ],
  RH: [
    { text: "Quels employés présentent un risque de départ élevé ?", icon: BarChart3 },
    { text: 'Combien de demandes de congés sont en attente ?', icon: Calendar },
    { text: 'Comment analyser les dernières candidatures reçues ?', icon: Users },
    { text: 'Comment fonctionne le matching IA des CVs ?', icon: Lightbulb },
  ],
  EMPLOYEE: [
    { text: 'Quel est le statut de mes dernières demandes de congé ?', icon: Calendar },
    { text: 'Comment poser une demande de congé ?', icon: Lightbulb },
    { text: 'Comment consulter ma fiche de paie ?', icon: BarChart3 },
    { text: 'Quelles formations sont disponibles pour moi ?', icon: Users },
  ],
  CANDIDATE: [
    { text: 'Quel est le statut de ma candidature ?', icon: BarChart3 },
    { text: 'Comment se déroule le processus de recrutement ?', icon: Lightbulb },
    { text: 'Comment améliorer mon score de compatibilité IA ?', icon: Calendar },
    { text: 'Que se passe-t-il après l\'analyse IA de mon CV ?', icon: Users },
  ],
};

/* ─────────── Helpers ─────────── */

function formatTime(date: Date) {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function chatHistoryToMessages(history: ChatHistoryEntry[]): Message[] {
  return history.flatMap((entry) => [
    { id: `${entry.id}-q`, text: entry.question, sender: 'user' as const, timestamp: new Date(entry.created_at) },
    {
      id: `${entry.id}-r`,
      text: entry.response,
      sender: 'ai' as const,
      timestamp: new Date(entry.created_at),
      actionType: entry.action_type || undefined,
      actionData: entry.action_data,
    },
  ]);
}

/* ─────────── Typing Indicator ─────────── */

function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-start gap-3"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
          <span className="ml-2 text-xs text-muted-foreground">Réflexion en cours...</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */

function buildWelcomeMessage(user: { first_name?: string; role?: string } | null): string {
  const firstName = user?.first_name ?? '';
  const role = (user?.role ?? '').toUpperCase();
  const greeting = firstName ? `Bonjour ${firstName} !` : 'Bonjour !';

  const roleMessages: Record<string, string> = {
    ADMIN: `${greeting} Je suis votre assistant IA Smart-HR. En tant qu'administrateur, je peux vous aider à analyser les statistiques globales, les risques de départ, les congés et le recrutement. Que souhaitez-vous savoir ?`,
    RH: `${greeting} Je suis votre assistant IA Smart-HR. Je peux vous aider à interpréter les données du personnel, analyser les risques de départ, gérer les congés et optimiser le recrutement. Comment puis-je vous aider ?`,
    EMPLOYEE: `${greeting} Je suis votre assistant RH personnel. Je peux vous aider avec vos congés, votre fiche de paie, les formations disponibles et les politiques de l'entreprise. Quelle est votre question ?`,
    CANDIDATE: `${greeting} Je suis votre guide de candidature Smart-HR. Je peux vous informer sur le statut de votre candidature, le déroulement du processus de recrutement et vous aider à maximiser vos chances. Comment puis-je vous aider ?`,
  };

  return roleMessages[role] ?? `${greeting} Je suis l'assistant IA Smart-HR. Comment puis-je vous aider ?`;
}

function buildWelcomeMessageObject(user: { first_name?: string; role?: string } | null): Message {
  return {
    id: 'welcome-' + Date.now(),
    text: buildWelcomeMessage(user),
    sender: 'ai',
    timestamp: new Date(),
  };
}

export default function AIChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const userRole = (user?.role ?? '').toUpperCase();
  const suggestions = SUGGESTIONS_BY_ROLE[userRole] ?? SUGGESTIONS_BY_ROLE['RH'];

  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([buildWelcomeMessageObject(user)]);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [confusedCount, setConfusedCount] = useState(0);
  const [showEscalation, setShowEscalation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Toujours à jour (contrairement à une closure figée au moment du .mutate()) —
  // permet de vérifier si l'utilisateur a changé de conversation avant que la
  // réponse IA n'arrive, pour ne pas l'injecter dans le mauvais fil.
  const activeConversationIdRef = useRef<number | null>(null);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // ─── Historique de conversations ──────
  const { data: conversations = [] } = useQuery({
    queryKey: ['ai-conversations'],
    queryFn: aiService.getConversations,
  });

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([buildWelcomeMessageObject(user)]);
    setConfusedCount(0);
    setShowEscalation(false);
  }, [user]);

  const selectConversation = async (id: number) => {
    if (id === activeConversationId) return;
    setActiveConversationId(id);
    setIsLoadingConversation(true);
    setConfusedCount(0);
    setShowEscalation(false);
    try {
      const history = await aiService.getConversationMessages(id);
      setMessages(history.length > 0 ? chatHistoryToMessages(history) : [buildWelcomeMessageObject(user)]);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger cette conversation.', variant: 'destructive' });
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const deleteConversationMutation = useMutation({
    mutationFn: (id: number) => aiService.deleteConversation(id),
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      if (deletedId === activeConversationId) startNewConversation();
      toast({ title: 'Conversation supprimée' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de supprimer cette conversation.', variant: 'destructive' });
    },
  });

  // ─── Auto-scroll ──────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Track scroll position for "scroll to bottom" button
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // ─── Chat Mutation ────────────────────
  const CONFUSION_KEYWORDS = [
    'je ne comprends pas',
    'je ne peux pas',
    "je n'ai pas accès",
    'pourriez-vous reformuler',
    'je ne dispose pas',
    'je ne suis pas sûr',
    "je n'ai pas cette information",
    'je ne sais pas',
  ];

  const detectConfusion = (responseText: string): boolean => {
    const normalized = responseText.toLowerCase();
    return CONFUSION_KEYWORDS.some((keyword) => normalized.includes(keyword));
  };

  const chatMutation = useMutation({
    mutationFn: ({ question, conversationId, file }: { question: string; conversationId: number | null; file?: File | null }) =>
      aiService.chat(question, conversationId ?? undefined, file),
    onSuccess: (data, variables) => {
      const responseText = data?.response || data?.answer || data?.message || JSON.stringify(data);
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      setIsTyping(false);

      // L'utilisateur a peut-être changé de conversation pendant que la
      // réponse IA était en cours de génération — dans ce cas, la réponse
      // est déjà persistée côté serveur, mais on ne l'injecte pas dans le
      // fil actuellement affiché (qui appartient à une autre conversation).
      const stillOnSameConversation =
        variables.conversationId === null
          ? activeConversationIdRef.current === null
          : activeConversationIdRef.current === variables.conversationId;
      if (!stillOnSameConversation) return;

      if (variables.conversationId === null && data?.conversation) {
        setActiveConversationId(data.conversation);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: responseText,
          sender: 'ai',
          timestamp: new Date(),
          actionType: data?.action_type || undefined,
          actionData: data?.action_data,
        },
      ]);

      if (detectConfusion(responseText)) {
        setConfusedCount((prev) => {
          const next = prev + 1;
          if (next >= 2) setShowEscalation(true);
          return next;
        });
      } else {
        setConfusedCount(0);
      }
    },
    onError: (_error, variables) => {
      setIsTyping(false);
      const stillOnSameConversation =
        variables.conversationId === null
          ? activeConversationIdRef.current === null
          : activeConversationIdRef.current === variables.conversationId;
      if (!stillOnSameConversation) return;

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "Désolé, une erreur est survenue. Le service est peut-être temporairement indisponible. Veuillez réessayer.",
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
    },
  });

  // ─── Send Message ─────────────────────
  const handleSend = (text?: string) => {
    // Les suggestions (texte explicite) sont des questions génériques sans
    // rapport avec le document : elles partent sans le fichier joint, qui
    // reste en place pour l'envoi saisi par l'utilisateur.
    const isSuggestionSend = text !== undefined;
    const fileToSend = isSuggestionSend ? null : attachedFile;
    const msg = (text ?? inputValue).trim();
    // Un fichier joint seul suffit : le backend applique une question par défaut.
    if ((!msg && !fileToSend) || isTyping) return;

    const displayedText = fileToSend
      ? `${msg ? `${msg}\n\n` : ''}📎 ${fileToSend.name}`
      : msg;
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text: displayedText, sender: 'user', timestamp: new Date() },
    ]);
    setInputValue('');
    setIsTyping(true);
    chatMutation.mutate({ question: msg, conversationId: activeConversationId, file: fileToSend });
    if (fileToSend) {
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }

    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Copy Message ─────────────────────
  const copyToClipboard = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ title: 'Copié', description: 'Message copié dans le presse-papier.' });
    } catch {
      toast({ title: 'Erreur', description: 'Copie non autorisée par le navigateur.', variant: 'destructive' });
    }
  };

  // ─── Auto-resize textarea ─────────────
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  // ─── Voice Input (Web Speech API) ────
  const toggleVoiceInput = () => {
    const SpeechRecognitionAPI =
      (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      toast({ title: 'Non supporté', description: 'La reconnaissance vocale n\'est pas disponible dans ce navigateur.', variant: 'destructive' });
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInputValue((prev) => (prev ? prev + ' ' + transcript : transcript));
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
      }
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const showSuggestions = messages.length <= 1 && !isTyping;

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-3">
      <ConversationSidebar
        items={conversations}
        activeId={activeConversationId}
        onSelect={selectConversation}
        onNew={startNewConversation}
        onDelete={(id) => deleteConversationMutation.mutate(id)}
        newLabel="Nouvelle conversation"
        emptyLabel="Aucune conversation pour le moment."
        deleteTitle="Supprimer cette conversation ?"
        deleteDescription="Cette action est irréversible. Tous les messages de ce fil seront définitivement supprimés."
      />
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        {/* ────── HEADER ────── */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary"
            >
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Assistant IA Smart-HR</h1>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-success" />
                <span className="text-xs text-muted-foreground">En ligne — Propulsé par IA Générative</span>
              </div>
            </div>
          </div>
        </div>

        {/* ────── MESSAGES ────── */}
        <div ref={scrollContainerRef} className="relative flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-5 px-5 py-6">
            {isLoadingConversation && (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                Chargement de la conversation…
              </div>
            )}
            <AnimatePresence initial={false}>
              {!isLoadingConversation && messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={cn('flex items-start gap-3', message.sender === 'user' && 'flex-row-reverse')}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      message.sender === 'user' ? 'bg-primary' : 'bg-secondary/10'
                    )}
                  >
                    {message.sender === 'user' ? (
                      <User className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <Bot className="h-4 w-4 text-primary" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div className={cn('group max-w-[75%]', message.sender === 'user' && 'text-right')}>
                    <div
                      className={cn(
                        'inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                        message.sender === 'user'
                          ? 'rounded-tr-sm bg-primary text-primary-foreground'
                          : 'rounded-tl-sm border border-border bg-muted/40 text-foreground'
                      )}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed whitespace-pre-wrap">{children}</p>,
                          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          ul: ({ children }) => <ul className="mb-2 ml-5 list-outside list-disc space-y-1 marker:text-primary/70">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-2 ml-5 list-outside list-decimal space-y-1 marker:text-primary/70">{children}</ol>,
                          li: ({ children }) => <li className="pl-1">{children}</li>,
                          h1: ({ children }) => <h1 className="mb-2 mt-4 text-lg font-bold">{children}</h1>,
                          h2: ({ children }) => <h2 className="mb-2 mt-4 text-base font-bold">{children}</h2>,
                          h3: ({ children }) => <h3 className="mb-2 mt-3 text-sm font-bold">{children}</h3>,
                          a: ({ href, children }) => (
                            <a href={href} className="text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                              {children}
                            </a>
                          ),
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          code: ({ inline, className, children, ...props }: any) => {
                            return !inline ? (
                              <pre className="mb-2 overflow-x-auto rounded-lg bg-black/10 dark:bg-white/10 p-3 text-xs">
                                <code {...props}>{children}</code>
                              </pre>
                            ) : (
                              <code className="rounded bg-black/10 dark:bg-white/10 px-1.5 py-0.5 text-[0.8em]" {...props}>
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>
                      {message.actionType && message.actionData && (
                        <ActionResultCard actionType={message.actionType} actionData={message.actionData} />
                      )}
                    </div>
                    <div
                      className={cn(
                        'mt-1 flex items-center gap-2 px-1',
                        message.sender === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <span className="text-[11px] text-muted-foreground/60">{formatTime(message.timestamp)}</span>
                      {message.sender === 'ai' && (
                        <button
                          onClick={() => copyToClipboard(message.id, message.text)}
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                          title="Copier"
                        >
                          {copiedId === message.id ? (
                            <Check className="h-3 w-3 text-success" />
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing Indicator */}
            <AnimatePresence>{isTyping && <TypingBubble />}</AnimatePresence>

            {/* ── Suggestion Cards (shown only at start) ── */}
            {!isLoadingConversation && showSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="pt-4"
              >
                <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Suggestions
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {suggestions.map(({ text, icon: Icon }) => (
                    <motion.button
                      key={text}
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSend(text)}
                      disabled={isTyping}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3.5 text-left text-sm transition-colors hover:border-secondary/30 hover:bg-secondary/5 disabled:opacity-50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-foreground">{text}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Escalade RH (après 2 réponses confuses) ── */}
            <AnimatePresence>
              {showEscalation && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  className="mx-4 mb-2 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3.5"
                >
                  <PhoneForwarded className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-foreground">Besoin d'aide humaine ?</p>
                    <p className="text-xs text-muted-foreground">
                      L'assistant n'a pas pu répondre à vos questions. Contactez directement votre responsable RH.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowEscalation(false)}
                    className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground"
                    aria-label="Fermer la suggestion"
                  >
                    ✕
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll-to-bottom FAB */}
          <AnimatePresence>
            {showScrollBtn && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={scrollToBottom}
                className="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card shadow-md transition-colors hover:bg-muted"
              >
                <ArrowDown className="h-4 w-4 text-muted-foreground" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* ────── INPUT ────── */}
        <div className="border-t border-border bg-card px-5 py-4">
          {attachedFile && (
            <div className="mx-auto mb-2 flex max-w-3xl items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-foreground">{attachedFile.name}</span>
              <button
                type="button"
                aria-label="Retirer le fichier"
                onClick={() => {
                  setAttachedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="mx-auto flex max-w-3xl items-end gap-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              aria-label="Joindre un fichier (PDF, TXT, MD)"
              onChange={(e) => setAttachedFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="ghost"
              disabled={isTyping}
              onClick={() => fileInputRef.current?.click()}
              className="h-[46px] w-[46px] shrink-0 rounded-xl p-0 text-muted-foreground hover:bg-muted/60"
              title="Joindre un fichier (PDF, TXT, MD) — fiche de poste, document RH…"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question sur les RH..."
                disabled={isTyping}
                rows={1}
                className="max-h-[120px] w-full resize-none rounded-xl border border-border bg-muted/50 px-4 py-3 pr-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/30 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={toggleVoiceInput}
              className={cn(
                'h-[46px] w-[46px] shrink-0 rounded-xl p-0 transition-colors',
                isListening
                  ? 'bg-red-100 text-red-500 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                  : 'text-muted-foreground hover:bg-muted/60'
              )}
              title={isListening ? 'Arrêter la dictée' : 'Dicter un message'}
            >
              {isListening ? (
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                  <MicOff className="h-4 w-4" />
                </motion.div>
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="submit"
              disabled={(!inputValue.trim() && !attachedFile) || isTyping}
              className="h-[46px] shrink-0 gap-2 rounded-xl px-5 bg-gradient-primary"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Envoyer</span>
            </Button>
          </form>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground/50">
            L'assistant IA peut commettre des erreurs. Vérifiez les informations importantes.
          </p>
        </div>
      </div>
    </div>
  );
}
