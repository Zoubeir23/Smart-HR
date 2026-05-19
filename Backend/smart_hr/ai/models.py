import uuid

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


class InterviewSession(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Actif"
        CLOSED = "closed", "Fermé"

    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    job_position = models.CharField(max_length=255)
    job_description = models.TextField(blank=True)
    duration = models.CharField(max_length=20, default="30 Min")
    interview_type = models.CharField(max_length=50, default="Technique")
    questions = models.JSONField(default=list)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="interview_sessions",
    )
    application = models.ForeignKey(
        "recruitment.Application",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="interview_sessions",
    )

    class Meta:
        verbose_name = "Session d'entretien"
        verbose_name_plural = "Sessions d'entretien"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.job_position} — {self.token}"


class InterviewSessionFeedback(TimeStampedModel):
    session = models.ForeignKey(
        InterviewSession,
        on_delete=models.CASCADE,
        related_name="feedbacks",
    )
    candidate_name = models.CharField(max_length=255)
    candidate_email = models.EmailField()
    conversation = models.JSONField(default=list)
    feedback = models.JSONField(default=dict)
    recommended = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Feedback entretien"
        verbose_name_plural = "Feedbacks entretien"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.candidate_name} — {self.session.job_position}"
