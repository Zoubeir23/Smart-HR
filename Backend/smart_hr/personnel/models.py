from django.conf import settings
from django.db import models

from smart_hr.core.models import TimeStampedModel


class Department(TimeStampedModel):
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = "Département"
        verbose_name_plural = "Départements"

    def __str__(self):
        return self.name


class Position(TimeStampedModel):
    title = models.CharField(max_length=150)
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="positions",
    )

    class Meta:
        verbose_name = "Poste"
        verbose_name_plural = "Postes"

    def __str__(self):
        return self.title


class Employee(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Actif"
        INACTIVE = "inactive", "Inactif"
        ON_LEAVE = "on_leave", "En congé"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="employee_profile",
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
    )
    position = models.ForeignKey(
        Position,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
    )
    hire_date = models.DateField(null=True, blank=True)
    salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    date_of_birth = models.DateField(null=True, blank=True)
    cin = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    emergency_contact = models.CharField(max_length=200, blank=True)
    churn_risk = models.FloatField(
        null=True,
        blank=True,
        help_text="Score de risque 0-100",
    )

    class Meta:
        verbose_name = "Employé"
        verbose_name_plural = "Employés"

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.position or 'N/A'}"


class Contract(TimeStampedModel):
    class ContractType(models.TextChoices):
        CDI = "CDI", "CDI"
        CDD = "CDD", "CDD"
        STAGE = "STAGE", "Stage"
        FREELANCE = "FREELANCE", "Freelance"

    class ContractStatus(models.TextChoices):
        ACTIVE = "active", "Actif"
        EXPIRED = "expired", "Expiré"
        UPCOMING = "upcoming", "À venir"

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="contracts",
    )
    contract_type = models.CharField(
        max_length=20,
        choices=ContractType.choices,
        default=ContractType.CDI,
    )
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        verbose_name = "Contrat"
        verbose_name_plural = "Contrats"
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.employee} — {self.contract_type} ({self.start_date})"

    @property
    def status(self) -> str:
        from django.utils import timezone
        today = timezone.now().date()
        if self.start_date > today:
            return self.ContractStatus.UPCOMING
        if self.end_date and self.end_date < today:
            return self.ContractStatus.EXPIRED
        return self.ContractStatus.ACTIVE
