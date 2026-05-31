"""
Service d'envoi d'emails pour Smart-HR.
Architecture inspirée de tchokos_web/tchokos_project/global_data/email.py.
"""

import logging
import smtplib
from typing import Any

from django.conf import settings
from django.core.mail import EmailMessage
from django.core.mail import get_connection
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


class EmailService:
    """
    Utilitaire centralisé pour l'envoi d'emails HTML avec ou sans pièces jointes.
    En mode dev (prod=False), les emails sont loggués sans être envoyés.
    """

    COMPANY_NAME = "Smart-HR"
    COMPANY_TAGLINE = "Votre SIRH Intelligent"

    def __init__(self, *, prod: bool = True) -> None:
        self.prod = prod
        self.site_url = getattr(settings, "SITE_URL", "http://localhost:3000")

    # ------------------------------------------------------------------
    # Connexion SMTP
    # ------------------------------------------------------------------

    def _get_smtp_connection(self):
        try:
            return get_connection(
                backend="django.core.mail.backends.smtp.EmailBackend",
                host=settings.EMAIL_HOST,
                port=settings.EMAIL_PORT,
                username=getattr(settings, "EMAIL_HOST_USER", ""),
                password=getattr(settings, "EMAIL_HOST_PASSWORD", ""),
                use_tls=getattr(settings, "EMAIL_USE_TLS", False),
                use_ssl=getattr(settings, "EMAIL_USE_SSL", False),
                timeout=getattr(settings, "EMAIL_TIMEOUT", 30),
            )
        except (OSError, smtplib.SMTPException, ValueError):
            logger.exception("Impossible d'établir la connexion SMTP")
            return None

    # ------------------------------------------------------------------
    # Envoi générique (HTML brut)
    # ------------------------------------------------------------------

    def send_html_email(
        self,
        subject: str,
        html_content: str,
        recipients: list[str],
        from_email: str | None = None,
        attachments: list[str] | None = None,
    ) -> bool:
        if not self.prod:
            logger.info(
                "[DEV] Email non envoyé — destinataires: %s, sujet: %s",
                recipients,
                subject,
            )
            return True

        try:
            sender = from_email or settings.DEFAULT_FROM_EMAIL
            if not sender:
                logger.error(
                    "DEFAULT_FROM_EMAIL est vide — email non envoyé à %s. "
                    "Définissez DJANGO_DEFAULT_FROM_EMAIL ou EMAIL_HOST_USER dans votre .env.",
                    recipients,
                )
                return False
            message = EmailMessage(
                subject=subject,
                body=html_content,
                from_email=sender,
                to=recipients,
                connection=self._get_smtp_connection(),
            )
            message.content_subtype = "html"
            message.encoding = "utf-8"

            if attachments:
                for file_path in attachments:
                    try:
                        message.attach_file(file_path)
                    except (OSError, ValueError):
                        logger.warning(
                            "Impossible d'attacher le fichier : %s",
                            file_path,
                        )

            message.send(fail_silently=False)
            logger.info("Email envoyé avec succès à %s", recipients)
            return True

        except (TimeoutError, OSError, smtplib.SMTPException, ConnectionError):
            logger.exception("Erreur réseau lors de l'envoi à %s", recipients)
            return False
        except ValueError:
            logger.exception(
                "Erreur de configuration SMTP lors de l'envoi à %s (vérifiez DEFAULT_FROM_EMAIL et les paramètres TLS/SSL)",
                recipients,
            )
            return False
        except TypeError:
            logger.exception("Erreur d'encodage lors de l'envoi à %s", recipients)
            return False

    # ------------------------------------------------------------------
    # Envoi par template Django
    # ------------------------------------------------------------------

    def send_template_email(
        self,
        template: str,
        context: dict[str, Any],
        recipients: list[str],
        subject: str,
        attachments: list[str] | None = None,
    ) -> bool:
        try:
            full_context = {
                **context,
                "site_url": self.site_url,
                "company_name": self.COMPANY_NAME,
                "company_tagline": self.COMPANY_TAGLINE,
            }
            html_body = render_to_string(template_name=template, context=full_context)
            return self.send_html_email(
                subject=subject,
                html_content=html_body,
                recipients=recipients,
                attachments=attachments,
            )
        except (ValueError, TypeError, OSError):
            logger.exception("Erreur lors du rendu/envoi du template %s", template)
            return False


# ------------------------------------------------------------------
# Fonctions utilitaires publiques
# ------------------------------------------------------------------


def send_employee_credentials_email(
    employee_email: str,
    first_name: str,
    last_name: str,
    temp_password: str,
    role: str = "EMPLOYEE",
) -> bool:
    """
    Envoie les identifiants de connexion à un nouvel employé créé par le RH.
    """
    service = EmailService(prod=True)
    site_url = getattr(settings, "SITE_URL", "http://localhost:3000")

    role_labels = {
        "ADMIN": "Administrateur",
        "RH": "Responsable RH",
        "EMPLOYEE": "Employé",
        "CANDIDATE": "Candidat",
    }

    context = {
        "first_name": first_name,
        "last_name": last_name,
        "email": employee_email,
        "temp_password": temp_password,
        "role_label": role_labels.get(role, role),
        "login_url": f"{site_url}/login",
    }

    success = service.send_template_email(
        template="email/employee_credentials.html",
        context=context,
        recipients=[employee_email],
        subject="Bienvenue sur Smart-HR — Vos identifiants de connexion",
    )

    if success:
        logger.info("Email identifiants envoyé à %s", employee_email)
    else:
        logger.error("Échec de l'envoi des identifiants à %s", employee_email)

    return success


def send_leave_request_notification_to_rh(
    rh_emails: list[str],
    employee_name: str,
    leave_type_label: str,
    start_date: str,
    end_date: str,
    days_count: int,
    reason: str = "",
) -> bool:
    """
    Notifie les responsables RH qu'une nouvelle demande de congé a été soumise.
    """
    if not rh_emails:
        logger.warning("Aucun email RH fourni pour la notification de congé")
        return False

    service = EmailService(prod=True)
    site_url = getattr(settings, "SITE_URL", "http://localhost:3000")

    context = {
        "employee_name": employee_name,
        "leave_type_label": leave_type_label,
        "start_date": start_date,
        "end_date": end_date,
        "days_count": days_count,
        "reason": reason,
        "leaves_url": f"{site_url}/leaves",
    }

    success = service.send_template_email(
        template="email/leave_request_submitted.html",
        context=context,
        recipients=rh_emails,
        subject=f"[Smart-HR] Nouvelle demande de congé — {employee_name}",
    )

    if success:
        logger.info("Notification congé envoyée aux RH (%s)", rh_emails)
    else:
        logger.error("Échec notification congé aux RH")

    return success


def send_application_received_email(
    candidate_email: str,
    first_name: str,
    job_title: str,
    department: str = "",
    applied_on: str = "",
) -> bool:
    """
    Confirme la réception d'une candidature au candidat.
    """
    service = EmailService(prod=True)
    site_url = getattr(settings, "SITE_URL", "http://localhost:3000")

    context = {
        "first_name": first_name or candidate_email,
        "job_title": job_title,
        "department": department,
        "applied_on": applied_on,
        "dashboard_url": f"{site_url}/dashboard",
    }

    success = service.send_template_email(
        template="email/application_received.html",
        context=context,
        recipients=[candidate_email],
        subject=f"Candidature reçue — {job_title} — Smart-HR",
    )

    if success:
        logger.info("Email confirmation candidature envoyé à %s", candidate_email)
    else:
        logger.error("Échec envoi confirmation candidature à %s", candidate_email)

    return success


def send_application_status_email(
    candidate_email: str,
    first_name: str,
    job_title: str,
    new_status: str,
    reason: str = "",
) -> bool:
    """
    Notifie le candidat du changement de statut de sa candidature.
    `new_status` : 'reviewing' | 'interview' | 'accepted' | 'rejected'
    """
    service = EmailService(prod=True)
    site_url = getattr(settings, "SITE_URL", "http://localhost:3000")

    status_subjects = {
        "reviewing": f"Votre candidature est en cours d'examen — {job_title}",
        "interview": f"Invitation à un entretien — {job_title}",
        "accepted": f"Félicitations ! Votre candidature est retenue — {job_title}",
        "rejected": f"Réponse à votre candidature — {job_title}",
    }

    context = {
        "first_name": first_name or candidate_email,
        "job_title": job_title,
        "new_status": new_status,
        "is_accepted": new_status == "accepted",
        "is_interview": new_status == "interview",
        "is_reviewing": new_status == "reviewing",
        "is_rejected": new_status == "rejected",
        "reason": reason,
        "dashboard_url": f"{site_url}/dashboard",
    }

    subject = status_subjects.get(
        new_status,
        f"Mise à jour de votre candidature — {job_title}",
    )

    success = service.send_template_email(
        template="email/application_status_update.html",
        context=context,
        recipients=[candidate_email],
        subject=subject,
    )

    if success:
        logger.info(
            "Email statut candidature (%s) envoyé à %s",
            new_status,
            candidate_email,
        )
    else:
        logger.error("Échec envoi statut candidature à %s", candidate_email)

    return success


def send_task_assigned_email(
    employee_email: str,
    first_name: str,
    task_title: str,
    priority: str,
    assigned_by: str,
    description: str = "",
    due_date: str = "",
) -> bool:
    """
    Notifie un employé qu'une tâche lui a été assignée.
    """
    service = EmailService(prod=True)
    site_url = getattr(settings, "SITE_URL", "http://localhost:3000")

    context = {
        "first_name": first_name or employee_email,
        "task_title": task_title,
        "priority": priority,
        "description": description,
        "due_date": due_date,
        "assigned_by": assigned_by,
        "tasks_url": f"{site_url}/tasks",
    }

    success = service.send_template_email(
        template="email/task_assigned.html",
        context=context,
        recipients=[employee_email],
        subject=f"Nouvelle tâche assignée : {task_title} — Smart-HR",
    )

    if success:
        logger.info("Email tâche assignée envoyé à %s", employee_email)
    else:
        logger.error("Échec envoi email tâche à %s", employee_email)

    return success


def send_payslip_paid_email(
    employee_email: str,
    first_name: str,
    last_name: str,
    month: str,
    base_salary: str,
    bonuses: str,
    deductions: str,
    net_salary: str,
) -> bool:
    """
    Notifie un employé que son salaire a été versé.
    `month` : format 'YYYY-MM' (ex: '2026-04')
    """
    service = EmailService(prod=True)
    site_url = getattr(settings, "SITE_URL", "http://localhost:3000")

    month_labels = {
        "01": "Janvier",
        "02": "Février",
        "03": "Mars",
        "04": "Avril",
        "05": "Mai",
        "06": "Juin",
        "07": "Juillet",
        "08": "Août",
        "09": "Septembre",
        "10": "Octobre",
        "11": "Novembre",
        "12": "Décembre",
    }
    parts = month.split("-")
    month_label = f"{month_labels.get(parts[1], parts[1])} {parts[0]}" if len(parts) == 2 else month

    context = {
        "first_name": first_name,
        "last_name": last_name,
        "month_label": month_label,
        "base_salary": base_salary,
        "bonuses": bonuses,
        "deductions": deductions,
        "net_salary": net_salary,
        "payroll_url": f"{site_url}/payroll",
    }

    success = service.send_template_email(
        template="email/payslip_paid.html",
        context=context,
        recipients=[employee_email],
        subject=f"Votre salaire {month_label} a ete verse - Smart-HR",
    )

    if success:
        logger.info("Email fiche de paie envoyé à %s (%s)", employee_email, month)
    else:
        logger.error("Échec envoi fiche de paie à %s", employee_email)

    return success


def send_meeting_invitation_email(
    employee_emails: list[str],
    first_name: str,
    meeting_title: str,
    formation_title: str,
    start_time: str,
    end_time: str,
    meeting_link: str = "",
) -> bool:
    """
    Envoie une invitation de réunion à une liste d'employés.
    """
    if not employee_emails:
        return False

    service = EmailService(prod=True)
    site_url = getattr(settings, "SITE_URL", "http://localhost:3000")

    context = {
        "first_name": first_name,
        "meeting_title": meeting_title,
        "formation_title": formation_title,
        "start_time": start_time,
        "end_time": end_time,
        "meeting_link": meeting_link,
        "training_url": f"{site_url}/training",
    }

    success = service.send_template_email(
        template="email/meeting_invitation.html",
        context=context,
        recipients=employee_emails,
        subject=f"Invitation : {meeting_title} — Smart-HR",
    )

    if success:
        logger.info(
            "Invitations réunion '%s' envoyées à %d destinataires",
            meeting_title,
            len(employee_emails),
        )
    else:
        logger.error("Échec envoi invitations réunion '%s'", meeting_title)

    return success


def send_new_application_to_rh_email(
    rh_emails: list[str],
    candidate_name: str,
    candidate_email: str,
    job_title: str,
) -> bool:
    """
    Notifie les responsables RH qu'une nouvelle candidature a été soumise.
    """
    if not rh_emails:
        return False

    service = EmailService(prod=True)
    site_url = getattr(settings, "SITE_URL", "http://localhost:3000")

    context = {
        "candidate_name": candidate_name,
        "candidate_email": candidate_email,
        "job_title": job_title,
        "applications_url": f"{site_url}/applications",
    }

    success = service.send_template_email(
        template="email/application_submitted_to_rh.html",
        context=context,
        recipients=rh_emails,
        subject=f"[Smart-HR] Nouvelle candidature — {candidate_name} pour {job_title}",
    )

    if success:
        logger.info("Notification nouvelle candidature envoyée aux RH (%s)", rh_emails)
    else:
        logger.error("Échec notification candidature aux RH")

    return success


def send_account_invitation_email(
    recipient_email: str,
    first_name: str,
    last_name: str,
    role: str,
    invitation_url: str,
    expiry_hours: int = 24,
) -> bool:
    """
    Envoie un email d'invitation à un nouvel utilisateur (RH, EMPLOYEE, ADMIN).
    L'utilisateur clique sur le lien pour définir son mot de passe.
    """
    service = EmailService(prod=True)

    role_labels = {
        "ADMIN": "Administrateur",
        "RH": "Responsable RH",
        "EMPLOYEE": "Employé",
    }

    context = {
        "first_name": first_name or recipient_email,
        "last_name": last_name or "",
        "email": recipient_email,
        "role_label": role_labels.get(role, role),
        "invitation_url": invitation_url,
        "expiry_hours": expiry_hours,
    }

    success = service.send_template_email(
        template="email/account_invitation.html",
        context=context,
        recipients=[recipient_email],
        subject="Invitation Smart-HR — Définissez votre mot de passe",
    )

    if success:
        logger.info("Email invitation envoyé à %s (rôle: %s)", recipient_email, role)
    else:
        logger.error("Échec envoi invitation à %s", recipient_email)

    return success


def send_otp_verification_email(
    recipient_email: str,
    first_name: str,
    otp_code: str,
) -> bool:
    """
    Envoie un code OTP à un candidat pour vérifier son adresse email.
    """
    service = EmailService(prod=True)
    site_url = getattr(settings, "SITE_URL", "http://localhost:3000")

    context = {
        "first_name": first_name or recipient_email,
        "otp_code": otp_code,
        "expiry_minutes": 10,
        "verify_url": f"{site_url}/verify-email",
    }

    success = service.send_template_email(
        template="email/otp_verification.html",
        context=context,
        recipients=[recipient_email],
        subject="Vérifiez votre adresse email — Smart-HR",
    )

    if success:
        logger.info("Email OTP envoyé à %s", recipient_email)
    else:
        logger.error("Échec de l'envoi de l'email OTP à %s", recipient_email)

    return success


def send_interview_invitation_email(
    candidate_email: str,
    first_name: str,
    job_title: str,
    interview_link: str,
    duration: str = "30 Min",
    interview_type: str = "Technique",
) -> bool:
    """
    Envoie le lien d'entretien IA personnalisé au candidat.

    Le candidat reçoit un email avec un bouton CTA pointant vers interview_link,
    ainsi que les détails de l'entretien (durée, type).
    """
    service = EmailService(prod=True)

    context = {
        "first_name": first_name or candidate_email,
        "job_title": job_title,
        "interview_link": interview_link,
        "duration": duration,
        "interview_type": interview_type,
    }

    success = service.send_template_email(
        template="email/interview_invitation.html",
        context=context,
        recipients=[candidate_email],
        subject=f"Votre entretien IA — {job_title} — Smart-HR",
    )

    if success:
        logger.info("Email invitation entretien IA envoyé à %s pour le poste '%s'", candidate_email, job_title)
    else:
        logger.error("Échec envoi invitation entretien IA à %s", candidate_email)

    return success


def send_leave_status_email(
    employee_email: str,
    first_name: str,
    leave_type: str,
    start_date: str,
    end_date: str,
    status: str,
    reviewer_name: str = "",
    reason: str = "",
) -> bool:
    """
    Notifie un employé de la décision (approuvée/refusée) sur sa demande de congé.
    """
    service = EmailService(prod=True)

    leave_type_labels = {
        "vacation": "Congé annuel",
        "sick": "Congé maladie",
        "personal": "Congé personnel",
        "maternity": "Congé maternité",
        "other": "Autre",
    }

    is_approved = status == "approved"
    subject = "Congé approuvé — Smart-HR" if is_approved else "Congé refusé — Smart-HR"

    context = {
        "first_name": first_name,
        "leave_type_label": leave_type_labels.get(leave_type, leave_type),
        "start_date": start_date,
        "end_date": end_date,
        "is_approved": is_approved,
        "reviewer_name": reviewer_name,
        "reason": reason,
        "dashboard_url": f"{getattr(settings, 'SITE_URL', 'http://localhost:3000')}/leaves",
    }

    success = service.send_template_email(
        template="email/leave_status_update.html",
        context=context,
        recipients=[employee_email],
        subject=subject,
    )

    if success:
        logger.info(
            "Email statut congé envoyé à %s (status: %s)",
            employee_email,
            status,
        )
    else:
        logger.error("Échec envoi email congé à %s", employee_email)

    return success
