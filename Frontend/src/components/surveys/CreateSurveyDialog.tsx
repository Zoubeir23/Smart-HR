import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { surveyService, type QuestionType, type CreateSurveyPayload } from '@/services/surveyService';
import { useToast } from '@/hooks/use-toast';

interface QuestionDraft {
  text: string;
  question_type: QuestionType;
  optionsText: string;
}

const EMPTY_QUESTION: QuestionDraft = { text: '', question_type: 'text', optionsText: '' };

const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: 'text', label: 'Texte libre' },
  { value: 'rating', label: 'Note (1-5)' },
  { value: 'single_choice', label: 'Choix unique' },
  { value: 'multiple_choice', label: 'Choix multiple' },
];

export default function CreateSurveyDialog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([{ ...EMPTY_QUESTION }]);

  const createMutation = useMutation({
    mutationFn: surveyService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast({ title: 'Enquête créée en brouillon' });
      resetAndClose();
    },
    onError: () => {
      toast({ title: 'Erreur', description: "Impossible de créer l'enquête.", variant: 'destructive' });
    },
  });

  function resetAndClose() {
    setOpen(false);
    setTitle('');
    setDescription('');
    setIsAnonymous(false);
    setQuestions([{ ...EMPTY_QUESTION }]);
  }

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function handleSubmit() {
    const validQuestions = questions.filter((q) => q.text.trim());
    if (!title.trim() || validQuestions.length === 0) {
      toast({ title: 'Champs requis', description: 'Titre et au moins une question sont requis.', variant: 'destructive' });
      return;
    }

    const payload: CreateSurveyPayload = {
      title: title.trim(),
      description: description.trim(),
      is_anonymous: isAnonymous,
      questions: validQuestions.map((q) => ({
        text: q.text.trim(),
        question_type: q.question_type,
        options: q.optionsText.trim() ? q.optionsText.split(',').map((o) => o.trim()).filter(Boolean) : [],
      })),
    };
    createMutation.mutate(payload);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : resetAndClose())}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle enquête
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            Nouvelle enquête interne
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Enquête de satisfaction Q1 2026" />
          </div>
          <div className="space-y-1">
            <Label>Description (optionnel)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contexte de l'enquête..." />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} id="anonymous-switch" />
            <Label htmlFor="anonymous-switch">Enquête anonyme</Label>
          </div>

          <div className="space-y-3">
            <Label>Questions</Label>
            {questions.map((question, index) => (
              <div key={index} className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={question.text}
                    onChange={(e) => updateQuestion(index, { text: e.target.value })}
                    placeholder={`Question ${index + 1}`}
                    className="flex-1"
                  />
                  <Select value={question.question_type} onValueChange={(v) => updateQuestion(index, { question_type: v as QuestionType })}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {questions.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== index))}>
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
                {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
                  <Input
                    value={question.optionsText}
                    onChange={(e) => updateQuestion(index, { optionsText: e.target.value })}
                    placeholder="Options séparées par des virgules : Tech, RH, Commercial"
                  />
                )}
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setQuestions((prev) => [...prev, { ...EMPTY_QUESTION }])}>
              <Plus className="h-3 w-3" />
              Ajouter une question
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>Créer l'enquête</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
