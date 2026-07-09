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
    jours_ouvres_par_mois = models.IntegerField(
        default=26,
        help_text="Nombre de jours ouvrés de référence par mois (26 au Sénégal/Comores, 22 en France).",
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
    plancher_assiette = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Plancher mensuel de l'assiette (null = depuis 0). Utilisé pour les tranches T2 (ex: Agirc-Arrco T2 France).",
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
# REGLES TRAVAIL : HEURES SUPPLEMENTAIRES, ANCIENNETE, LICENCIEMENT
# ===========================================================================


class TrancheHeureSupplementaire(TimeStampedModel):
    """
    Taux de majoration par tranche d'heures supplémentaires, versionnée par pays.
    Ex: Senegal art. L.140 -- +15% de la 41e a la 48e heure, +40% au-dela.
    """

    pays = models.ForeignKey(Pays, on_delete=models.CASCADE, related_name="tranches_heure_supplementaire")
    heure_debut = models.IntegerField(help_text="Premiere heure de la tranche (ex: 41 pour la 41e heure)")
    heure_fin = models.IntegerField(
        null=True,
        blank=True,
        help_text="Derniere heure incluse (null = sans limite superieure)",
    )
    taux_majoration = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Pourcentage de majoration du taux horaire brut (ex: 25.00 pour +25%)",
    )
    contingent_annuel = models.IntegerField(
        null=True,
        blank=True,
        help_text="Nombre maximal d'heures supplementaires autorisees par an (null = non plafonné)",
    )
    date_debut_validite = models.DateField()
    date_fin_validite = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Tranche d'heure supplémentaire"
        verbose_name_plural = "Tranches d'heures supplémentaires"
        ordering = ["pays", "heure_debut", "-date_debut_validite"]

    def __str__(self) -> str:
        plafond_str = f"{self.heure_fin}h" if self.heure_fin else "∞"
        return f"{self.pays.nom} — HS [{self.heure_debut}h → {plafond_str}] = +{self.taux_majoration}%"


class TranchePrimeAnciennete(TimeStampedModel):
    """
    Taux de prime d'anciennete par tranche d'annees de service, versionnee par pays.
    Base de calcul : salaire de base (ou salaire minimum de la categorie selon convention).
    Ex: Senegal CCIP -- 3% a partir de 3 ans, +3% par tranche de 3 ans jusqu'a 27%.
    """

    pays = models.ForeignKey(Pays, on_delete=models.CASCADE, related_name="tranches_prime_anciennete")
    annees_debut = models.IntegerField(help_text="Annees reevolues ouvrant droit a cette tranche (ex: 3 pour a partir de 3 ans)")
    annees_fin = models.IntegerField(
        null=True,
        blank=True,
        help_text="Derniere annee de la tranche (null = sans limite)",
    )
    taux = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Taux de prime applicable a cette tranche (ex: 3.00 pour 3%)",
    )
    plafond_taux = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Taux maximal cumule pour ce pays (ex: 27.00%). Bloque la progression au-dela.",
    )
    date_debut_validite = models.DateField()
    date_fin_validite = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Tranche de prime d'ancienneté"
        verbose_name_plural = "Tranches de prime d'ancienneté"
        ordering = ["pays", "annees_debut", "-date_debut_validite"]

    def __str__(self) -> str:
        fin_str = f"{self.annees_fin} ans" if self.annees_fin else "∞"
        return f"{self.pays.nom} — Anciennete [{self.annees_debut} → {fin_str}] = {self.taux}%"


class TrancheIndemniteLicenciement(TimeStampedModel):
    """
    Taux de l'indemnite legale de licenciement par tranche d'anciennete, versionnee par pays.
    Le taux s'applique par annee d'anciennete sur la base du salaire mensuel moyen brut.
    Ex: France -- 1/4 mois par annee pour <= 10 ans (= 25%), 1/3 mois au-dela (= 33.33%).
    """

    pays = models.ForeignKey(Pays, on_delete=models.CASCADE, related_name="tranches_indemnite_licenciement")
    annees_debut = models.IntegerField(help_text="Premiere annee de la tranche (ex: 1, ou 11 pour la 2eme tranche)")
    annees_fin = models.IntegerField(
        null=True,
        blank=True,
        help_text="Derniere annee de la tranche incluse (null = sans limite)",
    )
    taux_par_annee = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        help_text="% du salaire mensuel moyen par annee d'anciennete (ex: 25.00 = 1/4 mois)",
    )
    anciennete_minimale_mois = models.IntegerField(
        help_text="Anciennete minimale requise pour ouvrir droit a l'indemnite (en mois)"
    )
    date_debut_validite = models.DateField()
    date_fin_validite = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Tranche d'indemnité de licenciement"
        verbose_name_plural = "Tranches d'indemnité de licenciement"
        ordering = ["pays", "annees_debut", "-date_debut_validite"]

    def __str__(self) -> str:
        fin_str = f"{self.annees_fin} ans" if self.annees_fin else "∞"
        return f"{self.pays.nom} — Licenciement [{self.annees_debut} → {fin_str}] = {self.taux_par_annee}%/an"


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
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "periode"],
                condition=~models.Q(statut="ANNULE"),
                name="unique_bulletin_actif_par_employe_periode",
            )
        ]

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


# ===========================================================================
# COMPENSATIONS & BENEFICES (add-on, hors moteur de paie)
# ===========================================================================


class BenefitPlan(TimeStampedModel):
    """Catalogue des avantages proposés par l'entreprise (assurance santé,
    tickets restaurant, transport, logement, retraite complémentaire...) —
    distinct des allocations fiscales (`AllocationRegle`) qui alimentent le
    calcul de la paie : ici il s'agit d'un module de gestion des avantages
    sociaux/non-monétaires, à l'image du module "Compensations & bénéfices"
    (add-on) proposé par les SIRH concurrents."""

    class Category(models.TextChoices):
        HEALTH = "health", "Assurance santé"
        MEAL = "meal", "Titres-restaurant"
        TRANSPORT = "transport", "Transport"
        HOUSING = "housing", "Logement"
        RETIREMENT = "retirement", "Retraite complémentaire"
        OTHER = "other", "Autre"

    name = models.CharField(max_length=200, verbose_name="Nom")
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER, verbose_name="Catégorie")
    description = models.TextField(blank=True, verbose_name="Description")
    employer_contribution = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        verbose_name="Part employeur (mensuelle)",
    )
    employee_contribution = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        verbose_name="Part salarié (mensuelle)",
    )
    is_active = models.BooleanField(default=True, verbose_name="Actif")

    class Meta:
        ordering = ["category", "name"]
        verbose_name = "Plan d'avantage"
        verbose_name_plural = "Plans d'avantages"

    def __str__(self) -> str:
        return self.name


class EmployeeBenefit(TimeStampedModel):
    """Inscription d'un employé à un plan d'avantage."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Actif"
        PENDING = "pending", "En attente"
        TERMINATED = "terminated", "Résilié"

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="benefits",
    )
    plan = models.ForeignKey(
        BenefitPlan,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, verbose_name="Statut")
    enrolled_at = models.DateField(auto_now_add=True, verbose_name="Date d'inscription")
    terminated_at = models.DateField(null=True, blank=True, verbose_name="Date de résiliation")

    class Meta:
        ordering = ["-enrolled_at"]
        verbose_name = "Inscription à un avantage"
        verbose_name_plural = "Inscriptions aux avantages"
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "plan"],
                condition=~models.Q(status="terminated"),
                name="unique_active_or_pending_benefit_enrollment",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.employee} — {self.plan} ({self.get_status_display()})"
