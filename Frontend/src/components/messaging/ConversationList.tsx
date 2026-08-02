import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquare, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/services/messagingService';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: number | null;
  searchTerm: string;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onSelect: (conversationId: number) => void;
}

function formatRelativeDate(isoDate: string | null): string {
  if (!isoDate) return '';
  return formatDistanceToNow(new Date(isoDate), { addSuffix: true, locale: fr });
}

export default function ConversationList({
  conversations,
  selectedConversationId,
  searchTerm,
  isLoading,
  onSearchChange,
  onSelect,
}: ConversationListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="relative p-3">
        <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Rechercher une conversation"
          aria-label="Rechercher une conversation"
          className="pl-9"
        />
      </div>

      <ScrollArea className="flex-1">
        {isLoading && <p className="p-4 text-sm text-muted-foreground">Chargement des conversations…</p>}

        {!isLoading && conversations.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
            <MessageSquare className="h-8 w-8 opacity-40" />
            <p>Aucune conversation pour le moment.</p>
          </div>
        )}

        <ul className="space-y-1 px-2 pb-3">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <button
                type="button"
                onClick={() => onSelect(conversation.id)}
                aria-current={conversation.id === selectedConversationId}
                className={cn(
                  'w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted',
                  conversation.id === selectedConversationId && 'bg-muted',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{conversation.display_title}</span>
                  {conversation.unread_count > 0 && (
                    <Badge variant="destructive" className="shrink-0">
                      {conversation.unread_count}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{conversation.last_message?.body ?? 'Conversation ouverte'}</span>
                  <span className="shrink-0">{formatRelativeDate(conversation.last_message_at)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
