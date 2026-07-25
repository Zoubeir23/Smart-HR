export interface ApiMeeting {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  meeting_link: string | null;
  status: string;
  formation: number;
}

export interface ApiFormation {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  instructor: string;
  cost: number;
  meetings: ApiMeeting[];
  created_at: string;
}

export interface FormationFormValues {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  instructor: string;
  cost: string;
}

export interface MeetingFormValues {
  title: string;
  formation: string;
  start_time: string;
  end_time: string;
  meeting_link: string;
}

export const EMPTY_FORMATION_FORM: FormationFormValues = {
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  instructor: '',
  cost: '',
};

export const EMPTY_MEETING_FORM: MeetingFormValues = {
  title: '',
  formation: '',
  start_time: '',
  end_time: '',
  meeting_link: '',
};

export type FormationStatus = 'en_cours' | 'planifie' | 'termine';

export function getFormationStatus(formation: ApiFormation): FormationStatus {
  const now = new Date();
  const start = new Date(formation.start_date);
  const end = new Date(formation.end_date);
  if (now < start) return 'planifie';
  if (now > end) return 'termine';
  return 'en_cours';
}

export const FORMATION_STATUS_CONFIG: Record<FormationStatus, { label: string; className: string }> = {
  en_cours: { label: 'En cours', className: 'bg-primary text-primary-foreground' },
  planifie: { label: 'Planifié', className: 'bg-warning text-warning-foreground' },
  termine: { label: 'Terminé', className: 'bg-success text-success-foreground' },
};
