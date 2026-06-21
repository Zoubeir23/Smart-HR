from django.db import models

from smart_hr.core.models import TimeStampedModel
from smart_hr.personnel.models import Employee


class Attendance(TimeStampedModel):
    """Modèle représentant la présence quotidienne d'un employé."""

    class Status(models.TextChoices):
        PRESENT = "present", "Présent"
        ABSENT = "absent", "Absent"
        LATE = "late", "En retard"
        HALF_DAY = "half_day", "Demi-journée"

    class AbsenceType(models.TextChoices):
        JUSTIFIED = "justified", "Absence signalée"
        UNJUSTIFIED = "unjustified", "Absence non signalée"

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="attendances",
    )
    date = models.DateField()
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PRESENT,
    )
    absence_type = models.CharField(
        max_length=12,
        choices=AbsenceType.choices,
        blank=True,
        default="",
        help_text="Renseigné uniquement si statut = Absent.",
    )
    note = models.TextField(blank=True)

    class Meta:
        verbose_name = "Présence"
        verbose_name_plural = "Présences"
        ordering = ["-date", "employee"]
        unique_together = ["employee", "date"]

    def __str__(self):
        return f"{self.employee} — {self.date} ({self.get_status_display()})"
