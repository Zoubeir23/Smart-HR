import type { HRAnalyticsOverview } from '@/services/analyticsService';

export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M FCFA`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k FCFA`;
  return `${amount} FCFA`;
}

export interface AnalyticsAlert {
  severity: 'warning' | 'info';
  message: string;
}

/**
 * Alertes & recommandations calculées côté client depuis les indicateurs déjà
 * chargés — règles simples (seuils), pas d'appel serveur dédié.
 */
export function buildAlerts(data: HRAnalyticsOverview): AnalyticsAlert[] {
  const alerts: AnalyticsAlert[] = [];

  if (data.churn_summary.high > 0) {
    alerts.push({
      severity: 'warning',
      message: `${data.churn_summary.high} employé(s) présentent un risque de départ élevé.`,
    });
  }
  if (data.leave_summary.pending > 0) {
    alerts.push({
      severity: 'info',
      message: `${data.leave_summary.pending} demande(s) de congé en attente de validation.`,
    });
  }
  if (data.training_summary.total_participations > 0 && data.training_summary.completion_rate < 50) {
    alerts.push({
      severity: 'warning',
      message: `Taux de complétion des formations faible (${data.training_summary.completion_rate}%).`,
    });
  }
  if (data.engagement_summary.responses_count > 0 && data.engagement_summary.average_rating < 3) {
    alerts.push({
      severity: 'warning',
      message: `Score d'engagement du personnel bas (${data.engagement_summary.average_rating}/5).`,
    });
  }
  const pendingApplications = data.recruitment_funnel.find((entry) => entry.status === 'pending')?.count ?? 0;
  if (pendingApplications > 5) {
    alerts.push({
      severity: 'info',
      message: `${pendingApplications} candidatures en attente de traitement.`,
    });
  }

  return alerts;
}
