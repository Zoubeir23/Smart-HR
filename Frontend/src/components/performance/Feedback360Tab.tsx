import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareHeart, Plus, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import SearchableSelect from '@/components/common/SearchableSelect';
import { useToast } from '@/hooks/use-toast';
import { performanceService, FEEDBACK_360_TAGS, type Feedback360 } from '@/services/performanceService';
import { employeeService } from '@/services/employeeService';

interface EmployeeOption {
  id: number;
  user_full_name: string;
}

export default function Feedback360Tab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [context, setContext] = useState('');
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: feedbackData, isLoading } = useQuery({
    queryKey: ['feedback360'],
    queryFn: () => performanceService.getAllFeedback360(),
  });
  const feedbackList: Feedback360[] = feedbackData?.results ?? feedbackData ?? [];

  const { data: employeesData } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: () => employeeService.getAll(),
  });
  const employees: EmployeeOption[] = employeesData?.results ?? employeesData ?? [];

  const createMutation = useMutation({
    mutationFn: performanceService.createFeedback360,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback360'] });
      toast({ title: 'Feedback envoyé' });
      resetForm();
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible d'envoyer ce feedback.", variant: 'destructive' });
    },
  });

  function resetForm() {
    setShowForm(false);
    setRecipient('');
    setContext('');
    setComment('');
    setSelectedTags([]);
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function handleSubmit() {
    if (!recipient || !comment.trim()) {
      toast({ title: 'Champs requis', description: 'Destinataire et commentaire sont requis.', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      recipient: Number(recipient),
      context: context.trim(),
      comment: comment.trim(),
      tags: selectedTags,
    });
  }

  const employeeOptions = employees.map((e) => ({ value: String(e.id), label: e.user_full_name }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Feedback qualitatif entre collègues (évaluation 360°)</p>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowForm((prev) => !prev)}>
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? 'Annuler' : 'Nouveau feedback'}
        </Button>
      </div>

      {showForm && (
        <Card className="border border-border">
          <CardContent className="space-y-3 p-4">
            <div className="space-y-1">
              <Label>Destinataire</Label>
              <SearchableSelect
                options={employeeOptions}
                value={recipient}
                onChange={setRecipient}
                placeholder="Choisir un collègue"
                searchPlaceholder="Rechercher un employé…"
              />
            </div>
            <div className="space-y-1">
              <Label>Contexte (optionnel)</Label>
              <Input value={context} onChange={(e) => setContext(e.target.value)} placeholder="Ex: mission d'audit à l'agence" />
            </div>
            <div className="space-y-1">
              <Label>Commentaire</Label>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Votre retour qualitatif…" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_360_TAGS.map((tag) => (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => toggleTag(tag.value)}
                    className={
                      selectedTags.includes(tag.value)
                        ? 'rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary'
                        : 'rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted'
                    }
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
            <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending}>
              Envoyer le feedback
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>}

      {!isLoading && feedbackList.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
          <MessageSquareHeart className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">Aucun feedback pour le moment.</p>
        </div>
      )}

      <div className="space-y-3">
        {feedbackList.map((feedback) => (
          <Card key={feedback.id} className="border border-border">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {feedback.author_name} → {feedback.recipient_name}
                </p>
                <span className="text-xs text-muted-foreground">{new Date(feedback.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
              {feedback.context && <p className="text-xs text-muted-foreground">{feedback.context}</p>}
              <p className="text-sm text-foreground">{feedback.comment}</p>
              {feedback.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {feedback.tags.map((tag) => {
                    const label = FEEDBACK_360_TAGS.find((t) => t.value === tag)?.label ?? tag;
                    return (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {label}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
