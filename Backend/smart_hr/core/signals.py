from __future__ import annotations

import logging

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


def _get_rh_and_admin_user_ids() -> list[int]:
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return list(
        User.objects.filter(role__in=["ADMIN", "RH"], is_active=True).values_list("id", flat=True)
    )


@receiver(post_save, sender="conge.LeaveRequest")
def handle_leave_request_notification(sender, instance, created: bool, **kwargs) -> None:
    from smart_hr.core.models import Notification

    employee_user = instance.employee.user
    full_name = employee_user.get_full_name() or employee_user.email

    if created:
        for recipient_id in _get_rh_and_admin_user_ids():
            if recipient_id == employee_user.pk:
                continue
            _create_notification(
                recipient_id=recipient_id,
                notification_type=Notification.NotificationType.LEAVE_REQUEST,
                title="Nouvelle demande de congé",
                message=f"{full_name} a soumis une demande de congé du {instance.start_date} au {instance.end_date}.",
                target_url="/leaves",
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
    elif instance.status == "rejected":
        _create_notification(
            recipient_id=employee_user.pk,
            notification_type=Notification.NotificationType.LEAVE_REJECTED,
            title="Demande de congé refusée",
            message=f"Votre congé du {instance.start_date} au {instance.end_date} a été refusé.",
            target_url="/leaves",
        )


@receiver(post_save, sender="recruitment.Application")
def handle_application_notification(sender, instance, created: bool, **kwargs) -> None:
    if not created:
        return

    from smart_hr.core.models import Notification

    candidate_name = instance.candidate.get_full_name() or instance.candidate.email
    job_title = instance.job_offer.title if instance.job_offer else "un poste"

    for recipient_id in _get_rh_and_admin_user_ids():
        _create_notification(
            recipient_id=recipient_id,
            notification_type=Notification.NotificationType.APPLICATION_RECEIVED,
            title="Nouvelle candidature reçue",
            message=f"{candidate_name} a postulé pour : {job_title}.",
            target_url="/applications",
        )


@receiver(post_save, sender="tache.Task")
def handle_task_assigned_notification(sender, instance, created: bool, **kwargs) -> None:
    if not created or not instance.assignee_id:
        return

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
