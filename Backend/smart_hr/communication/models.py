from __future__ import annotations

from django.conf import settings
from django.db import models

from smart_hr.core.models import TimeStampedModel


class InternalMessage(TimeStampedModel):
    class MessageType(models.TextChoices):
        MEMO = "memo", "Mémorandum"
        NOTE_SERVICE = "note_service", "Note de service"
        ORDER = "order", "Ordre de service"
        CIRCULAR = "circular", "Circulaire"

    class TargetAudience(models.TextChoices):
        ALL = "all", "Tout le personnel"
        RH = "rh", "Équipe RH"
        ADMIN = "admin", "Administration"
        EMPLOYEE = "employee", "Employés uniquement"

    message_type = models.CharField(
        max_length=20,
        choices=MessageType.choices,
        default=MessageType.MEMO,
        verbose_name="Type",
    )
    title = models.CharField(max_length=255, verbose_name="Titre")
    content = models.TextField(verbose_name="Contenu")
    category = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Rubrique",
        help_text="Catégorie de recherche (ex: Ponctualité, RH, Sécurité)",
    )
    target_audience = models.CharField(
        max_length=20,
        choices=TargetAudience.choices,
        default=TargetAudience.ALL,
        verbose_name="Destinataires",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="authored_messages",
        verbose_name="Auteur",
    )
    is_published = models.BooleanField(default=False, verbose_name="Publié")
    published_at = models.DateField(null=True, blank=True, verbose_name="Date de publication")

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Message interne"
        verbose_name_plural = "Messages internes"

    def __str__(self) -> str:
        return f"[{self.get_message_type_display()}] {self.title}"
