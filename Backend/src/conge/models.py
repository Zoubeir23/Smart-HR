from django.conf import settings
from django.db import models

from personnel.models import Employee


class LeaveRequest(models.Model):
    class LeaveType(models.TextChoices):
        VACATION = 'vacation', 'Congé annuel'
        SICK = 'sick', 'Congé maladie'
        PERSONAL = 'personal', 'Congé personnel'
        MATERNITY = 'maternity', 'Congé maternité'
        OTHER = 'other', 'Autre'

    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        APPROVED = 'approved', 'Approuvé'
        REJECTED = 'rejected', 'Refusé'

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='leave_requests',
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
        related_name='approved_leaves',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Demande de congé'
        verbose_name_plural = 'Demandes de congés'
        ordering = ['-created_at']

    def __str__(self):
        return (
            f"{self.employee.user.get_full_name()} - "
            f"{self.get_leave_type_display()} "
            f"({self.start_date} → {self.end_date}) - "
            f"{self.get_status_display()}"
        )

    @property
    def duration_days(self):
        """Return the number of calendar days for this leave."""
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days + 1
        return 0
