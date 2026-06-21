from django.conf import settings
from django.db import models

from smart_hr.core.models import TimeStampedModel
from smart_hr.personnel.models import Employee

DEDUCTIBLE_LEAVE_TYPES = {"vacation", "personal"}


class LeaveRequest(TimeStampedModel):
    class LeaveType(models.TextChoices):
        VACATION = "vacation", "Congé annuel"
        SICK = "sick", "Congé maladie"
        PERSONAL = "personal", "Congé personnel"
        MATERNITY = "maternity", "Congé maternité"
        EXCEPTIONAL = "exceptional", "Permission exceptionnelle"
        WEDDING = "wedding", "Congé mariage"
        MOVING = "moving", "Congé déménagement"
        OTHER = "other", "Autre"

    class Status(models.TextChoices):
        PENDING = "pending", "En attente"
        APPROVED = "approved", "Approuvé"
        REJECTED = "rejected", "Refusé"

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="leave_requests",
    )
    leave_type = models.CharField(
        max_length=20,
        choices=LeaveType.choices,
        default=LeaveType.VACATION,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_leaves",
    )

    class Meta:
        verbose_name = "Demande de congé"
        verbose_name_plural = "Demandes de congés"
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.employee.user.get_full_name()} - "
            f"{self.get_leave_type_display()} "
            f"({self.start_date} → {self.end_date}) - "
            f"{self.get_status_display()}"
        )

    @property
    def duration_days(self) -> int:
        """Nombre de jours calendaires (week-ends inclus)."""
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days + 1
        return 0

    @property
    def duration_working_days(self) -> int:
        """Nombre de jours ouvrés (lundi-vendredi uniquement)."""
        if not self.start_date or not self.end_date:
            return 0
        from datetime import timedelta

        count = 0
        current = self.start_date
        while current <= self.end_date:
            if current.weekday() < 5:  # 0=lundi … 4=vendredi
                count += 1
            current += timedelta(days=1)
        return count

    @property
    def is_deductible(self) -> bool:
        """True si ce type de congé est déductible du solde annuel."""
        return self.leave_type in DEDUCTIBLE_LEAVE_TYPES
