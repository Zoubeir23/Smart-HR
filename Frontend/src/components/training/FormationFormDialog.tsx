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
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import type { FormationFormValues } from '@/components/training/trainingTypes';

interface FormationFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  values: FormationFormValues;
  onValuesChange: (updater: (previous: FormationFormValues) => FormationFormValues) => void;
  onSubmit: () => void;
  isPending: boolean;
}

/** Formulaire de formation partagé par la création et la modification —
 * les deux dialogues ont exactement les mêmes champs et les mêmes règles. */
export default function FormationFormDialog({
  isOpen,
  onOpenChange,
  title,
  submitLabel,
  values,
  onValuesChange,
  onSubmit,
  isPending,
}: FormationFormDialogProps) {
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
              placeholder="Ex: Formation Django REST Framework"
            />
          </div>
          <div className="grid gap-2">
            <Label>Formateur *</Label>
            <Input
              value={values.instructor}
              onChange={(e) => onValuesChange((previous) => ({ ...previous, instructor: e.target.value }))}
              placeholder="Ex: Marie Dupont"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Date de début *</Label>
              <Input
                type="datetime-local"
                value={values.start_date}
                onChange={(e) => onValuesChange((previous) => ({ ...previous, start_date: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Date de fin *</Label>
              <Input
                type="datetime-local"
                value={values.end_date}
                onChange={(e) => onValuesChange((previous) => ({ ...previous, end_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Coût (FCFA)</Label>
            <Input
              type="number"
              min="0"
              value={values.cost}
              onChange={(e) => onValuesChange((previous) => ({ ...previous, cost: e.target.value }))}
              placeholder="Ex: 500000"
            />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea
              value={values.description}
              onChange={(e) => onValuesChange((previous) => ({ ...previous, description: e.target.value }))}
              placeholder="Objectifs et contenu de la formation..."
              rows={3}
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
