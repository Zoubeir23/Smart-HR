import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Bot,
  User,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  Lightbulb,
  BarChart3,
  Users,
  Calendar,
  ArrowDown,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { aiService } from '@/services/aiService';
import { cn } from '@/lib/utils';

/* ─────────── Types ─────────── */

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
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

export default function AIChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const userRole = (user?.role ?? '').toUpperCase();
  const suggestions = SUGGESTIONS_BY_ROLE[userRole] ?? SUGGESTIONS_BY_ROLE['RH'];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: buildWelcomeMessage(user),
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
  const chatMutation = useMutation({
    mutationFn: (question: string) => aiService.chat(question),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: data?.response || data?.answer || data?.message || JSON.stringify(data),
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "Désolé, une erreur est survenue. Le service est peut-être temporairement indisponible. Veuillez réessayer.",
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    },
  });

  // ─── Send Message ─────────────────────
  const handleSend = (text?: string) => {
    const msg = (text ?? inputValue).trim();
    if (!msg || isTyping) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text: msg, sender: 'user', timestamp: new Date() },
    ]);
    setInputValue('');
    setIsTyping(true);
    chatMutation.mutate(msg);

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
  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: 'Copié', description: 'Message copié dans le presse-papier.' });
  };

  // ─── Clear Chat ───────────────────────
  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        text: 'Conversation réinitialisée. Comment puis-je vous aider ?',
        sender: 'ai',
        timestamp: new Date(),
      },
    ]);
  };

  // ─── Auto-resize textarea ─────────────
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const showSuggestions = messages.length <= 1 && !isTyping;

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden rounded-lg border border-border bg-card">
        {/* ────── HEADER ────── */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: 'var(--gradient-primary)' }}
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
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground"
              onClick={clearChat}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Effacer
            </Button>
          </div>
        </div>

        {/* ────── MESSAGES ────── */}
        <div ref={scrollContainerRef} className="relative flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-5 px-5 py-6">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
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
            {showSuggestions && (
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="mx-auto flex max-w-3xl items-end gap-3"
          >
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question sur les RH..."
                disabled={isTyping}
                rows={1}
                className="w-full resize-none rounded-xl border border-border bg-muted/50 px-4 py-3 pr-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/30 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ maxHeight: 120 }}
              />
            </div>
            <Button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="h-[46px] shrink-0 gap-2 rounded-xl px-5"
              style={{ background: 'var(--gradient-primary)' }}
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
    </DashboardLayout>
  );
}
