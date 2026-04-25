from django.conf import settings
from django.db import models

from smart_hr.core.models import TimeStampedModel


class JobOffer(TimeStampedModel):
    class JobType(models.TextChoices):
        FULL_TIME = "full_time", "Temps plein"
        PART_TIME = "part_time", "Temps partiel"
        CONTRACT = "contract", "Contrat"
        INTERNSHIP = "internship", "Stage"

    class Status(models.TextChoices):
        OPEN = "open", "Ouvert"
        CLOSED = "closed", "Fermé"

    title = models.CharField(max_length=255)
    department = models.CharField(max_length=150)
    location = models.CharField(max_length=200, blank=True)
    job_type = models.CharField(max_length=20, choices=JobType.choices, default=JobType.FULL_TIME)
    description = models.TextField()
    requirements = models.TextField(blank=True, help_text="One requirement per line")
    salary_range = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )

    class Meta:
        verbose_name = "Offre d'emploi"
        verbose_name_plural = "Offres d'emploi"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"

    @property
    def applications_count(self):
        return self.applications.count()

    @property
    def requirements_list(self):
        return [r.strip() for r in self.requirements.split("\n") if r.strip()]


class Application(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "En attente"
        REVIEWING = "reviewing", "En cours de revue"
        INTERVIEW = "interview", "Entretien planifié"
        ACCEPTED = "accepted", "Accepté"
        REJECTED = "rejected", "Rejeté"

    job_offer = models.ForeignKey(JobOffer, on_delete=models.CASCADE, related_name="applications")
    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="applications",
    )
    cv = models.FileField(upload_to="cvs/")
    cover_letter = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    matching_score = models.FloatField(null=True, blank=True)
    skills_extracted = models.JSONField(default=list, blank=True)
    ai_summary = models.TextField(blank=True)

    class Meta:
        verbose_name = "Candidature"
        verbose_name_plural = "Candidatures"
        ordering = ["-created_at"]
        unique_together = ["job_offer", "candidate"]

    def __str__(self):
        return f"{self.candidate.get_full_name()} → {self.job_offer.title}"
