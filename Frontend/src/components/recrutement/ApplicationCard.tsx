import { Bot, CheckCircle2, ChevronDown, Loader2, SlidersHorizontal, Trash2, UserCheck } from 'lucide-react';
import { STATUS_TRANSITIONS } from '@/components/recrutement/applicationConstants';
import {
  getCandidateFullName,
  getCandidateInitials,
  getJobTitle,
  getStatusBadgeVariant,
  getStatusLabel,
} from '@/components/recrutement/applicationHelpers';
import { MatchingScoreGauge } from '@/components/recrutement/MatchingScoreGauge';
import { SkillTagList } from '@/components/recrutement/SkillTagList';
import type { Application, ApplicationStatus } from '@/components/recrutement/applicationTypes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ApplicationCardProps {
  application: Application;
  interviewAlreadySent: boolean;
  onStatusChange: (applicationId: number, newStatus: ApplicationStatus) => void;
  onSendInterview: (application: Application) => void;
  onOnboard: (application: Application) => void;
  onDelete: (application: Application) => void;
  isStatusChangePending: boolean;
  isOnboardPending: boolean;
  isSelected: boolean;
  onToggleSelect: (applicationId: number) => void;
}

export function ApplicationCard({
  application,
  interviewAlreadySent,
  onStatusChange,
  onSendInterview,
  onOnboard,
  onDelete,
  isStatusChangePending,
  isOnboardPending,
  isSelected,
  onToggleSelect,
}: ApplicationCardProps) {
  const initials = getCandidateInitials(application);
  const fullName = getCandidateFullName(application);
  const jobTitle = getJobTitle(application);
  const skills = application.skills_extracted ?? [];
  const score = application.matching_score ?? 0;

  return (
    <Card className={cn('overflow-hidden transition-shadow hover:shadow-md', isSelected && 'ring-2 ring-primary/50 border-primary/40')}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          {/* Checkbox + Avatar */}
          <div className="flex shrink-0 items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(application.id)}
              aria-label={`Sélectionner ${getCandidateFullName(application)}`}
            />
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-primary-foreground shadow-sm">
              {initials}
            </div>
          </div>

          {/* Main info */}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {/* Name, email, job */}
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{fullName}</p>
                <p className="truncate text-sm text-muted-foreground">{application.email}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-primary/80">{jobTitle}</p>
              </div>
              <div className="mt-1 shrink-0 sm:mt-0 sm:ml-4">
                <Badge variant={getStatusBadgeVariant(application.status)}>
                  {getStatusLabel(application.status)}
                </Badge>
              </div>
            </div>

            {/* Matching score */}
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Score de matching</p>
              <MatchingScoreGauge score={score} />
            </div>

            {/* Skills */}
            {skills.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Compétences extraites</p>
                <SkillTagList skills={skills} maxVisible={3} />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Status change dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={isStatusChangePending}
                  >
                    {isStatusChangePending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    )}
                    Changer statut
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  {STATUS_TRANSITIONS.map((statusOption) => (
                    <DropdownMenuItem
                      key={statusOption.value}
                      onClick={() => onStatusChange(application.id, statusOption.value)}
                      className={cn(
                        application.status === statusOption.value && 'font-semibold text-primary'
                      )}
                    >
                      {statusOption.label}
                      {application.status === statusOption.value && (
                        <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Send interview button — only shown when status is 'interview' */}
              {application.status === 'interview' && (
                interviewAlreadySent ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="gap-1.5 border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400 cursor-not-allowed"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Entretien envoyé
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => onSendInterview(application)}
                  >
                    <Bot className="h-3.5 w-3.5" />
                    Envoyer entretien IA
                  </Button>
                )
              )}

              {/* Onboard button — only for accepted, not yet onboarded candidates */}
              {application.status === 'accepted' && (
                application.onboarded ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-not-allowed"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Employé actif
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-emerald-500/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                    onClick={() => onOnboard(application)}
                    disabled={isOnboardPending}
                  >
                    {isOnboardPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserCheck className="h-3.5 w-3.5" />
                    )}
                    Intégrer comme employé
                  </Button>
                )
              )}

              {/* Delete button */}
              <Button
                size="sm"
                variant="outline"
                aria-label="Supprimer la candidature"
                title="Supprimer la candidature"
                className="ml-auto gap-1.5 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(application)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
