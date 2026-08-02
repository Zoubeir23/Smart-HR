from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class TimeStampedModel(models.Model):
    """
    Modèle abstrait de base pour tous les modèles du projet.

    Fournit automatiquement :
    - created_at : date/heure de création (non modifiable)
    - updated_at : date/heure de dernière modification (mis à jour automatiquement)

    Usage :
        class MonModele(TimeStampedModel):
            ...
    """

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class AuditLog(models.Model):
    """
    Journal d'audit pour tracer les actions critiques (RGPD, sécurité).
    Enregistre qui a fait quoi, sur quel objet et quand.
    """

    class Action(models.TextChoices):
        CREATE = "CREATE", "Création"
        UPDATE = "UPDATE", "Modification"
        DELETE = "DELETE", "Suppression"
        LOGIN = "LOGIN", "Connexion"
        LOGOUT = "LOGOUT", "Déconnexion"
        EXPORT = "EXPORT", "Export données"

    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    model_name = models.CharField(max_length=100, blank=True)
    object_id = models.CharField(max_length=100, blank=True)
    object_repr = models.CharField(max_length=255, blank=True)
    details = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Log d'audit"
        verbose_name_plural = "Logs d'audit"
        ordering = ["-timestamp"]

    def __str__(self) -> str:
        actor = self.performed_by.email if self.performed_by else "système"
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {actor} — {self.action} {self.model_name}({self.object_id})"


def log_audit_action(
    *,
    performed_by,
    action: str,
    model_name: str = "",
    object_id: str = "",
    object_repr: str = "",
    details: dict | None = None,
) -> None:
    """Helper pour créer un log d'audit sans bloquer le flux principal."""
    try:
        AuditLog.objects.create(
            performed_by=performed_by,
            action=action,
            model_name=model_name,
            object_id=str(object_id),
            object_repr=object_repr[:255],
            details=details or {},
        )
    except Exception:
        import logging

        logging.getLogger(__name__).exception("Échec écriture audit log")


class Notification(TimeStampedModel):
    """Notification in-app par destinataire, créée via signals Django."""

    class NotificationType(models.TextChoices):
        LEAVE_REQUEST = "leave_request", _("Demande de congé")
        LEAVE_APPROVED = "leave_approved", _("Congé approuvé")
        LEAVE_REJECTED = "leave_rejected", _("Congé refusé")
        APPLICATION_RECEIVED = "application_received", _("Candidature reçue")
        TASK_ASSIGNED = "task_assigned", _("Tâche assignée")
        MESSAGE_RECEIVED = "message_received", _("Message reçu")
        SYSTEM = "system", _("Système")

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    target_url = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"

    def __str__(self) -> str:
        status = "lu" if self.is_read else "non lu"
        return f"[{status}] {self.recipient.email} — {self.title}"
