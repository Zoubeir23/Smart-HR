from django.conf import settings
from django.db import models

from smart_hr.core.models import TimeStampedModel


class ChatHistory(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_history",
    )
    question = models.TextField()
    response = models.TextField()
    action_type = models.CharField(max_length=50, blank=True, default="")
    action_data = models.JSONField(default=dict)

    class Meta:
        verbose_name = "Historique Chat"
        verbose_name_plural = "Historiques Chat"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} - {self.question[:50]}"
