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


class SkillDefinition(TimeStampedModel):
    """Référentiel de compétences de l'entreprise — catalogue centralisé maintenu par
    les RH, servant de base standardisée aux compétences attribuées aux employés
    (évite la fragmentation de saisie libre : "Python" / "python" / "Python3")."""

    name = models.CharField(max_length=100, unique=True, verbose_name="Compétence")
    category = models.CharField(
        max_length=20,
        choices=Skill.SkillCategory.choices,
        default=Skill.SkillCategory.TECHNICAL,
        verbose_name="Catégorie",
    )
    description = models.TextField(blank=True, verbose_name="Description")

    class Meta:
        ordering = ["category", "name"]
        verbose_name = "Référentiel de compétence"
        verbose_name_plural = "Référentiel de compétences"

    def __str__(self) -> str:
        return self.name


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


class Feedback360(TimeStampedModel):
    """Feedback qualitatif entre collègues (évaluation 360°), qualifié par des tags
    prédéfinis (disponibilité, patience, anticipation...) plutôt qu'une note chiffrée,
    complémentaire à l'évaluation annuelle de performance."""

    class Tag(models.TextChoices):
        AVAILABILITY = "availability", "Disponibilité"
        PATIENCE = "patience", "Patience"
        ANTICIPATION = "anticipation", "Anticipation"
        RESPECT = "respect", "Respect"
        EMOTIONAL_INTELLIGENCE = "emotional_intelligence", "Intelligence émotionnelle"
        OPEN_MINDEDNESS = "open_mindedness", "Ouverture d'esprit"

    author = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="feedback_360_given",
        verbose_name="Auteur",
    )
    recipient = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="feedback_360_received",
        verbose_name="Destinataire",
    )
    context = models.CharField(max_length=255, blank=True, verbose_name="Contexte")
    comment = models.TextField(verbose_name="Commentaire")
    tags = models.JSONField(default=list, verbose_name="Tags")

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Feedback 360°"
        verbose_name_plural = "Feedbacks 360°"

    def __str__(self) -> str:
        return f"Feedback {self.author} → {self.recipient}"
