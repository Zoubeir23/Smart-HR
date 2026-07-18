import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ActionResultCard from './ActionResultCard';

function renderCard(actionType: string, actionData: Record<string, unknown>) {
  return render(
    <MemoryRouter>
      <ActionResultCard actionType={actionType} actionData={actionData} />
    </MemoryRouter>
  );
}

describe('ActionResultCard', () => {
  it('ne rend rien pour un action_type inconnu ou vide', () => {
    const { container } = renderCard('unknown_type', {});
    expect(container.firstChild).toBeNull();
  });

  it('affiche la carte de congé créé', () => {
    renderCard('leave_created', {
      leave_type: 'Congé annuel',
      start_date: '12/08/2026',
      end_date: '15/08/2026',
      duration_days: 4,
      status: 'En attente',
    });
    expect(screen.getByText('Demande de congé créée')).toBeInTheDocument();
    expect(screen.getByText('Congé annuel du 12/08/2026 au 15/08/2026')).toBeInTheDocument();
  });

  it('affiche "validée" pour une décision de congé approuvée', () => {
    renderCard('leave_decision_applied', {
      employee_name: 'Awa Diallo',
      decision: 'approve',
      leave_type: 'Congé annuel',
      start_date: '01/06/2026',
      end_date: '05/06/2026',
    });
    expect(screen.getByText('Demande de congé validée')).toBeInTheDocument();
    expect(screen.getByText('Awa Diallo')).toBeInTheDocument();
  });

  it('affiche "refusée" pour une décision de congé rejetée', () => {
    renderCard('leave_decision_applied', {
      employee_name: 'Awa Diallo',
      decision: 'reject',
      leave_type: 'Congé annuel',
      start_date: '01/06/2026',
      end_date: '05/06/2026',
    });
    expect(screen.getByText('Demande de congé refusée')).toBeInTheDocument();
  });

  it("affiche la carte d'objectif OKR créé", () => {
    renderCard('objective_created', {
      title: 'Signer 10 clients',
      level_display: 'Individuel',
      period: 'Q1 2026',
      key_results_count: 2,
    });
    expect(screen.getByText('Objectif OKR créé')).toBeInTheDocument();
    expect(screen.getByText('Signer 10 clients')).toBeInTheDocument();
    expect(screen.getByText('Individuel · Q1 2026')).toBeInTheDocument();
  });

  it("affiche la carte de programme d'intégration créé", () => {
    renderCard('onboarding_created', {
      program_type_display: "Programme d'intégration",
      employee_name: 'Awa Diallo',
      title: 'Intégration développeuse backend',
      steps_count: 5,
    });
    expect(screen.getByText("Programme d'intégration")).toBeInTheDocument();
    expect(screen.getByText('Awa Diallo')).toBeInTheDocument();
    expect(screen.getByText('5 étape(s)')).toBeInTheDocument();
  });

  it("affiche la carte d'offre d'emploi créée avec un lien vers /jobs", () => {
    renderCard('job_offer_created', {
      title: 'Développeur Backend Django',
      department: 'Technique',
      job_type_display: 'Temps plein',
      status_display: 'Ouvert',
    });
    expect(screen.getByText("Offre d'emploi créée")).toBeInTheDocument();
    expect(screen.getByText('Développeur Backend Django')).toBeInTheDocument();
    expect(screen.getByText('Technique · Temps plein')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: "Voir l'offre" });
    expect(link).toHaveAttribute('href', '/jobs');
  });
});
