from __future__ import annotations

from decimal import Decimal

from django.db import models

from smart_hr.core.models import TimeStampedModel
from smart_hr.personnel.models import Employee

# ===========================================================================
# REFERENTIELS PAYS
# ===========================================================================


class Pays(TimeStampedModel):
    """Zone géographique avec ses paramètres fiscaux de base."""

    class MethodeArrondi(models.TextChoices):
        FLOOR = "FLOOR", "Troncature (plancher)"
        ROUND = "ROUND", "Arrondi standard"

    nom = models.CharField(max_length=100, unique=True)
    code_iso = models.CharField(max_length=3, unique=True, help_text="XOF, EUR, KMF…")
    devise = models.CharField(max_length=10)
    arrondi_impot = models.IntegerField(
        default=1,
        help_text="Unité d'arrondi de l'impôt (1=euro/unité, 100=centaine FCFA)",
    )
    methode_arrondi = models.CharField(
        max_length=10,
        choices=MethodeArrondi.choices,
        default=MethodeArrondi.ROUND,
    )

    class Meta:
        verbose_name = "Pays"
        verbose_name_plural = "Pays"
        ordering = ["nom"]

    def __str__(self) -> str:
        return f"{self.nom} ({self.devise})"


class CategorieConvention(TimeStampedModel):
    """Statut salarial impactant les règles de cotisation (Cadre, Non-Cadre…)."""

    nom = models.CharField(max_length=100)
    pays = models.ForeignKey(Pays, on_delete=models.CASCADE, related_name="categories_convention")

    class Meta:
        verbose_name = "Catégorie / Convention"
        verbose_name_plural = "Catégories / Conventions"
        unique_together = ["nom", "pays"]
        ordering = ["pays", "nom"]

    def __str__(self) -> str:
        return f"{self.nom} ({self.pays.nom})"


class SalaireMinimum(TimeStampedModel):
    """SMIG / SMIC par pays, versionné dans le temps."""

    pays = models.ForeignKey(Pays, on_delete=models.CASCADE, related_name="salaires_minimum")
    valeur = models.DecimalField(max_digits=12, decimal_places=2)
    date_debut_validite = models.DateField()
    date_fin_validite = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Salaire minimum"
        verbose_name_plural = "Salaires minimum"
        ordering = ["pays", "-date_debut_validite"]

    def __str__(self) -> str:
        return f"SMIG {self.pays.nom} — {self.valeur} {self.pays.devise} (à partir du {self.date_debut_validite})"


# ===========================================================================
# REGLES FISCALES ET SOCIALES
# ===========================================================================


class RegleCotisation(TimeStampedModel):
    """
    Cotisation sociale : IPRES, CSS, URSSAF…
    Versionnée par pays + date, optionnellement restreinte à une catégorie.
    """

    pays = models.ForeignKey(Pays, on_delete=models.CASCADE, related_name="regles_cotisation")
    categorie = models.ForeignKey(
        CategorieConvention,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="regles_cotisation",
        help_text="Laisser vide si la règle s'applique à toutes les catégories",
    )
    nom_cotisation = models.CharField(max_length=150)
    code_declaration = models.CharField(
        max_length=30,
        blank=True,
        help_text="Code officiel pour DSN, bordereau IPRES… (ex: S21.G00.81.001)",
    )
    taux_salarial = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    taux_patronal = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    plafond_assiette = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Plafond mensuel de l'assiette de calcul (null = déplafonné)",
    )
    est_deductible_base_imposable = models.BooleanField(
        default=True,
        help_text="Si False, la retenue n'est pas déductible de l'assiette IGR (ex: TRIMF)",
    )
    date_debut_validite = models.DateField()
    date_fin_validite = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Règle de cotisation"
        verbose_name_plural = "Règles de cotisation"
        ordering = ["pays", "nom_cotisation", "-date_debut_validite"]

    def __str__(self) -> str:
        return f"{self.nom_cotisation} ({self.pays.nom}) — sal. {self.taux_salarial}% / pat. {self.taux_patronal}%"


class BaremeImpot(TimeStampedModel):
    """Tranche de l'impôt progressif (IGR, IR, PAS…), versionnée."""

    pays = models.ForeignKey(Pays, on_delete=models.CASCADE, related_name="baremes_impot")
    plancher = models.DecimalField(max_digits=14, decimal_places=2)
    plafond = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    taux = models.DecimalField(max_digits=5, decimal_places=2)
    date_debut_validite = models.DateField()
    date_fin_validite = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Barème d'impôt"
        verbose_name_plural = "Barèmes d'impôt"
        ordering = ["pays", "-date_debut_validite", "plancher"]

    def __str__(self) -> str:
        plafond_str = f"{self.plafond}" if self.plafond else "∞"
        return f"{self.pays.nom} — [{self.plancher} → {plafond_str}] à {self.taux}%"


class TaxeMinimaleForfaitaire(TimeStampedModel):
    """
    Taxe forfaitaire mensuelle par tranche de salaire brut (ex: TRIMF Sénégal).
    Distincte du barème progressif : montant fixe, non proportionnel.
    """

    pays = models.ForeignKey(Pays, on_delete=models.CASCADE, related_name="taxes_minimales")
    plancher = models.DecimalField(max_digits=12, decimal_places=2)
    plafond = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    montant_mensuel = models.DecimalField(max_digits=10, decimal_places=2)
    est_deductible_base_imposable = models.BooleanField(default=False)
    date_debut_validite = models.DateField()
    date_fin_validite = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Taxe minimale forfaitaire"
        verbose_name_plural = "Taxes minimales forfaitaires"
        ordering = ["pays", "-date_debut_validite", "plancher"]

    def __str__(self) -> str:
        plafond_str = f"{self.plafond}" if self.plafond else "∞"
        return f"TMF {self.pays.nom} — [{self.plancher} → {plafond_str}] = {self.montant_mensuel} {self.pays.devise}/mois"


class ChargesFamiliales(TimeStampedModel):
    """
    Quotient familial / parts fiscales par situation matrimoniale et nombre d'enfants.
    Versionnée pour respecter la non-rétroactivité.
    """

    pays = models.ForeignKey(Pays, on_delete=models.CASCADE, related_name="charges_familiales")
    situation_matrimoniale = models.CharField(
        max_length=50,
        help_text="Doit correspondre à FamilyStatus.label (ex: Célibataire, Marié(e))",
    )
    nombre_enfants = models.IntegerField()
    nombre_parts = models.DecimalField(max_digits=4, decimal_places=1)
    reduction_impot_fixe = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        help_text="Réduction annuelle fixe après application du barème par part",
    )
    date_debut_validite = models.DateField()
    date_fin_validite = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Charges familiales"
        verbose_name_plural = "Charges familiales"
        unique_together = ["pays", "situation_matrimoniale", "nombre_enfants", "date_debut_validite"]
        ordering = ["pays", "situation_matrimoniale", "nombre_enfants"]

    def __str__(self) -> str:
        return f"{self.pays.nom} — {self.situation_matrimoniale}, {self.nombre_enfants} enfant(s) → {self.nombre_parts} part(s)"


class AbattementRegle(TimeStampedModel):
    """Abattements professionnels déductibles du revenu imposable."""

    pays = models.ForeignKey(Pays, on_delete=models.CASCADE, related_name="abattements")
    nom = models.CharField(max_length=150)
    taux = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Taux en %, ex: 30.00 pour l'abattement forfaitaire sénégalais",
    )
    montant_fixe = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    plafond_annuel = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Plafond annuel (sera converti en mensuel dans le calcul)",
    )
    plancher_annuel = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Plancher annuel minimum garanti (ex: 900 000 FCFA au Sénégal)",
    )
    date_debut_validite = models.DateField()
    date_fin_validite = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Règle d'abattement"
        verbose_name_plural = "Règles d'abattement"
        ordering = ["pays", "nom"]

    def __str__(self) -> str:
        return f"{self.nom} ({self.pays.nom})"


class AllocationRegle(TimeStampedModel):
    """Règle nationale d'exonération partielle ou totale d'une prime/indemnité."""

    pays = models.ForeignKey(Pays, on_delete=models.CASCADE, related_name="allocations_regles")
    nom_allocation = models.CharField(max_length=100, help_text="Transport, Panier, Logement…")
    seuil_exoneration = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        help_text="Montant mensuel exonéré. Au-delà, l'excédent est réintégré.",
    )
    taux_imposable_excedent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("100"),
        help_text="% de l'excédent réintégré dans l'assiette IGR",
    )
    taux_cotisable_excedent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("100"),
        help_text="% de l'excédent soumis aux cotisations sociales",
    )
    date_debut_validite = models.DateField()
    date_fin_validite = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Règle d'allocation"
        verbose_name_plural = "Règles d'allocation"
        ordering = ["pays", "nom_allocation"]

    def __str__(self) -> str:
        return f"{self.nom_allocation} ({self.pays.nom}) — exonéré jusqu'à {self.seuil_exoneration}"


# ===========================================================================
# SUIVI SALARIAL EMPLOYE
# ===========================================================================


class HistoriqueSalaire(TimeStampedModel):
    """
    Versioning du salaire de base.
    Remplace le champ statique Employee.salary pour garantir la non-rétroactivité.
    """

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="historique_salaires",
    )
    salaire_de_base = models.DecimalField(max_digits=12, decimal_places=2)
    date_debut = models.DateField()
    date_fin = models.DateField(null=True, blank=True, help_text="null = salaire en vigueur")
    motif = models.CharField(max_length=200, blank=True, help_text="Promotion, augmentation annuelle…")

    class Meta:
        verbose_name = "Historique de salaire"
        verbose_name_plural = "Historiques de salaire"
        ordering = ["employee", "-date_debut"]

    def __str__(self) -> str:
        return f"{self.employee} — {self.salaire_de_base} à partir du {self.date_debut}"


class AllocationEmploye(TimeStampedModel):
    """Attribution d'une allocation à un employé, avec montant personnalisé optionnel."""

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="allocations_employee",
    )
    regle = models.ForeignKey(
        AllocationRegle,
        on_delete=models.PROTECT,
        related_name="attributions",
    )
    montant_personnalise = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Si renseigné, remplace le montant standard de la règle",
    )
    date_debut = models.DateField()
    date_fin = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Allocation employé"
        verbose_name_plural = "Allocations employé"
        ordering = ["employee", "regle"]

    def __str__(self) -> str:
        return f"{self.employee} — {self.regle.nom_allocation}"

    @property
    def montant_effectif(self) -> Decimal:
        return self.montant_personnalise if self.montant_personnalise is not None else self.regle.seuil_exoneration


# ===========================================================================
# BULLETIN DE PAIE
# ===========================================================================


class BulletinPaie(TimeStampedModel):
    """
    Bulletin de paie généré par le moteur de calcul.
    Immuable une fois verrouillé — toute correction crée un bulletin correctif.
    """

    class Statut(models.TextChoices):
        BROUILLON = "BROUILLON", "Brouillon"
        VALIDE = "VALIDE", "Validé"
        EMIS = "EMIS", "Émis"
        VERROUILLE = "VERROUILLE", "Verrouillé"
        ANNULE = "ANNULE", "Annulé"

    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="bulletins_paie",
    )
    periode = models.DateField(help_text="Premier jour du mois de paie (ex: 2026-06-01)")
    salaire_brut = models.DecimalField(max_digits=12, decimal_places=2)
    cotisations_salariales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cotisations_patronales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_imposable = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    impot = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_a_payer = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    statut = models.CharField(max_length=15, choices=Statut.choices, default=Statut.BROUILLON)
    regles_snapshot = models.JSONField(
        default=dict,
        help_text="Snapshot JSON des règles actives utilisées — garantit l'auditabilité",
    )
    bulletin_remplace = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bulletins_correctifs",
        help_text="Bulletin original annulé que ce bulletin vient corriger",
    )

    class Meta:
        verbose_name = "Bulletin de paie"
        verbose_name_plural = "Bulletins de paie"
        ordering = ["-periode", "employee"]
        unique_together = ["employee", "periode"]

    def save(self, *args, **kwargs) -> None:
        if self.pk and self.statut == self.Statut.VERROUILLE:
            raise ValueError(
                f"Le bulletin {self.pk} est verrouillé. Créez un bulletin correctif plutôt que de modifier celui-ci."
            )
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"Bulletin {self.employee} — {self.periode:%Y-%m} [{self.statut}]"


class LigneBulletin(models.Model):
    """
    Ligne détaillée d'un bulletin de paie.
    Permet l'impression, l'export comptable et les déclarations sociales.
    """

    class Nature(models.TextChoices):
        GAIN = "GAIN", "Gain"
        RETENUE = "RETENUE", "Retenue"
        INFO = "INFO", "Informatif"

    bulletin = models.ForeignKey(
        BulletinPaie,
        on_delete=models.CASCADE,
        related_name="lignes",
    )
    libelle = models.CharField(max_length=150)
    nature = models.CharField(max_length=10, choices=Nature.choices)
    base = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    taux = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    montant = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Positif pour les gains, négatif pour les retenues",
    )
    ordre_affichage = models.IntegerField(default=0)

    class Meta:
        verbose_name = "Ligne de bulletin"
        verbose_name_plural = "Lignes de bulletin"
        ordering = ["bulletin", "ordre_affichage"]

    def __str__(self) -> str:
        return f"{self.libelle} : {self.montant}"


# ===========================================================================
# COMPATIBILITE ASCENDANTE (ancien modèle — conservé, ne pas supprimer)
# ===========================================================================


class Payroll(TimeStampedModel):
    """Fiche de paie simplifiée — conservée pour compatibilité ascendante."""

    class Status(models.TextChoices):
        PENDING = "pending", "En attente"
        PROCESSED = "processed", "Traité"
        PAID = "paid", "Payé"

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="payrolls")
    month = models.CharField(max_length=7, help_text="Format YYYY-MM, ex: 2026-01")
    base_salary = models.DecimalField(max_digits=12, decimal_places=2)
    bonuses = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_salary = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)

    class Meta:
        verbose_name = "Fiche de paie (legacy)"
        verbose_name_plural = "Fiches de paie (legacy)"
        ordering = ["-month", "employee"]
        unique_together = ["employee", "month"]

    def save(self, *args, **kwargs) -> None:
        self.net_salary = self.base_salary + self.bonuses - self.deductions
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.employee} — {self.month} ({self.get_status_display()})"
