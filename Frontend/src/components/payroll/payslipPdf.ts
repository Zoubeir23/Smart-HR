import { jsPDF } from 'jspdf';
import { STATUS_CONFIG } from '@/components/payroll/payrollConstants';
import { formatCurrency, formatMonthLabel } from '@/components/payroll/payrollHelpers';
import type { PayrollRecord } from '@/components/payroll/payrollTypes';

export function generatePayslipPDF(record: PayrollRecord): void {
  const monthLabel = formatMonthLabel(record.month);
  const statusLabel = STATUS_CONFIG[record.status]?.label ?? record.status;
  const generatedOn = new Date().toLocaleDateString('fr-FR');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = margin;

  // ── En-tête ──────────────────────────────────────────────────────
  doc.setFontSize(22);
  doc.setTextColor(214, 40, 40); // brand-red
  doc.setFont('helvetica', 'bold');
  doc.text('Smart-HR', margin, y);

  doc.setFontSize(10);
  doc.setTextColor(136, 136, 136);
  doc.setFont('helvetica', 'normal');
  doc.text('Bulletin de Paie', margin, y + 7);

  // Période (alignée à droite)
  doc.setFontSize(10);
  doc.setTextColor(136, 136, 136);
  doc.text('Période', pageWidth - margin, y, { align: 'right' });
  doc.setFontSize(13);
  doc.setTextColor(28, 20, 16);
  doc.setFont('helvetica', 'bold');
  doc.text(monthLabel, pageWidth - margin, y + 7, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(136, 136, 136);
  doc.setFont('helvetica', 'normal');
  doc.text(`Statut : ${statusLabel}`, pageWidth - margin, y + 14, { align: 'right' });

  y += 22;

  // Ligne séparatrice rouge
  doc.setDrawColor(214, 40, 40);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ── Informations employé ─────────────────────────────────────────
  doc.setFontSize(13);
  doc.setTextColor(28, 20, 16);
  doc.setFont('helvetica', 'bold');
  doc.text(record.employee_name, margin, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(85, 85, 85);
  if (record.employee_email) {
    doc.text(record.employee_email, margin, y);
    y += 5;
  }
  doc.text(record.department_name || 'Sans département', margin, y);
  y += 14;

  // ── Tableau des éléments de paie ─────────────────────────────────
  const rows: Array<{ label: string; value: string; color?: [number, number, number] }> = [
    { label: 'Salaire de base',       value: formatCurrency(record.base_salary) },
    { label: 'Primes / Ancienneté',   value: `+ ${formatCurrency(record.bonuses)}`,    color: [46, 125, 50] },
    { label: 'Déductions',            value: `- ${formatCurrency(record.deductions)}`, color: [198, 40, 40] },
  ];

  for (const row of rows) {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 4, pageWidth - margin, y + 4);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(85, 85, 85);
    doc.text(row.label, margin, y);

    doc.setFont('helvetica', 'bold');
    if (row.color) {
      doc.setTextColor(...row.color);
    } else {
      doc.setTextColor(28, 20, 16);
    }
    doc.text(row.value, pageWidth - margin, y, { align: 'right' });
    y += 12;
  }

  // Net à payer — ligne totale
  y += 2;
  doc.setDrawColor(28, 20, 16);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 20, 16);
  doc.text('Net à payer', margin, y);
  doc.setTextColor(214, 40, 40);
  doc.text(formatCurrency(record.net_salary), pageWidth - margin, y, { align: 'right' });

  // ── Pied de page ─────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(170, 170, 170);
  const footer = `Document généré le ${generatedOn} — Smart-HR · Confidentiel`;
  doc.text(footer, pageWidth / 2, doc.internal.pageSize.getHeight() - 12, { align: 'center' });

  doc.save(`bulletin-paie_${record.employee_name.replace(/\s+/g, '-')}_${record.month}.pdf`);
}
