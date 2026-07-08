import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { surveyService, type Survey, type SubmitAnswerPayload } from '@/services/surveyService';
import { useToast } from '@/hooks/use-toast';

interface RespondToSurveyDialogProps {
  survey: Survey | null;
  onClose: () => void;
}

export default function RespondToSurveyDialog({ survey, onClose }: RespondToSurveyDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<number, { text_answer?: string; selected_options?: string[] }>>({});

  const respondMutation = useMutation({
    mutationFn: (payload: SubmitAnswerPayload[]) => surveyService.respond(survey!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast({ title: 'Merci pour votre réponse !' });
      setAnswers({});
      onClose();
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible d'envoyer votre réponse.", variant: 'destructive' });
    },
  });

  if (!survey) return null;

  function setTextAnswer(questionId: number, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: { text_answer: value } }));
  }

  function toggleOption(questionId: number, option: string, multiple: boolean) {
    setAnswers((prev) => {
      const current = prev[questionId]?.selected_options ?? [];
      const next = multiple
        ? current.includes(option) ? current.filter((o) => o !== option) : [...current, option]
        : [option];
      return { ...prev, [questionId]: { selected_options: next } };
    });
  }

  function handleSubmit() {
    const payload: SubmitAnswerPayload[] = survey!.questions.map((q) => ({
      question: q.id,
      ...answers[q.id],
    }));
    respondMutation.mutate(payload);
  }

  return (
    <Dialog open={survey !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{survey.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {survey.description && <p className="text-sm text-muted-foreground">{survey.description}</p>}
          {survey.questions.map((question) => (
            <div key={question.id} className="space-y-2">
              <Label>{question.text}</Label>

              {question.question_type === 'text' && (
                <Textarea
                  value={answers[question.id]?.text_answer ?? ''}
                  onChange={(e) => setTextAnswer(question.id, e.target.value)}
                  placeholder="Votre réponse..."
                />
              )}

              {question.question_type === 'rating' && (
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const selected = Number(answers[question.id]?.text_answer) >= value;
                    return (
                      <button key={value} type="button" onClick={() => setTextAnswer(question.id, String(value))}>
                        <Star className={cn('h-6 w-6', selected ? 'fill-warning text-warning' : 'text-muted-foreground/40')} />
                      </button>
                    );
                  })}
                </div>
              )}

              {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
                <div className="space-y-1.5">
                  {question.options.map((option) => {
                    const multiple = question.question_type === 'multiple_choice';
                    const selected = (answers[question.id]?.selected_options ?? []).includes(option);
                    return (
                      <label key={option} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={selected} onCheckedChange={() => toggleOption(question.id, option, multiple)} />
                        {option}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={respondMutation.isPending} className="gap-2">
            <Send className="h-4 w-4" />
            Envoyer ma réponse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
