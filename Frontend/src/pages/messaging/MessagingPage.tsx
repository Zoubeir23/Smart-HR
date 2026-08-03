import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import {
  messagingService,
  DEFAULT_THREAD_WINDOW,
  MAX_THREAD_WINDOW,
  DEFAULT_CONVERSATIONS_WINDOW,
  MAX_CONVERSATIONS_WINDOW,
} from '@/services/messagingService';
import ConversationList from '@/components/messaging/ConversationList';
import MessageThread from '@/components/messaging/MessageThread';
import NewConversationDialog from '@/components/messaging/NewConversationDialog';

const CONVERSATIONS_REFRESH_MS = 20_000;
const THREAD_REFRESH_MS = 5_000;

export default function MessagingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [threadWindow, setThreadWindow] = useState(DEFAULT_THREAD_WINDOW);
  const [conversationsWindow, setConversationsWindow] = useState(DEFAULT_CONVERSATIONS_WINDOW);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const conversationIdParam = searchParams.get('conversation');
  const selectedConversationId = conversationIdParam ? Number(conversationIdParam) : null;

  const { data: conversationData, isLoading: isLoadingConversations } = useQuery({
    queryKey: ['messaging-conversations', debouncedSearchTerm, conversationsWindow],
    queryFn: () =>
      messagingService.listConversations({
        search: debouncedSearchTerm || undefined,
        pageSize: conversationsWindow,
      }),
    refetchInterval: CONVERSATIONS_REFRESH_MS,
  });

  const conversations = useMemo(() => conversationData?.results ?? [], [conversationData]);

  const conversationFromList = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  // Une conversation ouverte par lien direct (notification) peut être absente de
  // la fenêtre chargée ou masquée par une recherche active : on la récupère à
  // l'unité plutôt que d'afficher un panneau vide.
  const { data: fetchedConversation = null } = useQuery({
    queryKey: ['messaging-conversation', selectedConversationId],
    queryFn: () => messagingService.getConversation(selectedConversationId as number),
    enabled: selectedConversationId !== null && conversationFromList === null && !isLoadingConversations,
  });

  const selectedConversation = conversationFromList ?? fetchedConversation;

  const { data: threadData, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messaging-thread', selectedConversationId, threadWindow],
    queryFn: () => messagingService.listMessages(selectedConversationId as number, threadWindow),
    enabled: selectedConversationId !== null,
    refetchInterval: THREAD_REFRESH_MS,
  });

  const messages = useMemo(() => threadData?.results ?? [], [threadData]);
  const hasOlderMessages = threadData?.has_more ?? false;
  const hasMoreConversations = Boolean(conversationData?.next);

  // La lecture du fil marque les messages comme lus côté serveur : on rafraîchit
  // la liste (badges) dès que le contenu du fil change.
  useEffect(() => {
    if (selectedConversationId === null) return;
    queryClient.invalidateQueries({ queryKey: ['messaging-conversations'] });
    queryClient.invalidateQueries({ queryKey: ['messaging-unread-total'] });
  }, [messages.length, selectedConversationId, queryClient]);

  const selectConversation = (conversationId: number) => {
    setSearchParams({ conversation: String(conversationId) });
    setDraftBody('');
    setThreadWindow(DEFAULT_THREAD_WINDOW);
  };

  const loadOlderMessages = () => {
    setThreadWindow((current) => Math.min(current * 2, MAX_THREAD_WINDOW));
  };

  const loadMoreConversations = () => {
    setConversationsWindow((current) => Math.min(current * 2, MAX_CONVERSATIONS_WINDOW));
  };

  const invalidateMessaging = () => {
    queryClient.invalidateQueries({ queryKey: ['messaging-conversations'] });
    queryClient.invalidateQueries({ queryKey: ['messaging-thread'] });
    queryClient.invalidateQueries({ queryKey: ['messaging-unread-total'] });
  };

  const sendMessageMutation = useMutation({
    mutationFn: (body: string) => messagingService.sendMessage(selectedConversationId as number, body),
    onSuccess: () => {
      setDraftBody('');
      invalidateMessaging();
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Envoi impossible',
        description: "Le message n'a pas pu être envoyé. Réessayez.",
      });
    },
  });

  const startConversationMutation = useMutation({
    mutationFn: ({ participantId, body }: { participantId: number; body: string }) =>
      messagingService.startConversation({ participant_id: participantId, body }),
    onSuccess: (conversation) => {
      setIsDialogOpen(false);
      invalidateMessaging();
      selectConversation(conversation.id);
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Conversation impossible',
        description: "Votre rôle ne vous autorise pas à contacter cet utilisateur.",
      });
    },
  });

  const handleSendMessage = () => {
    const body = draftBody.trim();
    if (!body || selectedConversationId === null) return;
    sendMessageMutation.mutate(body);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MessageSquare className="h-6 w-6" />
            Messagerie
          </h1>
          <p className="text-sm text-muted-foreground">
            Échangez directement avec l&apos;administration, les RH, les employés et les candidats.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(conversationData?.unread_total ?? 0) > 0 && (
            <Badge variant="destructive">{conversationData?.unread_total} non lus</Badge>
          )}
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau message
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <section className="h-[32rem] rounded-lg border bg-card" aria-label="Conversations">
          <ConversationList
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            searchTerm={searchTerm}
            isLoading={isLoadingConversations}
            onSearchChange={setSearchTerm}
            onSelect={selectConversation}
            hasMore={hasMoreConversations}
            onLoadMore={loadMoreConversations}
          />
        </section>

        <section className="flex h-[32rem] flex-col rounded-lg border bg-card" aria-label="Fil de discussion">
          {selectedConversation === null ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <MessageSquare className="h-8 w-8 opacity-40" />
              <p>Sélectionnez une conversation ou démarrez-en une nouvelle.</p>
            </div>
          ) : (
            <>
              <div className="border-b px-4 py-3">
                <h2 className="font-semibold">{selectedConversation.display_title}</h2>
                <p className="text-xs text-muted-foreground">
                  {selectedConversation.participants_detail
                    .map((participant) => participant.role_display)
                    .join(', ')}
                </p>
              </div>

              <MessageThread
                messages={messages}
                isLoading={isLoadingMessages}
                hasOlderMessages={hasOlderMessages}
                canLoadOlderMessages={threadWindow < MAX_THREAD_WINDOW}
                onLoadOlderMessages={loadOlderMessages}
              />

              <div className="flex items-end gap-2 border-t p-3">
                <Textarea
                  value={draftBody}
                  onChange={(event) => setDraftBody(event.target.value)}
                  placeholder="Écrivez votre message…"
                  aria-label="Écrivez votre message"
                  rows={2}
                  className="resize-none"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!draftBody.trim() || sendMessageMutation.isPending}
                  aria-label="Envoyer le message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </section>
      </div>

      <NewConversationDialog
        open={isDialogOpen}
        isSubmitting={startConversationMutation.isPending}
        onOpenChange={setIsDialogOpen}
        onSubmit={(payload) => startConversationMutation.mutate(payload)}
      />
    </div>
  );
}
