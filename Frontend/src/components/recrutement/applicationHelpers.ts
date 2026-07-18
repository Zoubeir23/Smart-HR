import { STATUS_TRANSITIONS } from '@/components/recrutement/applicationConstants';
import type { Application, ApplicationStatus } from '@/components/recrutement/applicationTypes';

export function getStatusBadgeVariant(status: ApplicationStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'accepted':
      return 'default';
    case 'rejected':
      return 'destructive';
    case 'interview':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function getStatusLabel(status: ApplicationStatus): string {
  return STATUS_TRANSITIONS.find((s) => s.value === status)?.label ?? status;
}

export function getMatchingScoreColorClass(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-orange-400';
  return 'bg-red-500';
}

export function getMatchingScoreTextClass(score: number): string {
  if (score >= 70) return 'text-green-600 dark:text-green-400';
  if (score >= 40) return 'text-orange-500 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

export function getCandidateInitials(application: Application): string {
  if (application.candidate_first_name && application.candidate_last_name) {
    return `${application.candidate_first_name[0]}${application.candidate_last_name[0]}`.toUpperCase();
  }
  if (application.candidate_name) {
    const nameParts = application.candidate_name.trim().split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return application.candidate_name.slice(0, 2).toUpperCase();
  }
  return 'CA';
}

export function getCandidateFullName(application: Application): string {
  if (application.candidate_first_name && application.candidate_last_name) {
    return `${application.candidate_first_name} ${application.candidate_last_name}`;
  }
  return application.candidate_name || 'Candidat inconnu';
}

export function getJobTitle(application: Application): string {
  if (application.job_title) return application.job_title;
  if (typeof application.job_offer === 'object' && application.job_offer?.title) {
    return application.job_offer.title;
  }
  return 'Poste non spécifié';
}
