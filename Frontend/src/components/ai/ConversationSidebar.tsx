import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquarePlus, Trash2, MessagesSquare } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ConversationSidebarItem {
  id: number;
  title: string;
  updated_at: string;
}

interface ConversationSidebarProps {
  items: ConversationSidebarItem[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
  newLabel: string;
  emptyLabel: string;
  deleteTitle: string;
  deleteDescription: string;
}

/**
 * Sidebar d'historique de conversations, façon ChatGPT — réutilisée par le
 * chat texte et l'assistant vocal (mêmes props, backends différents).
 */
export default function ConversationSidebar({
  items,
  activeId,
  onSelect,
  onNew,
  onDelete,
  newLabel,
  emptyLabel,
  deleteTitle,
  deleteDescription,
}: ConversationSidebarProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  return (
    <div className="flex w-64 shrink-0 flex-col gap-2 border-r border-border bg-muted/20 p-3">
      <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={onNew}>
        <MessageSquarePlus className="h-4 w-4" />
        {newLabel}
      </Button>

      <div className="flex-1 space-y-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
            <MessagesSquare className="h-6 w-6 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">{emptyLabel}</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'group flex items-center gap-1 rounded-lg px-2 py-2 text-sm transition-colors cursor-pointer',
                item.id === activeId ? 'bg-secondary/15 text-foreground' : 'hover:bg-muted/60 text-muted-foreground'
              )}
              onClick={() => onSelect(item.id)}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.title || 'Nouvelle conversation'}</p>
                <p className="truncate text-[11px] text-muted-foreground/70">
                  {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true, locale: fr })}
                </p>
              </div>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setPendingDeleteId(item.id);
                }}
                className="shrink-0 rounded p-1 text-muted-foreground/50 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                title="Supprimer"
                aria-label="Supprimer la conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDeleteId !== null) onDelete(pendingDeleteId);
                setPendingDeleteId(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
