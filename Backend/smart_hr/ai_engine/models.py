from django.db import models

from smart_hr.core.models import TimeStampedModel
from smart_hr.personnel.models import Employee


class ChurnPrediction(TimeStampedModel):
    class RiskLevel(models.TextChoices):
        LOW = "low", "Faible"
        MEDIUM = "medium", "Moyen"
        HIGH = "high", "Élevé"

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="churn_predictions",
    )
    risk_score = models.FloatField(help_text="Score de risque 0-100")
    risk_level = models.CharField(max_length=10, choices=RiskLevel.choices)
    main_risk_factor = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Cause principale affichée à l'utilisateur",
    )
    factors = models.JSONField(default=list, help_text="Top-3 facteurs de risque")
    recommendations = models.JSONField(default=list, help_text="Recommandations")

    class Meta:
        verbose_name = "Prédiction Churn"
        verbose_name_plural = "Prédictions Churn"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.employee} - {self.risk_score}% ({self.get_risk_level_display()})"
