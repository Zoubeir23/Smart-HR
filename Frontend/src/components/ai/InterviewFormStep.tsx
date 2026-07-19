import { useState } from 'react';
import { ChevronRight, Clock, Loader2 } from 'lucide-react';
import { DURATIONS, INTERVIEW_TYPES } from '@/components/ai/recruteurIaConstants';
import type { InterviewFormData } from '@/components/ai/recruteurIaTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface InterviewFormStepProps {
  onSubmit: (data: InterviewFormData) => void;
  isLoading: boolean;
}

export function InterviewFormStep({ onSubmit, isLoading }: InterviewFormStepProps) {
  const [formData, setFormData] = useState<InterviewFormData>({
    job_position: '',
    job_description: '',
    duration: '30 Min',
    interview_type: 'Technique',
  });

  const handleChange = (field: keyof InterviewFormData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const canSubmit = formData.job_position.trim() && formData.job_description.trim();

  return (
    <div className="mx-auto max-w-2xl space-y-5 rounded-xl border border-border bg-card p-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Intitulé du poste</label>
        <Input
          placeholder="ex : Développeur Full Stack Django / React"
          value={formData.job_position}
          onChange={(e) => handleChange('job_position', e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Description du poste</label>
        <Textarea
          placeholder="Décrivez les responsabilités, compétences requises et profil recherché..."
          className="h-[160px] resize-none"
          value={formData.job_description}
          onChange={(e) => handleChange('job_description', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Durée de l'entretien</label>
          <Select value={formData.duration} onValueChange={(v) => handleChange('duration', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  <Clock className="mr-2 inline h-3.5 w-3.5" />
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Type d'entretien</label>
          <Select value={formData.interview_type} onValueChange={(v) => handleChange('interview_type', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVIEW_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={() => onSubmit(formData)}
          disabled={!canSubmit || isLoading}
          className="gap-2 bg-gradient-primary"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              Générer les questions
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
