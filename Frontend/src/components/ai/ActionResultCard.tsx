import { Briefcase, CalendarCheck, CheckCircle2, Target, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export interface ActionResultCardProps {
  actionType: string;
  actionData: Record<string, unknown>;
}

interface ActionCardContent {
  icon: LucideIcon;
  title: string;
  details: string[];
  link?: { to: string; label: string };
}

function asString(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function buildLeaveCreatedContent(data: Record<string, unknown>): ActionCardContent {
  return {
    icon: CalendarCheck,
    title: 'Demande de congé créée',
    details: [
      `${asString(data.leave_type)} du ${asString(data.start_date)} au ${asString(data.end_date)}`,
      `${asString(data.duration_days)} jour(s) — ${asString(data.status)}`,
    ],
  };
}

function buildLeaveDecisionAppliedContent(data: Record<string, unknown>): ActionCardContent {
  const isApproved = data.decision === 'approve';
  return {
    icon: CheckCircle2,
    title: `Demande de congé ${isApproved ? 'validée' : 'refusée'}`,
    details: [
      asString(data.employee_name),
      `${asString(data.leave_type)} du ${asString(data.start_date)} au ${asString(data.end_date)}`,
    ],
  };
}

function buildObjectiveCreatedContent(data: Record<string, unknown>): ActionCardContent {
  return {
    icon: Target,
    title: 'Objectif OKR créé',
    details: [
      asString(data.title),
      `${asString(data.level_display)} · ${asString(data.period)}`,
      `${asString(data.key_results_count)} résultat(s) clé(s)`,
    ],
  };
}

function buildOnboardingCreatedContent(data: Record<string, unknown>): ActionCardContent {
  return {
    icon: UserPlus,
    title: asString(data.program_type_display) || "Programme d'intégration créé",
    details: [asString(data.employee_name), asString(data.title), `${asString(data.steps_count)} étape(s)`],
  };
}

function buildJobOfferCreatedContent(data: Record<string, unknown>): ActionCardContent {
  return {
    icon: Briefcase,
    title: "Offre d'emploi créée",
    details: [asString(data.title), `${asString(data.department)} · ${asString(data.job_type_display)}`, asString(data.status_display)],
    link: { to: '/jobs', label: "Voir l'offre" },
  };
}

const ACTION_CARD_BUILDERS: Record<string, (data: Record<string, unknown>) => ActionCardContent> = {
  leave_created: buildLeaveCreatedContent,
  leave_decision_applied: buildLeaveDecisionAppliedContent,
  objective_created: buildObjectiveCreatedContent,
  onboarding_created: buildOnboardingCreatedContent,
  job_offer_created: buildJobOfferCreatedContent,
};

/** Rend une carte structurée pour le résultat d'une action du chat IA (congé
 * créé, offre d'emploi créée...) — remplace l'affichage en texte brut seul
 * en exploitant `action_type`/`action_data` déjà renvoyés par l'API mais
 * jusqu'ici ignorés côté frontend. */
export default function ActionResultCard({ actionType, actionData }: ActionResultCardProps) {
  const builder = ACTION_CARD_BUILDERS[actionType];
  if (!builder) return null;

  const content = builder(actionData);

  return (
    <div className="mt-1.5 rounded-lg border border-secondary/20 bg-secondary/5 px-3 py-2 text-xs">
      <div className="flex items-center gap-1.5 font-semibold text-foreground">
        <content.icon className="h-3.5 w-3.5 shrink-0 text-secondary" />
        <span>{content.title}</span>
      </div>
      <ul className="mt-1 space-y-0.5 text-muted-foreground">
        {content.details.filter(Boolean).map((detail, index) => (
          <li key={index}>{detail}</li>
        ))}
      </ul>
      {content.link && (
        <Link to={content.link.to} className="mt-1.5 inline-block font-medium text-secondary hover:underline">
          {content.link.label}
        </Link>
      )}
    </div>
  );
}
