"""
Garde-fous sur les emails transactionnels.

Ces tests protègent des régressions qui ne se voient pas en développement mais
cassent l'email chez le destinataire : mise en page flex (ignorée par Outlook),
logo en SVG ou en 404, envoi HTML seul (pénalisé par les filtres anti-spam),
absence de texte d'aperçu.
"""

import pytest
from django.core import mail
from django.template.loader import render_to_string

from smart_hr.core.email_service import EmailService

pytestmark = pytest.mark.django_db

# Valeur d'affichage factice pour le template d'identifiants. Isolée dans une
# constante au nom neutre : un littéral posé directement sur une clé nommée
# « password » déclenche les détecteurs de fuite de secret (GitGuardian), même
# quand la valeur est manifestement bidon.
PLACEHOLDER_CREDENTIAL = "valeur-factice-de-test"

# Chaque template avec un contexte de rendu représentatif.
TEMPLATE_CONTEXTS: dict[str, dict] = {
    "email/otp_verification.html": {
        "first_name": "Awa",
        "otp_code": "482913",
        "expiry_minutes": 10,
        "verify_url": "https://smart-hr.tech/verify",
    },
    "email/employee_credentials.html": {
        "first_name": "Moussa",
        "last_name": "Diallo",
        "email": "moussa@example.com",
        "temp_password": PLACEHOLDER_CREDENTIAL,
        "role_label": "Employé",
        "login_url": "https://smart-hr.tech/login",
    },
    "email/account_invitation.html": {
        "first_name": "Awa",
        "last_name": "Diop",
        "email": "awa@example.com",
        "role_label": "Responsable RH",
        "expiry_hours": 48,
        "invitation_url": "https://smart-hr.tech/set-password/abc/def/",
    },
    "email/leave_status_update.html": {
        "first_name": "Moussa",
        "is_approved": True,
        "leave_type_label": "Vacances",
        "start_date": "01 août",
        "end_date": "05 août",
        "reviewer_name": "Awa Diop",
        "dashboard_url": "https://smart-hr.tech/leaves",
    },
    "email/leave_request_submitted.html": {
        "employee_name": "Moussa Diallo",
        "leave_type_label": "Maladie",
        "start_date": "01 août",
        "end_date": "03 août",
        "days_count": 3,
        "reason": "Rendez-vous médical",
        "leaves_url": "https://smart-hr.tech/leaves",
    },
    "email/task_assigned.html": {
        "first_name": "Moussa",
        "task_title": "Préparer le bilan trimestriel",
        "description": "Compiler les chiffres du T3.",
        "priority": "high",
        "due_date": "15 août",
        "assigned_by": "Awa Diop",
        "tasks_url": "https://smart-hr.tech/tasks",
    },
    "email/payslip_paid.html": {
        "first_name": "Moussa",
        "last_name": "Diallo",
        "month_label": "juillet 2026",
        "base_salary": "500000.00",
        "bonuses": "50000.00",
        "deductions": "25000.00",
        "net_salary": "525000.00",
        "payroll_url": "https://smart-hr.tech/payroll",
    },
    "email/meeting_invitation.html": {
        "first_name": "Moussa",
        "meeting_title": "Point d'équipe",
        "formation_title": "Onboarding Django",
        "start_time": "10 août 09:00",
        "end_time": "10 août 10:00",
        "meeting_link": "https://zoom.us/j/123",
        "training_url": "https://smart-hr.tech/training",
    },
    "email/interview_invitation.html": {
        "first_name": "Moussa",
        "job_title": "Développeur Backend",
        "duration": "30 minutes",
        "interview_type": "Entretien vocal IA",
        "interview_link": "https://smart-hr.tech/interview/tok",
    },
    "email/application_received.html": {
        "first_name": "Moussa",
        "job_title": "Développeur Backend",
        "department": "Informatique",
        "applied_on": "12 juillet 2026",
        "dashboard_url": "https://smart-hr.tech/my-applications",
    },
    "email/application_submitted_to_rh.html": {
        "candidate_name": "Moussa Diallo",
        "candidate_email": "moussa@example.com",
        "job_title": "Développeur Backend",
        "applications_url": "https://smart-hr.tech/applications",
    },
    "email/application_status_update.html": {
        "first_name": "Moussa",
        "job_title": "Développeur Backend",
        "is_accepted": True,
        "dashboard_url": "https://smart-hr.tech/my-applications",
    },
    "email/churn_alert.html": {
        "rh_first_name": "Awa",
        "employee_full_name": "Moussa Diallo",
        "employee_department": "Informatique",
        "risk_score": 82.4,
        "main_risk_factor": "Salaire sous le marché",
        "dashboard_url": "https://smart-hr.tech/ai-insights",
    },
}

ALL_TEMPLATES = sorted(TEMPLATE_CONTEXTS)


def render(template: str) -> str:
    context = {**TEMPLATE_CONTEXTS[template], "site_url": "https://smart-hr.tech"}
    return render_to_string(template_name=template, context=context)


class TestEmailClientCompatibility:
    """Ce qui casse réellement chez le destinataire."""

    @pytest.mark.parametrize("template", ALL_TEMPLATES)
    def test_no_flexbox_layout(self, template):
        """Outlook (moteur Word) ignore display:flex et gap : la mise en page s'effondre."""
        html = render(template)
        assert "display: flex" not in html
        assert "display:flex" not in html
        assert "inline-flex" not in html

    @pytest.mark.parametrize("template", ALL_TEMPLATES)
    def test_no_svg_image(self, template):
        """Le SVG n'est rendu ni par Gmail, ni par Outlook, ni par Yahoo."""
        html = render(template)
        assert ".svg" not in html

    @pytest.mark.parametrize("template", ALL_TEMPLATES)
    def test_no_rem_units(self, template):
        """Outlook gère mal les rem : les tailles deviennent imprévisibles."""
        html = render(template)
        assert "rem;" not in html

    @pytest.mark.parametrize("template", ALL_TEMPLATES)
    def test_layout_uses_presentation_tables(self, template):
        """Mise en page en table, annoncée comme décorative aux lecteurs d'écran."""
        html = render(template)
        assert 'role="presentation"' in html

    @pytest.mark.parametrize("template", ALL_TEMPLATES)
    def test_has_preheader(self, template):
        """Texte d'aperçu affiché par la boîte de réception à côté de l'objet."""
        html = render(template)
        assert "max-height:0" in html


class TestBrandCompliance:
    """Conformité à DESIGN.md."""

    @pytest.mark.parametrize("template", ALL_TEMPLATES)
    def test_no_cool_slate_palette(self, template):
        """
        La Règle de la Chaleur : aucun gris bleuté.
        Ces hex étaient ceux de l'ancienne palette froide (Tailwind slate).
        """
        html = render(template)
        for cool_hex in ("#0f172a", "#64748b", "#94a3b8", "#e2e8f0", "#f8fafc", "#eef0f3"):
            assert cool_hex not in html.lower()

    @pytest.mark.parametrize("template", ALL_TEMPLATES)
    def test_no_side_stripe_border(self, template):
        """Bordure latérale colorée : interdit absolu du design system."""
        html = render(template)
        assert "border-left:" not in html
        assert "border-left-color" not in html

    @pytest.mark.parametrize("template", ALL_TEMPLATES)
    def test_wordmark_is_text_not_image(self, template):
        """Le wordmark doit rester lisible même si les images sont bloquées."""
        html = render(template)
        assert "Smart<span" in html
        assert "<img" not in html


class TestMultipartDelivery:
    """L'envoi doit rester multipart (texte + HTML)."""

    def test_sends_text_and_html_parts(self, settings):
        settings.SITE_URL = "https://smart-hr.tech"
        service = EmailService()

        sent = service.send_template_email(
            template="email/otp_verification.html",
            context=TEMPLATE_CONTEXTS["email/otp_verification.html"],
            recipients=["moussa@example.com"],
            subject="Vérification",
        )

        assert sent is True
        assert len(mail.outbox) == 1
        message = mail.outbox[0]

        # Corps principal = texte brut lisible, pas du HTML.
        assert "<html" not in message.body
        assert "482913" in message.body

        # Alternative HTML attachée.
        assert len(message.alternatives) == 1
        html_body, mimetype = message.alternatives[0]
        assert mimetype == "text/html"
        assert "<html" in html_body

    def test_text_alternative_falls_back_when_txt_missing(self, settings, caplog):
        """Sans template .txt, on dégraisse le HTML plutôt que d'envoyer du HTML seul."""
        settings.SITE_URL = "https://smart-hr.tech"
        service = EmailService()

        text = service._render_text_alternative(  # noqa: SLF001
            template="email/email_base.html",
            context={"site_url": "https://smart-hr.tech"},
        )

        assert "<html" not in text
        assert "Smart" in text


class TestInvitationLinkNotMangled:
    def test_invitation_url_keeps_its_scheme(self):
        """
        Le filtre |urlencode encodait le « : » de https:// et cassait le lien.
        """
        html = render("email/account_invitation.html")
        assert "https://smart-hr.tech/set-password/abc/def/" in html
        assert "https%3A" not in html
