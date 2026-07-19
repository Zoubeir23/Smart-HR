import type { InterviewPageStep } from '@/components/ai/recruteurIaTypes';

export const INTERVIEW_TYPES = ['Technique', 'Comportemental', 'Expérience', 'Résolution de problèmes', 'Leadership'];
export const DURATIONS = ['5 Min', '15 Min', '30 Min', '45 Min', '60 Min'];

export const INTERVIEW_STEP_LABELS: Record<InterviewPageStep, string> = {
  form: 'Configurer',
  questions: 'Questions',
  interview: 'Entretien',
  feedback: 'Feedback',
};

export const INTERVIEW_STEPS: InterviewPageStep[] = ['form', 'questions', 'interview', 'feedback'];
