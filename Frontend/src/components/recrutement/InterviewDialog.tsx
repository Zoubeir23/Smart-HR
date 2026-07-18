import { useState } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { INTERVIEW_DURATIONS, INTERVIEW_TYPES } from '@/components/recrutement/applicationConstants';
import { getCandidateFullName } from '@/components/recrutement/applicationHelpers';
import type { Application } from '@/components/recrutement/applicationTypes';
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

interface InterviewDialogProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (applicationId: number, duration: string, interviewType: string) => void;
  isPending: boolean;
}

export function InterviewDialog({ application, isOpen, onClose, onConfirm, isPending }: InterviewDialogProps) {
  const [selectedDuration, setSelectedDuration] = useState('30');
  const [selectedInterviewType, setSelectedInterviewType] = useState('Technique');

  if (!application) return null;

  const handleConfirm = () => {
    onConfirm(application.id, selectedDuration, selectedInterviewType);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Envoyer l'invitation d'entretien IA
          </DialogTitle>
          <DialogDescription>
            Configurez les paramètres de l'entretien pour{' '}
            <span className="font-medium text-foreground">{getCandidateFullName(application)}</span>.
            Les questions seront générées personnellement à partir du CV du candidat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="interview-duration">Durée de l'entretien</Label>
            <Select value={selectedDuration} onValueChange={setSelectedDuration}>
              <SelectTrigger id="interview-duration">
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
            <Label htmlFor="interview-type">Type d'entretien</Label>
            <Select value={selectedInterviewType} onValueChange={setSelectedInterviewType}>
              <SelectTrigger id="interview-type">
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

          <div className="rounded-lg bg-muted/50 border border-border p-3 text-sm text-muted-foreground">
            Les questions seront générées personnellement à partir du CV du candidat et envoyées
            automatiquement à <span className="font-medium text-foreground">{application.email}</span>.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={isPending} className="gap-2">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Bot className="h-4 w-4" />
                Envoyer l'invitation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
