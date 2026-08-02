from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from smart_hr.core.models import TimeStampedModel


class Conversation(TimeStampedModel):
    """Fil de discussion entre plusieurs utilisateurs.

    Une conversation « directe » relie exactement deux utilisateurs et reste
    unique pour une paire donnée : rouvrir une discussion réutilise le fil
    existant au lieu d'en créer un doublon.
    """

    class Kind(models.TextChoices):
        DIRECT = "direct", _("Conversation directe")
        GROUP = "group", _("Groupe")

    kind = models.CharField(
        max_length=10,
        choices=Kind.choices,
        default=Kind.DIRECT,
        verbose_name="Type",
    )
    subject = models.CharField(max_length=255, blank=True, verbose_name="Sujet")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_conversations",
        verbose_name="Créée par",
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="messaging.ConversationParticipant",
        related_name="messaging_conversations",
        verbose_name="Participants",
    )
    last_message_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Dernier message le",
        help_text="Dénormalisé pour trier les conversations sans jointure sur les messages.",
    )

    class Meta:
        ordering = ["-last_message_at", "-created_at"]
        verbose_name = "Conversation"
        verbose_name_plural = "Conversations"

    def __str__(self) -> str:
        if self.subject:
            return self.subject
        return f"Conversation #{self.pk}"


class ConversationParticipant(TimeStampedModel):
    """Appartenance d'un utilisateur à une conversation, avec son état de lecture."""

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="participant_links",
        verbose_name="Conversation",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversation_links",
        verbose_name="Utilisateur",
    )
    last_read_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Dernière lecture",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "user"],
                name="unique_participant_per_conversation",
            ),
        ]
        verbose_name = "Participant"
        verbose_name_plural = "Participants"

    def __str__(self) -> str:
        return f"{self.user} — conversation #{self.conversation_id}"


class Message(TimeStampedModel):
    """Message posté dans une conversation."""

    MAX_BODY_LENGTH = 5000

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name="Conversation",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_messages",
        verbose_name="Expéditeur",
    )
    body = models.TextField(verbose_name="Contenu")

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [models.Index(fields=["conversation", "created_at"])]
        verbose_name = "Message"
        verbose_name_plural = "Messages"

    def __str__(self) -> str:
        preview = self.body[:40]
        return f"{self.sender} : {preview}"
