from __future__ import annotations

from django.core.validators import MaxValueValidator
from django.core.validators import MinValueValidator
from django.db import models

from smart_hr.core.models import TimeStampedModel
from smart_hr.personnel.models import Employee


class Skill(TimeStampedModel):
    class SkillCategory(models.TextChoices):
        TECHNICAL = "technical", "Technique"
        MANAGERIAL = "managerial", "Managériale"
        LINGUISTIC = "linguistic", "Linguistique"
        BEHAVIORAL = "behavioral", "Comportementale"
        OTHER = "other", "Autre"

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="skills",
        verbose_name="Employé",
    )
    name = models.CharField(max_length=100, verbose_name="Compétence")
    category = models.CharField(
        max_length=20,
        choices=SkillCategory.choices,
        default=SkillCategory.TECHNICAL,
        verbose_name="Catégorie",
    )
    level = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name="Niveau (1-5)",
        help_text="1 = débutant, 5 = expert",
    )
    notes = models.TextField(blank=True, verbose_name="Observations")

    class Meta:
        unique_together = [("employee", "name")]
        ordering = ["employee", "category", "name"]
        verbose_name = "Compétence"
        verbose_name_plural = "Compétences"

    def __str__(self) -> str:
        return f"{self.employee} — {self.name} (niveau {self.level})"


class PerformanceEvaluation(TimeStampedModel):
    class EvaluationStatus(models.TextChoices):
        DRAFT = "draft", "Brouillon"
        SUBMITTED = "submitted", "Soumise"
        APPROVED = "approved", "Validée"

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="performance_evaluations",
        verbose_name="Employé évalué",
    )
    reviewer = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conducted_evaluations",
        verbose_name="Évaluateur",
    )
    year = models.PositiveSmallIntegerField(verbose_name="Année")
    objectives = models.TextField(verbose_name="Objectifs fixés")
    achievements = models.TextField(blank=True, verbose_name="Réalisations")
    global_score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True,
        blank=True,
        verbose_name="Score global (0-100)",
    )
    status = models.CharField(
        max_length=20,
        choices=EvaluationStatus.choices,
        default=EvaluationStatus.DRAFT,
        verbose_name="Statut",
    )
    comments = models.TextField(blank=True, verbose_name="Commentaires")

    class Meta:
        unique_together = [("employee", "year")]
        ordering = ["-year", "employee"]
        verbose_name = "Évaluation de performance"
        verbose_name_plural = "Évaluations de performance"

    def __str__(self) -> str:
        return f"Évaluation {self.year} — {self.employee}"
