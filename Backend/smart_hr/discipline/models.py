from django.conf import settings
from django.db import models

from smart_hr.core.models import TimeStampedModel
from smart_hr.personnel.models import Employee


class DisciplinaryAction(TimeStampedModel):
    """Enregistrement d'une action disciplinaire émise envers un employé."""

    class ActionType(models.TextChoices):
        REPRIMAND = "reprimand", "Rappel à l'ordre"
        WARNING = "warning", "Avertissement écrit"
        SUSPENSION = "suspension", "Mise à pied"
        DISMISSAL = "dismissal", "Licenciement disciplinaire"

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="disciplinary_actions",
    )
    action_type = models.CharField(
        max_length=20,
        choices=ActionType.choices,
    )
    reason = models.CharField(
        max_length=255,
        help_text="Motif de la sanction (ex : absence injustifiée répétée).",
    )
    description = models.TextField(
        blank=True,
        help_text="Détails de la procédure disciplinaire.",
    )
    incident_date = models.DateField(
        help_text="Date de l'incident ou du manquement constaté.",
    )
    issued_date = models.DateField(
        help_text="Date d'émission du document officiel.",
    )
    suspension_start = models.DateField(
        null=True,
        blank=True,
        help_text="Renseigné uniquement si action_type = suspension.",
    )
    suspension_end = models.DateField(
        null=True,
        blank=True,
        help_text="Renseigné uniquement si action_type = suspension.",
    )
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="issued_disciplinary_actions",
    )
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = "Action disciplinaire"
        verbose_name_plural = "Actions disciplinaires"
        ordering = ["-issued_date", "-created_at"]

    def __str__(self) -> str:
        return f"{self.get_action_type_display()} — {self.employee} ({self.issued_date})"

    def save(self, *args, **kwargs) -> None:
        is_new = self.pk is None
        previous_action_type = None
        if not is_new:
            previous_action_type = DisciplinaryAction.objects.filter(pk=self.pk).values_list("action_type", flat=True).first()

        super().save(*args, **kwargs)

        action_type_changed = is_new or (previous_action_type != self.action_type)
        if not action_type_changed:
            return

        if self.action_type == self.ActionType.SUSPENSION:
            Employee.objects.filter(pk=self.employee_id).update(status=Employee.Status.SUSPENDED)
        elif self.action_type == self.ActionType.DISMISSAL:
            Employee.objects.filter(pk=self.employee_id).update(status=Employee.Status.TERMINATED)
        elif previous_action_type in (self.ActionType.SUSPENSION, self.ActionType.DISMISSAL):
            # L'action a été reclassifiée vers un type sans impact sur le statut :
            # on ne peut restaurer qu'à ACTIVE si aucune autre sanction active ne justifie SUSPENDED/TERMINATED.
            has_other_blocking_action = (
                DisciplinaryAction.objects.filter(
                    employee_id=self.employee_id,
                    action_type__in=[self.ActionType.SUSPENSION, self.ActionType.DISMISSAL],
                )
                .exclude(pk=self.pk)
                .exists()
            )
            if not has_other_blocking_action:
                Employee.objects.filter(pk=self.employee_id).update(status=Employee.Status.ACTIVE)

    @property
    def suspension_duration_days(self) -> int | None:
        """Durée de la mise à pied en jours calendaires."""
        if self.action_type == self.ActionType.SUSPENSION and self.suspension_start and self.suspension_end:
            return (self.suspension_end - self.suspension_start).days + 1
        return None
