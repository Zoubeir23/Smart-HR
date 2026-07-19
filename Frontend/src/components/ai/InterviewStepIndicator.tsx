import { CheckCircle2 } from 'lucide-react';
import { INTERVIEW_STEPS, INTERVIEW_STEP_LABELS } from '@/components/ai/recruteurIaConstants';
import type { InterviewPageStep } from '@/components/ai/recruteurIaTypes';
import { cn } from '@/lib/utils';

interface InterviewStepIndicatorProps {
  current: InterviewPageStep;
}

export function InterviewStepIndicator({ current }: InterviewStepIndicatorProps) {
  const currentIndex = INTERVIEW_STEPS.indexOf(current);
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {INTERVIEW_STEPS.map((step, index) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
              index < currentIndex
                ? 'bg-success text-white'
                : index === currentIndex
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {index < currentIndex ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
          </div>
          <span
            className={cn(
              'text-xs font-medium',
              index === currentIndex ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {INTERVIEW_STEP_LABELS[step]}
          </span>
          {index < INTERVIEW_STEPS.length - 1 && (
            <div className={cn('h-px w-8 bg-border', index < currentIndex && 'bg-success')} />
          )}
        </div>
      ))}
    </div>
  );
}
