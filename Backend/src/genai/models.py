from django.conf import settings
from django.db import models


class ChatHistory(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_history'
    )
    question = models.TextField()
    response = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Historique Chat'
        verbose_name_plural = 'Historiques Chat'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} - {self.question[:50]}"
