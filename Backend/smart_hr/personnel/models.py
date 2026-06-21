from django.conf import settings
from django.db import models
from django.utils import timezone

from smart_hr.core.models import TimeStampedModel


# ---------------------------------------------------------------------------
# Tables de référence système
# ---------------------------------------------------------------------------


class Nationality(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name = "Nationalité"
        verbose_name_plural = "Nationalités"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class FamilyStatus(TimeStampedModel):
    label = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name = "Situation familiale"
        verbose_name_plural = "Situations familiales"
        ordering = ["label"]

    def __str__(self) -> str:
        return self.label


class Diploma(TimeStampedModel):
    label = models.CharField(max_length=150, unique=True)

    class Meta:
        verbose_name = "Diplôme"
        verbose_name_plural = "Diplômes"
        ordering = ["label"]

    def __str__(self) -> str:
        return self.label


class DepartureReason(TimeStampedModel):
    label = models.CharField(max_length=150, unique=True)

    class Meta:
        verbose_name = "Motif de départ"
        verbose_name_plural = "Motifs de départ"
        ordering = ["label"]

    def __str__(self) -> str:
        return self.label


# ---------------------------------------------------------------------------
# Hiérarchie structurelle : Département ➔ Service ➔ Poste
# ---------------------------------------------------------------------------


class Department(TimeStampedModel):
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = "Département"
        verbose_name_plural = "Départements"

    def __str__(self) -> str:
        return self.name


class Service(TimeStampedModel):
    """Niveau intermédiaire entre Département et Poste."""

    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="services",
    )

    class Meta:
        verbose_name = "Service"
        verbose_name_plural = "Services"
        ordering = ["department__name", "name"]

    def __str__(self) -> str:
        return f"{self.department.name} / {self.name}"


class Position(TimeStampedModel):
    """Poste opérationnel rattaché à un Service."""

    class ProfileType(models.TextChoices):
        EXECUTIVE = "cadre", "Cadre"
        NON_EXECUTIVE = "non_cadre", "Non-cadre"

    title = models.CharField(max_length=150)
    service = models.ForeignKey(
        Service,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="positions",
    )
    profile_type = models.CharField(
        max_length=20,
        choices=ProfileType.choices,
        default=ProfileType.NON_EXECUTIVE,
    )
    indicative_salary = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Salaire indicatif pour ce poste",
    )

    class Meta:
        verbose_name = "Poste"
        verbose_name_plural = "Postes"

    def __str__(self) -> str:
        return self.title

    @property
    def department(self) -> "Department | None":
        """Remonte au département via le service."""
        return self.service.department if self.service else None


# ---------------------------------------------------------------------------
# Employé
# ---------------------------------------------------------------------------


def _generate_matricule() -> str:
    """Génère un matricule unique au format EMP-YYYY-NNNN."""
    year = timezone.now().year
    last = Employee.objects.filter(matricule__startswith=f"EMP-{year}-").order_by("matricule").last()
    if last:
        sequence = int(last.matricule.split("-")[-1]) + 1
    else:
        sequence = 1
    return f"EMP-{year}-{sequence:04d}"


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
    matricule = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        help_text="Matricule unique auto-généré (EMP-YYYY-NNNN)",
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
    )
    service = models.ForeignKey(
        Service,
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
    cnss_number = models.CharField(max_length=50, blank=True, help_text="Numéro CNSS")
    address = models.TextField(blank=True)
    emergency_contact = models.CharField(max_length=200, blank=True)
    nationality = models.ForeignKey(
        Nationality,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
    )
    family_status = models.ForeignKey(
        FamilyStatus,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
    )
    diploma = models.ForeignKey(
        Diploma,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
    )
    churn_risk = models.FloatField(
        null=True,
        blank=True,
        help_text="Score de risque 0-100",
    )
    is_department_manager = models.BooleanField(
        default=False,
        help_text="Désigne cet employé comme responsable de son département (N+1).",
    )

    class Meta:
        verbose_name = "Employé"
        verbose_name_plural = "Employés"

    def __str__(self) -> str:
        return f"{self.user.get_full_name()} - {self.position or 'N/A'}"

    def save(self, *args, **kwargs) -> None:
        if not self.matricule:
            self.matricule = _generate_matricule()
        super().save(*args, **kwargs)


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
