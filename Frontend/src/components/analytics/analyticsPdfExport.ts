import { jsPDF } from 'jspdf';
import { formatCurrency } from '@/components/analytics/analyticsHelpers';
import type { HRAnalyticsOverview } from '@/services/analyticsService';

/**
 * Génère un rapport PDF récapitulatif de tous les indicateurs People
 * Analytics — pour permettre au RH/manager d'insérer directement les chiffres
 * dans une présentation sans recréer de graphiques (cf. audit TargetYM AI).
 * Suit le même style de mise en page manuelle que le bulletin de paie
 * (Frontend/src/components/payroll/payslipPdf.ts).
 */
export function generateAnalyticsPdf(data: HRAnalyticsOverview): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const addSectionTitle = (title: string) => {
    ensureSpace(14);
    doc.setFontSize(13);
    doc.setTextColor(214, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y);
    y += 3;
    doc.setDrawColor(214, 40, 40);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;
  };

  const addRow = (label: string, value: string) => {
    ensureSpace(7);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(85, 85, 85);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(28, 20, 16);
    doc.text(value, pageWidth - margin, y, { align: 'right' });
    y += 6;
  };

  // Header
  doc.setFontSize(22);
  doc.setTextColor(214, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.text('Smart-HR', margin, y);
  doc.setFontSize(10);
  doc.setTextColor(136, 136, 136);
  doc.setFont('helvetica', 'normal');
  doc.text('Rapport People Analytics', margin, y + 7);
  doc.setFontSize(9);
  doc.text(
    new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }),
    pageWidth - margin,
    y,
    { align: 'right' }
  );
  y += 16;

  addSectionTitle('Effectifs & masse salariale');
  addRow('Effectif actif', `${data.totals.active_employees}`);
  addRow('Masse salariale', formatCurrency(data.totals.salary_mass));
  addRow('Salaire moyen', formatCurrency(data.totals.average_salary));
  y += 4;

  addSectionTitle('Risque de départ (churn)');
  addRow('Risque élevé', `${data.churn_summary.high}`);
  addRow('Risque moyen', `${data.churn_summary.medium}`);
  addRow('Risque faible', `${data.churn_summary.low}`);
  y += 4;

  addSectionTitle('Performance');
  addRow('Employés évalués', `${data.performance_summary.evaluated_count}`);
  addRow('Score moyen', `${data.performance_summary.average_score}/100`);
  y += 4;

  addSectionTitle('Recrutement');
  data.recruitment_funnel.forEach((entry) => addRow(entry.label, `${entry.count}`));
  y += 4;

  addSectionTitle('Engagement');
  addRow('Réponses collectées', `${data.engagement_summary.responses_count}`);
  addRow('Note moyenne', `${data.engagement_summary.average_rating}/5`);
  y += 4;

  addSectionTitle('Formation');
  addRow('Formations disponibles', `${data.training_summary.available_courses}`);
  addRow('Total formations', `${data.training_summary.total_formations}`);
  addRow('Coût total', formatCurrency(data.training_summary.total_cost));
  addRow('Taux de complétion', `${data.training_summary.completion_rate}%`);
  addRow('Total assigné', `${data.training_summary.total_participations}`);
  y += 4;

  addSectionTitle('Effectifs par département');
  data.department_headcount.forEach((entry) => addRow(entry.department, `${entry.count}`));

  doc.save('people_analytics.pdf');
}
