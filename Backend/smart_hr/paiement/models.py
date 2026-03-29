from django.db import models

from smart_hr.core.models import TimeStampedModel
from smart_hr.personnel.models import Employee


class Payroll(TimeStampedModel):
    """Modèle représentant une fiche de paie mensuelle."""

    class Status(models.TextChoices):
        PENDING = "pending", "En attente"
        PROCESSED = "processed", "Traité"
        PAID = "paid", "Payé"

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="payrolls",
    )
    month = models.CharField(
        max_length=7,
        help_text="Format YYYY-MM, ex: 2026-01",
    )
    base_salary = models.DecimalField(max_digits=12, decimal_places=2)
    bonuses = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_salary = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )

    class Meta:
        verbose_name = "Fiche de paie"
        verbose_name_plural = "Fiches de paie"
        ordering = ["-month", "employee"]
        unique_together = ["employee", "month"]

    def save(self, *args, **kwargs):
        self.net_salary = self.base_salary + self.bonuses - self.deductions
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.employee} — {self.month} ({self.get_status_display()})"
