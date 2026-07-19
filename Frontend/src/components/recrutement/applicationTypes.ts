export type ApplicationStatus = 'pending' | 'reviewing' | 'interview' | 'accepted' | 'rejected';

export interface JobOffer {
  id: number;
  title: string;
}

export interface Application {
  id: number;
  candidate_name: string;
  candidate_first_name?: string;
  candidate_last_name?: string;
  email: string;
  job_offer: JobOffer | number;
  job_title?: string;
  status: ApplicationStatus;
  matching_score: number;
  skills_extracted?: string[];
  search_keywords?: string[];
  onboarded: boolean;
  created_at: string;
}
