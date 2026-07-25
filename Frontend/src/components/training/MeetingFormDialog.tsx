import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { ApiFormation, MeetingFormValues } from '@/components/training/trainingTypes';

interface MeetingFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  values: MeetingFormValues;
  onValuesChange: (updater: (previous: MeetingFormValues) => MeetingFormValues) => void;
  formations: ApiFormation[];
  onSubmit: () => void;
  isPending: boolean;
}

/** Formulaire de réunion partagé par la création et la modification —
 * une réunion est toujours rattachée à une formation existante. */
export default function MeetingFormDialog({
  isOpen,
  onOpenChange,
  title,
  submitLabel,
  values,
  onValuesChange,
  formations,
  onSubmit,
  isPending,
}: MeetingFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label>Titre *</Label>
            <Input
              value={values.title}
              onChange={(e) => onValuesChange((previous) => ({ ...previous, title: e.target.value }))}
              placeholder="Ex: Point d'avancement semaine 1"
            />
          </div>
          <div className="grid gap-2">
            <Label>Formation *</Label>
            <Select
              value={values.formation}
              onValueChange={(value) => onValuesChange((previous) => ({ ...previous, formation: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une formation" />
              </SelectTrigger>
              <SelectContent>
                {formations.map((formation) => (
                  <SelectItem key={formation.id} value={String(formation.id)}>
                    {formation.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Date de début *</Label>
              <Input
                type="datetime-local"
                value={values.start_time}
                onChange={(e) => onValuesChange((previous) => ({ ...previous, start_time: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Date de fin *</Label>
              <Input
                type="datetime-local"
                value={values.end_time}
                onChange={(e) => onValuesChange((previous) => ({ ...previous, end_time: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Lien de la réunion</Label>
            <Input
              value={values.meeting_link}
              onChange={(e) => onValuesChange((previous) => ({ ...previous, meeting_link: e.target.value }))}
              placeholder="Ex: https://meet.google.com/xxx-xxxx-xxx"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
