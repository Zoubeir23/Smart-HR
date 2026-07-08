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
        "personnel.Employee",
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

    def save(self, *args, **kwargs):
        """Renseigne/efface automatiquement completed_at selon le statut,
        seule source fiable pour calculer le taux de complétion des formations."""
        if self.status == self.Status.COMPLETED and self.completed_at is None:
            from django.utils import timezone

            self.completed_at = timezone.now().date()
        elif self.status != self.Status.COMPLETED:
            self.completed_at = None
        super().save(*args, **kwargs)


class TrainingProvider(TimeStampedModel):
    """Annuaire des organismes/cabinets de formation — internes ou externes,
    avec leurs spécialités, remplaçant le suivi ad hoc sous Excel."""

    class ProviderType(models.TextChoices):
        INTERNAL = "internal", "Interne"
        EXTERNAL = "external", "Externe"

    name = models.CharField(max_length=200, verbose_name="Nom")
    provider_type = models.CharField(
        max_length=20,
        choices=ProviderType.choices,
        default=ProviderType.EXTERNAL,
        verbose_name="Type",
    )
    contact_name = models.CharField(max_length=150, blank=True, verbose_name="Contact")
    phone = models.CharField(max_length=30, blank=True, verbose_name="Téléphone")
    email = models.EmailField(blank=True, verbose_name="E-mail")
    website = models.URLField(blank=True, verbose_name="Site web")
    specialties = models.TextField(blank=True, verbose_name="Spécialités")

    class Meta:
        ordering = ["name"]
        verbose_name = "Fournisseur de formation"
        verbose_name_plural = "Fournisseurs de formation"

    def __str__(self) -> str:
        return self.name


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
