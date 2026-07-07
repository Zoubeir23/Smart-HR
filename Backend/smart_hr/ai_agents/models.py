from django.conf import settings
from django.db import models

from smart_hr.core.models import TimeStampedModel


class VoiceSession(TimeStampedModel):
    """Un fil de discussion de l'assistant vocal, regroupant plusieurs
    échanges question/réponse. Miroir de smart_hr.ai.models.Conversation
    pour le canal vocal.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="voice_sessions",
    )
    title = models.CharField(max_length=255, blank=True, default="Nouvelle session")

    class Meta:
        verbose_name = "Session vocale"
        verbose_name_plural = "Sessions vocales"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.user} — {self.title}"


class VoiceMessage(TimeStampedModel):
    session = models.ForeignKey(
        VoiceSession,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    question = models.TextField()
    response = models.TextField()
    audio_url = models.CharField(max_length=500, blank=True, default="")
    voice = models.CharField(max_length=20, default="nova")

    class Meta:
        verbose_name = "Message vocal"
        verbose_name_plural = "Messages vocaux"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.session} - {self.question[:50]}"
