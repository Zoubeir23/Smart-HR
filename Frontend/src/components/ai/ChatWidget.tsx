import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Maximize2, Bot, User } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/context/AuthContext';
import { aiService } from '@/services/aiService';
import { cn } from '@/lib/utils';

interface WidgetMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
}

function buildWelcomeText(firstName?: string): string {
  const greeting = firstName ? `Bonjour ${firstName} !` : 'Bonjour !';
  return `${greeting} Posez-moi une question ou demandez-moi d'agir (ex: "Valide le congé de Awa Diallo").`;
}

/**
 * Widget IA flottant, présent sur toutes les pages authentifiées (monté une
 * seule fois par `DashboardLayout`) — permet de dialoguer avec l'assistant IA
 * (et de déclencher les agents actionnables congés/OKR/onboarding) sans
 * quitter la page en cours. Conserve son propre fil de conversation, distinct
 * de la page complète `/ai-chat`.
 */
export default function ChatWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<WidgetMessage[]>([
    { id: 'welcome', text: buildWelcomeText(user?.first_name), sender: 'ai' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const chatMutation = useMutation({
    mutationFn: ({ question }: { question: string }) => aiService.chat(question, conversationId ?? undefined),
    onSuccess: (data) => {
      const responseText = data?.response || data?.answer || data?.message || 'Désolé, je n\'ai pas de réponse.';
      if (conversationId === null && data?.conversation) setConversationId(data.conversation);
      setMessages((prev) => [...prev, { id: `${Date.now()}-ai`, text: responseText, sender: 'ai' }]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-err`,
          text: 'Désolé, une erreur est survenue. Veuillez réessayer.',
          sender: 'ai',
        },
      ]);
    },
  });

  const handleSend = () => {
    const question = inputValue.trim();
    if (!question || chatMutation.isPending) return;
    setMessages((prev) => [...prev, { id: `${Date.now()}-user`, text: question, sender: 'user' }]);
    setInputValue('');
    chatMutation.mutate({ question });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openFullPage = () => {
    setIsOpen(false);
    navigate('/ai-chat');
  };

  if (!user || location.pathname === '/ai-chat') return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 flex h-[32rem] max-h-[70vh] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold">Assistant IA</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={openFullPage}
                  title="Ouvrir en plein écran"
                  aria-label="Ouvrir en plein écran"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Fermer"
                  aria-label="Fermer l'assistant IA"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn('flex items-start gap-2', message.sender === 'user' && 'flex-row-reverse')}
                >
                  <div
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                      message.sender === 'user' ? 'bg-primary' : 'bg-secondary/10'
                    )}
                  >
                    {message.sender === 'user' ? (
                      <User className="h-3 w-3 text-primary-foreground" />
                    ) : (
                      <Bot className="h-3 w-3 text-primary" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                      message.sender === 'user'
                        ? 'rounded-tr-sm bg-primary text-primary-foreground'
                        : 'rounded-tl-sm border border-border bg-muted/40 text-foreground'
                    )}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-1.5 whitespace-pre-wrap last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                        ul: ({ children }) => <ul className="mb-1.5 ml-4 list-outside list-disc space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-1.5 ml-4 list-outside list-decimal space-y-0.5">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="flex items-center gap-1.5 pl-8 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/50" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:0.4s]" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-end gap-2 border-t border-border p-3"
            >
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question..."
                disabled={chatMutation.isPending}
                rows={1}
                className="max-h-20 flex-1 resize-none rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-secondary/30 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || chatMutation.isPending}
                aria-label="Envoyer"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-white disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen((prev) => !prev)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isOpen ? "Fermer l'assistant IA" : "Ouvrir l'assistant IA"}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-white shadow-lg"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isOpen ? 'close' : 'open'}
            initial={{ opacity: 0, rotate: -45 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 45 }}
            transition={{ duration: 0.15 }}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </>
  );
}
