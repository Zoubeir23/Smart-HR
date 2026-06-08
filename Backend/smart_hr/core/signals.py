from __future__ import annotations

import logging
import threading

from django.db.models.signals import post_delete
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


def _create_notification(*, recipient_id: int, notification_type: str, title: str, message: str, target_url: str = "") -> None:
    from smart_hr.core.models import Notification

    try:
        Notification.objects.create(
            recipient_id=recipient_id,
            notification_type=notification_type,
            title=title,
            message=message,
            target_url=target_url,
        )
    except Exception:
        logger.exception("Échec création notification pour recipient_id=%s", recipient_id)


def _send_email_async(func, **kwargs) -> None:
    """Lance l'envoi email dans un thread séparé pour ne pas bloquer la requête."""
    thread = threading.Thread(target=func, kwargs=kwargs, daemon=True)
    thread.start()


def _get_rh_and_admin_users():
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return list(User.objects.filter(role__in=["ADMIN", "RH"], is_active=True).only("id", "email"))


@receiver(post_save, sender="conge.LeaveRequest")
def handle_leave_request_notification(sender, instance, *, created: bool, **kwargs) -> None:
    from smart_hr.core.email_service import send_leave_request_notification_to_rh
    from smart_hr.core.email_service import send_leave_status_email
    from smart_hr.core.models import Notification

    employee_user = instance.employee.user
    full_name = employee_user.get_full_name() or employee_user.email

    if created:
        rh_users = _get_rh_and_admin_users()
        rh_emails = [u.email for u in rh_users if u.pk != employee_user.pk]

        for user in rh_users:
            if user.pk == employee_user.pk:
                continue
            _create_notification(
                recipient_id=user.pk,
                notification_type=Notification.NotificationType.LEAVE_REQUEST,
                title="Nouvelle demande de congé",
                message=f"{full_name} a soumis une demande de congé du {instance.start_date} au {instance.end_date}.",
                target_url="/leaves",
            )

        if rh_emails:
            leave_type_labels = {
                "vacation": "Congé annuel",
                "sick": "Congé maladie",
                "personal": "Congé personnel",
                "maternity": "Congé maternité",
                "other": "Autre",
            }
            start = instance.start_date
            end = instance.end_date
            days = (end - start).days + 1
            _send_email_async(
                send_leave_request_notification_to_rh,
                rh_emails=rh_emails,
                employee_name=full_name,
                leave_type_label=leave_type_labels.get(instance.leave_type, instance.leave_type),
                start_date=str(start),
                end_date=str(end),
                days_count=days,
                reason=instance.reason or "",
            )
        return

    if instance.status == "approved":
        _create_notification(
            recipient_id=employee_user.pk,
            notification_type=Notification.NotificationType.LEAVE_APPROVED,
            title="Demande de congé approuvée",
            message=f"Votre congé du {instance.start_date} au {instance.end_date} a été approuvé.",
            target_url="/leaves",
        )
        reviewer_name = ""
        if instance.approved_by:
            reviewer_name = instance.approved_by.get_full_name() or instance.approved_by.email
        _send_email_async(
            send_leave_status_email,
            employee_email=employee_user.email,
            first_name=employee_user.first_name or "",
            leave_type=instance.leave_type,
            start_date=str(instance.start_date),
            end_date=str(instance.end_date),
            status="approved",
            reviewer_name=reviewer_name,
        )

    elif instance.status == "rejected":
        _create_notification(
            recipient_id=employee_user.pk,
            notification_type=Notification.NotificationType.LEAVE_REJECTED,
            title="Demande de congé refusée",
            message=f"Votre congé du {instance.start_date} au {instance.end_date} a été refusé.",
            target_url="/leaves",
        )
        reviewer_name = ""
        if instance.approved_by:
            reviewer_name = instance.approved_by.get_full_name() or instance.approved_by.email
        _send_email_async(
            send_leave_status_email,
            employee_email=employee_user.email,
            first_name=employee_user.first_name or "",
            leave_type=instance.leave_type,
            start_date=str(instance.start_date),
            end_date=str(instance.end_date),
            status="rejected",
            reviewer_name=reviewer_name,
        )


@receiver(post_save, sender="recruitment.Application")
def handle_application_notification(sender, instance, *, created: bool, **kwargs) -> None:
    if not created:
        return

    from smart_hr.core.email_service import send_new_application_to_rh_email
    from smart_hr.core.models import Notification

    candidate_name = instance.candidate.get_full_name() or instance.candidate.email
    candidate_email = instance.candidate.email
    job_title = instance.job_offer.title if instance.job_offer else "un poste"

    rh_users = _get_rh_and_admin_users()
    rh_emails = [u.email for u in rh_users]

    for user in rh_users:
        _create_notification(
            recipient_id=user.pk,
            notification_type=Notification.NotificationType.APPLICATION_RECEIVED,
            title="Nouvelle candidature reçue",
            message=f"{candidate_name} a postulé pour : {job_title}.",
            target_url="/applications",
        )

    if rh_emails:
        _send_email_async(
            send_new_application_to_rh_email,
            rh_emails=rh_emails,
            candidate_name=candidate_name,
            candidate_email=candidate_email,
            job_title=job_title,
        )


@receiver(post_delete, sender="ai_engine.ChurnPrediction")
def reset_employee_churn_risk_on_prediction_delete(sender, instance, **kwargs) -> None:
    """Remet churn_risk à None quand la dernière prédiction est supprimée."""
    try:
        employee = instance.employee
    except Exception:
        return
    if not employee.churn_predictions.exists():
        employee.churn_risk = None
        employee.save(update_fields=["churn_risk"])


@receiver(post_save, sender="tache.Task")
def handle_task_assigned_notification(sender, instance, *, created: bool, **kwargs) -> None:
    if not created or not instance.assignee_id:
        return

    from smart_hr.core.email_service import send_task_assigned_email
    from smart_hr.core.models import Notification

    try:
        assignee_user = instance.assignee.user
    except Exception:
        return

    _create_notification(
        recipient_id=assignee_user.pk,
        notification_type=Notification.NotificationType.TASK_ASSIGNED,
        title="Nouvelle tâche assignée",
        message=f'La tâche "{instance.title}" vous a été assignée.',
        target_url="/tasks",
    )

    assigned_by = ""
    if instance.created_by:
        assigned_by = instance.created_by.get_full_name() or instance.created_by.email

    _send_email_async(
        send_task_assigned_email,
        employee_email=assignee_user.email,
        first_name=assignee_user.first_name or "",
        task_title=instance.title,
        priority=instance.get_priority_display(),
        assigned_by=assigned_by,
        description=instance.description or "",
        due_date=str(instance.due_date) if instance.due_date else "",
    )
