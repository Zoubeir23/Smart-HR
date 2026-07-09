from django.conf import settings
from django.db import IntegrityError
from django.db import models
from django.db import transaction
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
    """Génère un matricule unique au format EMP-YYYY-NNNN.

    Utilise select_for_update() pour sérialiser les lectures concurrentes et
    éviter les doublons de matricule sous charge. Doit être appelé depuis un
    bloc transaction.atomic().
    """
    year = timezone.now().year
    last = Employee.objects.select_for_update().filter(matricule__startswith=f"EMP-{year}-").order_by("id").last()
    sequence = int(last.matricule.split("-")[-1]) + 1 if last else 1
    return f"EMP-{year}-{sequence:04d}"


class Employee(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Actif"
        INACTIVE = "inactive", "Inactif"
        ON_LEAVE = "on_leave", "En conge"
        SUSPENDED = "suspended", "Suspendu"
        TERMINATED = "terminated", "Contrat termine"

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
    # --- Champs moteur de paie multi-pays ---
    pays = models.ForeignKey(
        "paiement.Pays",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employes",
        help_text="Pays fiscal de rattachement (détermine les règles de cotisation et d'imposition)",
    )
    categorie_convention = models.ForeignKey(
        "paiement.CategorieConvention",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employes",
        help_text="Statut salarial : Cadre, Non-Cadre… (impacte les plafonds de cotisation)",
    )
    nombre_enfants = models.IntegerField(
        default=0,
        help_text="Nombre d'enfants à charge (utilisé pour le quotient familial IGR)",
    )
    is_department_manager = models.BooleanField(
        default=False,
        help_text="Designe cet employe comme responsable de son departement (N+1).",
    )
    anonymized = models.BooleanField(
        default=False,
        help_text="True si les donnees personnelles ont ete purgees (RGPD droit a l'oubli).",
    )

    class Meta:
        verbose_name = "Employe"
        verbose_name_plural = "Employés"

    def __str__(self) -> str:
        return f"{self.user.get_full_name()} - {self.position or 'N/A'}"

    def save(self, *args, **kwargs) -> None:
        if not self.matricule:
            for _attempt in range(5):
                try:
                    with transaction.atomic():
                        self.matricule = _generate_matricule()
                        super().save(*args, **kwargs)
                    return
                except IntegrityError:
                    self.matricule = ""
            raise RuntimeError(
                "Impossible de générer un matricule unique après 5 tentatives.",
            )
        super().save(*args, **kwargs)


class FamilyMember(TimeStampedModel):
    """Membre de la famille d'un employé (conjoint ou enfant)."""

    class Relationship(models.TextChoices):
        SPOUSE = "spouse", "Conjoint(e)"
        CHILD = "child", "Enfant"

    class Gender(models.TextChoices):
        MALE = "M", "Masculin"
        FEMALE = "F", "Féminin"

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="family_members",
    )
    relationship = models.CharField(
        max_length=10,
        choices=Relationship.choices,
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=1,
        choices=Gender.choices,
        blank=True,
    )

    class Meta:
        verbose_name = "Membre de la famille"
        verbose_name_plural = "Membres de la famille"
        ordering = ["relationship", "date_of_birth"]

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name} ({self.get_relationship_display()})"


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

    def clean(self) -> None:
        from django.core.exceptions import ValidationError

        if self.contract_type == self.ContractType.CDI and self.end_date:
            raise ValidationError({"end_date": "Un CDI ne peut pas avoir de date de fin."})

    @property
    def status(self) -> str:
        from django.utils import timezone

        today = timezone.now().date()
        if self.start_date > today:
            return self.ContractStatus.UPCOMING
        if self.end_date and self.end_date < today:
            return self.ContractStatus.EXPIRED
        return self.ContractStatus.ACTIVE


# ---------------------------------------------------------------------------
# Programmes d'intégration / départ
# ---------------------------------------------------------------------------


class OnboardingProgram(TimeStampedModel):
    """Programme structuré d'intégration (onboarding) ou de départ (offboarding)
    assigné à un employé — une liste d'étapes à cocher au fur et à mesure."""

    class ProgramType(models.TextChoices):
        ONBOARDING = "onboarding", "Intégration"
        OFFBOARDING = "offboarding", "Départ"

    class Status(models.TextChoices):
        IN_PROGRESS = "in_progress", "En cours"
        COMPLETED = "completed", "Terminé"

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="onboarding_programs",
    )
    program_type = models.CharField(max_length=15, choices=ProgramType.choices)
    title = models.CharField(max_length=200)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.IN_PROGRESS)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_onboarding_programs",
    )
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Programme d'intégration/départ"
        verbose_name_plural = "Programmes d'intégration/départ"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.employee} — {self.get_program_type_display()} : {self.title}"

    def refresh_status(self) -> None:
        """Marque le programme terminé quand toutes ses étapes sont cochées."""
        all_completed = self.steps.exists() and not self.steps.filter(is_completed=False).exists()
        if all_completed and self.status != self.Status.COMPLETED:
            self.status = self.Status.COMPLETED
            self.completed_at = timezone.now()
            self.save(update_fields=["status", "completed_at", "updated_at"])
        elif not all_completed and self.status != self.Status.IN_PROGRESS:
            self.status = self.Status.IN_PROGRESS
            self.completed_at = None
            self.save(update_fields=["status", "completed_at", "updated_at"])


class OnboardingStep(TimeStampedModel):
    """Étape individuelle d'un programme d'intégration/départ."""

    program = models.ForeignKey(
        OnboardingProgram,
        on_delete=models.CASCADE,
        related_name="steps",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Étape du programme"
        verbose_name_plural = "Étapes du programme"
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return f"{self.program} — {self.title}"


# ---------------------------------------------------------------------------
# OKR — Objectives & Key Results
# ---------------------------------------------------------------------------


class Objective(TimeStampedModel):
    """Objectif OKR sur une période donnée (ex: "Q1 2026"), en cascade sur 3
    niveaux : Entreprise → Département → Individu. Un objectif de niveau
    inférieur peut être rattaché à un objectif parent de niveau supérieur via
    `parent`, matérialisant la cascade stratégique.

    La progression et le statut sont dérivés des Key Results rattachés,
    jamais saisis manuellement (source de vérité unique)."""

    class Status(models.TextChoices):
        NOT_STARTED = "not_started", "Non démarré"
        IN_PROGRESS = "in_progress", "En cours"
        COMPLETED = "completed", "Atteint"

    class Level(models.TextChoices):
        COMPANY = "company", "Entreprise"
        DEPARTMENT = "department", "Département"
        INDIVIDUAL = "individual", "Individuel"

    level = models.CharField(max_length=20, choices=Level.choices, default=Level.INDIVIDUAL, verbose_name="Niveau")
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="objectives",
        null=True,
        blank=True,
        help_text="Requis uniquement pour les objectifs de niveau Individuel.",
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="objectives",
        null=True,
        blank=True,
        help_text="Requis uniquement pour les objectifs de niveau Département.",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
        help_text="Objectif de niveau supérieur dont celui-ci découle (cascade).",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    period = models.CharField(max_length=50, help_text="Ex: Q1 2026")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_objectives",
    )

    class Meta:
        verbose_name = "Objectif OKR"
        verbose_name_plural = "Objectifs OKR"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        owner = self.employee or self.department or "Entreprise"
        return f"[{self.get_level_display()}] {owner} — {self.title} ({self.period})"

    @property
    def progress(self) -> int:
        """Moyenne de la progression de chaque Key Result, arrondie (0-100)."""
        key_results = list(self.key_results.all())
        if not key_results:
            return 0
        total = sum(kr.progress for kr in key_results)
        return round(total / len(key_results))

    @property
    def status(self) -> str:
        key_results = list(self.key_results.all())
        if not key_results:
            return self.Status.NOT_STARTED
        if all(kr.progress >= 100 for kr in key_results):
            return self.Status.COMPLETED
        if any(kr.current_value > 0 for kr in key_results):
            return self.Status.IN_PROGRESS
        return self.Status.NOT_STARTED


class KeyResult(TimeStampedModel):
    """Résultat clé mesurable rattaché à un objectif (ex: "Signer 5 clients")."""

    objective = models.ForeignKey(
        Objective,
        on_delete=models.CASCADE,
        related_name="key_results",
    )
    title = models.CharField(max_length=200)
    unit = models.CharField(max_length=30, blank=True, help_text="Ex: %, clients, jours")
    target_value = models.DecimalField(max_digits=12, decimal_places=2)
    current_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Résultat clé"
        verbose_name_plural = "Résultats clés"
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return f"{self.objective} — {self.title}"

    @property
    def progress(self) -> int:
        """Pourcentage d'avancement (0-100), capé même en cas de dépassement."""
        if self.target_value <= 0:
            return 0
        ratio = (self.current_value / self.target_value) * 100
        return min(round(ratio), 100)


class CareerPath(TimeStampedModel):
    """Parcours de carrière type (ex: "Parcours Directeur Général") : suite ordonnée
    de postes représentant une trajectoire d'évolution possible dans l'entreprise."""

    title = models.CharField(max_length=200, verbose_name="Titre")
    description = models.TextField(blank=True, verbose_name="Description")

    class Meta:
        ordering = ["title"]
        verbose_name = "Parcours de carrière"
        verbose_name_plural = "Parcours de carrière"

    def __str__(self) -> str:
        return self.title


class CareerPathStep(TimeStampedModel):
    """Étape (poste) d'un parcours de carrière, ordonnée."""

    career_path = models.ForeignKey(
        CareerPath,
        on_delete=models.CASCADE,
        related_name="steps",
    )
    position = models.ForeignKey(
        Position,
        on_delete=models.CASCADE,
        related_name="career_path_steps",
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = [("career_path", "order")]
        ordering = ["career_path", "order"]
        verbose_name = "Étape de parcours"
        verbose_name_plural = "Étapes de parcours"

    def __str__(self) -> str:
        return f"{self.career_path} — étape {self.order} ({self.position})"


class SuccessionPlan(TimeStampedModel):
    """Plan de succession pour un poste clé — matrice de talents identifiant les
    successeurs potentiels et leur niveau de préparation."""

    position = models.OneToOneField(
        Position,
        on_delete=models.CASCADE,
        related_name="succession_plan",
    )
    notes = models.TextField(blank=True, verbose_name="Notes")

    class Meta:
        ordering = ["position__title"]
        verbose_name = "Plan de succession"
        verbose_name_plural = "Plans de succession"

    def __str__(self) -> str:
        return f"Succession — {self.position}"


class SuccessionCandidate(TimeStampedModel):
    """Successeur potentiel identifié pour un poste, avec son niveau de préparation."""

    class Readiness(models.TextChoices):
        READY_NOW = "ready_now", "Prêt immédiatement"
        READY_1_2_YEARS = "ready_1_2_years", "Prêt dans 1-2 ans"
        READY_3_5_YEARS = "ready_3_5_years", "Prêt dans 3-5 ans"

    plan = models.ForeignKey(
        SuccessionPlan,
        on_delete=models.CASCADE,
        related_name="candidates",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="succession_candidacies",
    )
    readiness = models.CharField(max_length=20, choices=Readiness.choices, default=Readiness.READY_3_5_YEARS)
    notes = models.TextField(blank=True, verbose_name="Notes")

    class Meta:
        unique_together = [("plan", "employee")]
        ordering = ["plan", "readiness"]
        verbose_name = "Successeur potentiel"
        verbose_name_plural = "Successeurs potentiels"

    def __str__(self) -> str:
        return f"{self.employee} → {self.plan.position} ({self.get_readiness_display()})"
