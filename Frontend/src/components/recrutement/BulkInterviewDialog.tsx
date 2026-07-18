import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { INTERVIEW_DURATIONS, INTERVIEW_TYPES } from '@/components/recrutement/applicationConstants';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BulkInterviewDialogProps {
  isOpen: boolean;
  candidateCount: number;
  onClose: () => void;
  onConfirm: (duration: string, interviewType: string) => void;
  isPending: boolean;
}

export function BulkInterviewDialog({ isOpen, candidateCount, onClose, onConfirm, isPending }: BulkInterviewDialogProps) {
  const [selectedDuration, setSelectedDuration] = useState('30');
  const [selectedInterviewType, setSelectedInterviewType] = useState('Technique');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Envoyer l'entretien IA à {candidateCount} candidat{candidateCount > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            Configurez les paramètres communs. Les questions seront générées individuellement à partir du CV de chaque candidat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="bulk-interview-duration">Durée de l'entretien</Label>
            <Select value={selectedDuration} onValueChange={setSelectedDuration}>
              <SelectTrigger id="bulk-interview-duration">
                <SelectValue placeholder="Sélectionner une durée" />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_DURATIONS.map((duration) => (
                  <SelectItem key={duration.value} value={duration.value}>
                    {duration.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-interview-type">Type d'entretien</Label>
            <Select value={selectedInterviewType} onValueChange={setSelectedInterviewType}>
              <SelectTrigger id="bulk-interview-type">
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_TYPES.map((interviewType) => (
                  <SelectItem key={interviewType.value} value={interviewType.value}>
                    {interviewType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-700 dark:text-amber-400">
            {candidateCount} invitation{candidateCount > 1 ? 's' : ''} seront envoyées par email simultanément.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button onClick={() => onConfirm(selectedDuration, selectedInterviewType)} disabled={isPending} className="gap-2">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Envoyer à {candidateCount} candidat{candidateCount > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
