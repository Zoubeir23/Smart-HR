import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { messagingService, type Contact } from '@/services/messagingService';
import { useDebounce } from '@/hooks/useDebounce';

interface NewConversationDialogProps {
  open: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { participantId: number; body: string }) => void;
}

export default function NewConversationDialog({
  open,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: NewConversationDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [body, setBody] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['messaging-contacts', debouncedSearchTerm],
    queryFn: () => messagingService.listContacts({ search: debouncedSearchTerm || undefined }),
    enabled: open,
  });

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearchTerm('');
      setSelectedContact(null);
      setBody('');
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = () => {
    if (!selectedContact || !body.trim()) return;
    onSubmit({ participantId: selectedContact.id, body: body.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau message</DialogTitle>
          <DialogDescription>
            Seuls les interlocuteurs autorisés par votre rôle apparaissent dans cette liste.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-search">Destinataire</Label>
            <Input
              id="contact-search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Rechercher un nom ou un email"
            />
            <ScrollArea className="h-48 rounded-md border">
              {isLoading && <p className="p-3 text-sm text-muted-foreground">Chargement…</p>}
              {!isLoading && contacts.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">Aucun interlocuteur trouvé.</p>
              )}
              <ul className="p-1">
                {contacts.map((contact) => (
                  <li key={contact.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedContact(contact)}
                      aria-pressed={selectedContact?.id === contact.id}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                        selectedContact?.id === contact.id && 'bg-muted',
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{contact.full_name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{contact.email}</span>
                      </span>
                      <Badge variant="secondary" className="shrink-0">{contact.role_display}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <Label htmlFor="first-message">Message</Label>
            <Textarea
              id="first-message"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Votre message…"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!selectedContact || !body.trim() || isSubmitting}>
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
