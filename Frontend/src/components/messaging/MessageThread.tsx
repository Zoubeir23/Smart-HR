import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/services/messagingService';

interface MessageThreadProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

function formatTimestamp(isoDate: string): string {
  return format(new Date(isoDate), 'dd/MM/yyyy HH:mm', { locale: fr });
}

export default function MessageThread({ messages, isLoading }: MessageThreadProps) {
  const bottomAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  if (isLoading) {
    return <p className="p-4 text-sm text-muted-foreground">Chargement des messages…</p>;
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
        <MessageSquare className="h-8 w-8 opacity-40" />
        <p>Aucun message. Écrivez le premier.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <ol className="flex flex-col gap-3 p-4">
        {messages.map((message) => (
          <li
            key={message.id}
            className={cn('flex flex-col gap-1', message.is_mine ? 'items-end' : 'items-start')}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-2 text-sm sm:max-w-[70%]',
                message.is_mine
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground',
              )}
            >
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
            </div>
            <span className="text-xs text-muted-foreground">
              {message.is_mine ? 'Vous' : message.sender_name} · {formatTimestamp(message.created_at)}
            </span>
          </li>
        ))}
      </ol>
      <div ref={bottomAnchorRef} />
    </ScrollArea>
  );
}
