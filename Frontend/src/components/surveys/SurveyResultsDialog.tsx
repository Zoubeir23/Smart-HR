import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { surveyService, type Survey } from '@/services/surveyService';

interface SurveyResultsDialogProps {
  survey: Survey | null;
  onClose: () => void;
}

export default function SurveyResultsDialog({ survey, onClose }: SurveyResultsDialogProps) {
  const { data: results, isLoading } = useQuery({
    queryKey: ['survey-results', survey?.id],
    queryFn: () => surveyService.getResults(survey!.id),
    enabled: survey !== null,
  });

  if (!survey) return null;

  return (
    <Dialog open={survey !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Résultats — {survey.title}
          </DialogTitle>
        </DialogHeader>

        {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>}

        {results && (
          <div className="space-y-5">
            <Badge variant="outline">{results.total_responses} réponse{results.total_responses > 1 ? 's' : ''}</Badge>

            {results.questions.map((question) => (
              <div key={question.question_id} className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-foreground">{question.text}</p>

                {question.question_type === 'rating' && (
                  <p className="text-sm text-muted-foreground">
                    {question.average !== null && question.average !== undefined
                      ? `Moyenne : ${question.average}/5 (${question.response_count} réponse${(question.response_count ?? 0) > 1 ? 's' : ''})`
                      : 'Aucune réponse'}
                  </p>
                )}

                {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
                  <div className="space-y-1">
                    {Object.entries(question.option_counts ?? {}).map(([option, count]) => (
                      <div key={option} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{option}</span>
                        <span className="font-medium text-foreground">{count}</span>
                      </div>
                    ))}
                    {Object.keys(question.option_counts ?? {}).length === 0 && (
                      <p className="text-sm text-muted-foreground">Aucune réponse</p>
                    )}
                  </div>
                )}

                {question.question_type === 'text' && (
                  <ul className="space-y-1">
                    {(question.text_answers ?? []).map((answer, index) => (
                      <li key={index} className="rounded bg-muted/40 px-2 py-1 text-sm text-muted-foreground">{answer}</li>
                    ))}
                    {(question.text_answers ?? []).length === 0 && (
                      <p className="text-sm text-muted-foreground">Aucune réponse</p>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
