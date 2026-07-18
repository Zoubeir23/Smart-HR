import type { ApplicationStatus } from '@/components/recrutement/applicationTypes';

export const APPLICATION_STATUSES: { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'reviewing', label: 'En revue' },
  { value: 'interview', label: 'Entretien' },
  { value: 'accepted', label: 'Accepté' },
  { value: 'rejected', label: 'Rejeté' },
];

export const STATUS_TRANSITIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'reviewing', label: 'En revue' },
  { value: 'interview', label: 'Entretien' },
  { value: 'accepted', label: 'Accepté' },
  { value: 'rejected', label: 'Rejeté' },
];

export const INTERVIEW_DURATIONS = [
  { value: '15', label: '15 Min' },
  { value: '30', label: '30 Min' },
  { value: '45', label: '45 Min' },
  { value: '60', label: '60 Min' },
];

export const INTERVIEW_TYPES = [
  { value: 'Technique', label: 'Technique' },
  { value: 'Comportemental', label: 'Comportemental' },
  { value: 'Leadership', label: 'Leadership' },
  { value: 'Expérience', label: 'Expérience' },
];
