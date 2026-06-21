from django.conf import settings
from django.db import models

from smart_hr.core.models import TimeStampedModel


class Formation(TimeStampedModel):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    instructor = models.CharField(max_length=255)

    class Meta:
        ordering = ["-start_date"]
        verbose_name = "Formation"
        verbose_name_plural = "Formations"

    def __str__(self):
        return self.title


class Meeting(TimeStampedModel):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    formation = models.ForeignKey(
        Formation,
        on_delete=models.CASCADE,
        related_name="meetings",
    )
    title = models.CharField(max_length=255)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    meeting_link = models.URLField(null=True, blank=True)  # noqa: DJ001
    status = models.CharField(
        max_length=50,
        choices=Status.choices,
        default=Status.SCHEDULED,
    )

    class Meta:
        ordering = ["-start_time"]
        verbose_name = "Réunion"
        verbose_name_plural = "Réunions"

    def __str__(self):
        return f"Meeting: {self.title} for {self.formation.title} ({self.start_time})"


class Participation(TimeStampedModel):
    class Status(models.TextChoices):
        ENROLLED = "enrolled", "Inscrit"
        COMPLETED = "completed", "Terminé"
        ABSENT = "absent", "Absent"

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="training_participations",
        verbose_name="Employé",
    )
    formation = models.ForeignKey(
        Formation,
        on_delete=models.CASCADE,
        related_name="participations",
        verbose_name="Formation",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ENROLLED,
        verbose_name="Statut",
    )
    enrolled_at = models.DateField(auto_now_add=True, verbose_name="Date d'inscription")
    completed_at = models.DateField(null=True, blank=True, verbose_name="Date de complétion")
    notes = models.TextField(blank=True, verbose_name="Observations")

    class Meta:
        unique_together = [("employee", "formation")]
        ordering = ["-enrolled_at"]
        verbose_name = "Participation"
        verbose_name_plural = "Participations"

    def __str__(self) -> str:
        return f"{self.employee} → {self.formation.title} ({self.get_status_display()})"


class ZoomToken(TimeStampedModel):
    access_token = models.TextField()
    refresh_token = models.TextField()
    expires_in = models.CharField(max_length=50)
    token_type = models.CharField(max_length=50)
    scope = models.CharField(max_length=255)

    class Meta:
        verbose_name = "Zoom Token"
        verbose_name_plural = "Zoom Tokens"

    def __str__(self):
        return f"Zoom Token: {self.created_at}"
