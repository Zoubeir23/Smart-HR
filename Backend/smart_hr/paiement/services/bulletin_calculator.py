"""
Moteur de calcul du bulletin de paie multi-pays.

Pipeline séquentiel :
  1. Salaire brut  (depuis HistoriqueSalaire, validé contre SMIG)
  2. Allocations   (gains en sus du brut, avec seuil d'exonération)
  3. Cotisations   (salariales déductibles / non déductibles ; patronales)
  4. Abattements   (forfait professionnel)
  5. Net imposable
  6. Quotient familial + barème IGR progressif annualisé
  7. Taxe minimale forfaitaire (TRIMF…)
  8. Net à payer
  9. Persistance atomique du BulletinPaie + LigneBulletin
"""

from __future__ import annotations

from decimal import ROUND_DOWN
from decimal import ROUND_FLOOR
from decimal import ROUND_HALF_UP
from decimal import Decimal
from typing import TYPE_CHECKING

from django.db import transaction
from django.db.models import Q

from smart_hr.paiement.models import AbattementRegle
from smart_hr.paiement.models import AllocationEmploye
from smart_hr.paiement.models import BaremeImpot
from smart_hr.paiement.models import BulletinPaie
from smart_hr.paiement.models import ChargesFamiliales
from smart_hr.paiement.models import HistoriqueSalaire
from smart_hr.paiement.models import LigneBulletin
from smart_hr.paiement.models import Pays
from smart_hr.paiement.models import RegleCotisation
from smart_hr.paiement.models import TaxeMinimaleForfaitaire
from smart_hr.presence.models import Attendance

if TYPE_CHECKING:
    from datetime import date

    from smart_hr.personnel.models import Employee


# ---------------------------------------------------------------------------
# Helpers de requête temporelle
# ---------------------------------------------------------------------------


def _filtre_date_active(queryset, date_reference: date):
    """Filtre un queryset sur date_debut_validite <= date <= date_fin_validite."""
    return queryset.filter(
        date_debut_validite__lte=date_reference,
    ).filter(Q(date_fin_validite__isnull=True) | Q(date_fin_validite__gte=date_reference))


def _get_salaire_actif(employee: Employee, date_reference: date) -> Decimal:
    historique = (
        _filtre_date_active(
            HistoriqueSalaire.objects.filter(employee=employee),
            date_reference,
        )
        .order_by("-date_debut")
        .first()
    )
    if historique is None:
        raise ValueError(
            f"Aucun historique de salaire trouvé pour {employee} à la date {date_reference}. "
            "Ajoutez une entrée dans HistoriqueSalaire avant de générer un bulletin."
        )
    return historique.salaire_de_base


def _get_smig_actif(pays: Pays, date_reference: date) -> Decimal | None:
    smig = _filtre_date_active(pays.salaires_minimum.all(), date_reference).order_by("-date_debut_validite").first()
    return smig.valeur if smig else None


def _get_charges_familiales(
    pays: Pays,
    situation_matrimoniale: str,
    nombre_enfants: int,
    date_reference: date,
) -> ChargesFamiliales | None:
    return (
        _filtre_date_active(
            ChargesFamiliales.objects.filter(
                pays=pays,
                situation_matrimoniale__iexact=situation_matrimoniale,
                nombre_enfants=nombre_enfants,
            ),
            date_reference,
        )
        .order_by("-date_debut_validite")
        .first()
    )


# ---------------------------------------------------------------------------
# Arrondi fiscal
# ---------------------------------------------------------------------------


def _appliquer_arrondi(montant: Decimal, pays: Pays) -> Decimal:
    unite = Decimal(pays.arrondi_impot)
    if pays.methode_arrondi == Pays.MethodeArrondi.FLOOR:
        return (montant / unite).to_integral_value(rounding=ROUND_FLOOR) * unite
    return (montant / unite).to_integral_value(rounding=ROUND_HALF_UP) * unite


# ---------------------------------------------------------------------------
# Barème progressif
# ---------------------------------------------------------------------------


def _calculer_impot_progressif(
    pays: Pays,
    revenu_annuel_par_part: Decimal,
    date_reference: date,
) -> Decimal:
    """
    Applique le barème progressif sur le revenu annuel par part.
    Retourne l'impôt annuel pour UNE part (à multiplier ensuite par nombre_parts).
    """
    tranches = _filtre_date_active(
        BaremeImpot.objects.filter(pays=pays).order_by("plancher"),
        date_reference,
    )
    impot = Decimal("0")
    for tranche in tranches:
        if revenu_annuel_par_part <= tranche.plancher:
            break
        plafond_tranche = tranche.plafond if tranche.plafond is not None else revenu_annuel_par_part
        base_taxable = min(revenu_annuel_par_part, plafond_tranche) - tranche.plancher
        impot += base_taxable * tranche.taux / Decimal("100")
    return impot


# ---------------------------------------------------------------------------
# Moteur principal
# ---------------------------------------------------------------------------


def calculer_bulletin(
    employee: Employee,
    periode: date,
) -> tuple[BulletinPaie, list[LigneBulletin]]:
    """
    Calcule un bulletin de paie sans le persister.

    Args:
        employee: L'employé concerné.
        periode: Premier jour du mois de paie (ex: date(2026, 6, 1)).

    Returns:
        (BulletinPaie non sauvegardé, liste de LigneBulletin non sauvegardées)

    Raises:
        ValueError: Si les données de configuration sont manquantes ou incohérentes.
    """
    pays: Pays | None = employee.pays
    if pays is None:
        raise ValueError(
            f"L'employé {employee} n'a pas de pays fiscal renseigné. Renseignez le champ 'pays' avant de générer un bulletin."
        )

    categorie = employee.categorie_convention
    situation_matrimoniale: str = employee.family_status.label if employee.family_status else "Célibataire"
    nombre_enfants: int = employee.nombre_enfants

    lignes: list[LigneBulletin] = []
    ordre = 0

    def nouvelle_ligne(libelle: str, nature: str, base: Decimal, taux: Decimal, montant: Decimal) -> LigneBulletin:
        nonlocal ordre
        ligne = LigneBulletin(
            libelle=libelle,
            nature=nature,
            base=base,
            taux=taux,
            montant=montant,
            ordre_affichage=ordre,
        )
        ordre += 1
        return ligne

    # ── 1. Salaire de base ───────────────────────────────────────────────────
    salaire_de_base = _get_salaire_actif(employee, periode)

    smig = _get_smig_actif(pays, periode)
    if smig and salaire_de_base < smig:
        raise ValueError(
            f"Salaire brut {salaire_de_base} {pays.devise} inférieur au SMIG ({smig} {pays.devise}) pour {pays.nom}."
        )

    lignes.append(
        nouvelle_ligne(
            libelle="Salaire de base",
            nature=LigneBulletin.Nature.GAIN,
            base=Decimal("0"),
            taux=Decimal("0"),
            montant=salaire_de_base,
        )
    )

    salaire_brut = salaire_de_base

    # ── 1b. Déduction absences injustifiées ──────────────────────────────────
    nombre_absences_injustifiees = Attendance.objects.filter(
        employee=employee,
        date__year=periode.year,
        date__month=periode.month,
        status=Attendance.Status.ABSENT,
        absence_type=Attendance.AbsenceType.UNJUSTIFIED,
    ).count()

    retenue_absence = Decimal("0")
    if nombre_absences_injustifiees > 0:
        jours_ouvres = Decimal(str(pays.jours_ouvres_par_mois))
        taux_journalier = (salaire_de_base / jours_ouvres).quantize(Decimal("1"), rounding=ROUND_DOWN)
        retenue_absence = taux_journalier * nombre_absences_injustifiees
        salaire_brut -= retenue_absence
        lignes.append(
            nouvelle_ligne(
                libelle=f"Retenue absence injustifiée ({nombre_absences_injustifiees} j.)",
                nature=LigneBulletin.Nature.RETENUE,
                base=salaire_de_base,
                taux=Decimal("0"),
                montant=-retenue_absence,
            )
        )

    # Salaire effectivement perçu : base pour toutes les assiettes fiscales et sociales aval.
    salaire_base_effectif = salaire_de_base - retenue_absence

    # ── 2. Allocations personnelles ──────────────────────────────────────────
    total_allocations_imposables = Decimal("0")
    total_allocations_cotisables = Decimal("0")

    attributions = (
        AllocationEmploye.objects.filter(
            employee=employee,
            date_debut__lte=periode,
        )
        .filter(Q(date_fin__isnull=True) | Q(date_fin__gte=periode))
        .select_related("regle")
    )

    for attribution in attributions:
        montant_allocation = attribution.montant_effectif
        regle = attribution.regle
        seuil = regle.seuil_exoneration
        excedent = max(montant_allocation - seuil, Decimal("0"))

        montant_imposable = excedent * regle.taux_imposable_excedent / Decimal("100")
        montant_cotisable = excedent * regle.taux_cotisable_excedent / Decimal("100")

        salaire_brut += montant_allocation
        total_allocations_imposables += montant_imposable
        total_allocations_cotisables += montant_cotisable

        lignes.append(
            nouvelle_ligne(
                libelle=regle.nom_allocation,
                nature=LigneBulletin.Nature.GAIN,
                base=montant_allocation,
                taux=Decimal("0"),
                montant=montant_allocation,
            )
        )

    # ── 3. Cotisations ───────────────────────────────────────────────────────
    cotisations = _filtre_date_active(
        RegleCotisation.objects.filter(pays=pays).filter(Q(categorie__isnull=True) | Q(categorie=categorie)),
        periode,
    ).order_by("nom_cotisation")

    total_cotisations_salariales = Decimal("0")
    total_cotisations_salariales_deductibles = Decimal("0")
    total_cotisations_patronales = Decimal("0")
    snapshot_cotisations = []

    for cotisation in cotisations:
        assiette_brute = salaire_base_effectif + total_allocations_cotisables

        # Calcul de l'assiette en tenant compte du plancher et du plafond.
        # Le plancher sert aux cotisations sur tranche (ex: Agirc-Arrco T2 France) :
        # la cotisation ne porte que sur la fraction du salaire AU-DESSUS du plancher.
        if cotisation.plancher_assiette and assiette_brute <= cotisation.plancher_assiette:
            assiette = Decimal("0")
        elif cotisation.plancher_assiette:
            tranche_au_dessus_plancher = assiette_brute - cotisation.plancher_assiette
            if cotisation.plafond_assiette:
                assiette = min(tranche_au_dessus_plancher, cotisation.plafond_assiette - cotisation.plancher_assiette)
            else:
                assiette = tranche_au_dessus_plancher
        elif cotisation.plafond_assiette:
            assiette = min(assiette_brute, cotisation.plafond_assiette)
        else:
            assiette = assiette_brute

        montant_salarial = (assiette * cotisation.taux_salarial / Decimal("100")).quantize(Decimal("1"), rounding=ROUND_DOWN)
        montant_patronal = (assiette * cotisation.taux_patronal / Decimal("100")).quantize(Decimal("1"), rounding=ROUND_DOWN)

        if montant_salarial > 0:
            lignes.append(
                nouvelle_ligne(
                    libelle=cotisation.nom_cotisation,
                    nature=LigneBulletin.Nature.RETENUE,
                    base=assiette,
                    taux=cotisation.taux_salarial,
                    montant=-montant_salarial,
                )
            )
            total_cotisations_salariales += montant_salarial
            if cotisation.est_deductible_base_imposable:
                total_cotisations_salariales_deductibles += montant_salarial

        if montant_patronal > 0:
            lignes.append(
                nouvelle_ligne(
                    libelle=f"{cotisation.nom_cotisation} (patronal)",
                    nature=LigneBulletin.Nature.INFO,
                    base=assiette,
                    taux=cotisation.taux_patronal,
                    montant=montant_patronal,
                )
            )
            total_cotisations_patronales += montant_patronal

        snapshot_cotisations.append(
            {
                "id": cotisation.pk,
                "nom": cotisation.nom_cotisation,
                "taux_salarial": str(cotisation.taux_salarial),
                "taux_patronal": str(cotisation.taux_patronal),
                "plancher_assiette": str(cotisation.plancher_assiette) if cotisation.plancher_assiette else None,
                "plafond_assiette": str(cotisation.plafond_assiette) if cotisation.plafond_assiette else None,
            }
        )

    # ── 4. Taxe minimale forfaitaire (TRIMF…) ────────────────────────────────
    taxes_minimales = _filtre_date_active(
        TaxeMinimaleForfaitaire.objects.filter(pays=pays).order_by("plancher"),
        periode,
    )
    montant_taxe_minimale = Decimal("0")
    for taxe in taxes_minimales:
        plancher_ok = salaire_brut >= taxe.plancher
        plafond_ok = taxe.plafond is None or salaire_brut <= taxe.plafond
        if plancher_ok and plafond_ok:
            montant_taxe_minimale = taxe.montant_mensuel
            break

    if montant_taxe_minimale > 0:
        lignes.append(
            nouvelle_ligne(
                libelle="Taxe minimale forfaitaire",
                nature=LigneBulletin.Nature.RETENUE,
                base=salaire_brut,
                taux=Decimal("0"),
                montant=-montant_taxe_minimale,
            )
        )

    # ── 5. Abattements professionnels ────────────────────────────────────────
    abattements = _filtre_date_active(
        AbattementRegle.objects.filter(pays=pays),
        periode,
    )
    total_abattement_mensuel = Decimal("0")

    for abattement in abattements:
        base_abatt = salaire_base_effectif + total_allocations_imposables

        if abattement.taux:
            montant_abatt = base_abatt * abattement.taux / Decimal("100")
        elif abattement.montant_fixe:
            montant_abatt = abattement.montant_fixe
        else:
            continue

        if abattement.plafond_annuel:
            montant_abatt = min(montant_abatt, abattement.plafond_annuel / 12)
        if abattement.plancher_annuel:
            montant_abatt = max(montant_abatt, abattement.plancher_annuel / 12)

        total_abattement_mensuel += montant_abatt

    # ── 6. Net imposable ─────────────────────────────────────────────────────
    net_imposable = (
        salaire_base_effectif + total_allocations_imposables - total_cotisations_salariales_deductibles - total_abattement_mensuel
    )
    net_imposable = max(net_imposable, Decimal("0"))

    # ── 7. Impôt progressif (annualisé + quotient familial) ──────────────────
    charges = _get_charges_familiales(pays, situation_matrimoniale, nombre_enfants, periode)
    nombre_parts = charges.nombre_parts if charges else Decimal("1")
    reduction_impot_annuelle = charges.reduction_impot_fixe if charges else Decimal("0")

    net_imposable_annuel = net_imposable * 12
    revenu_par_part_annuel = net_imposable_annuel / nombre_parts

    impot_annuel_par_part = _calculer_impot_progressif(pays, revenu_par_part_annuel, periode)
    impot_annuel = impot_annuel_par_part * nombre_parts - reduction_impot_annuelle
    impot_annuel = max(impot_annuel, Decimal("0"))
    impot_annuel = _appliquer_arrondi(impot_annuel, pays)

    impot_mensuel = (impot_annuel / 12).quantize(Decimal("1"), rounding=ROUND_DOWN)

    if impot_mensuel > 0:
        lignes.append(
            nouvelle_ligne(
                libelle="Impôt sur le revenu (IGR)",
                nature=LigneBulletin.Nature.RETENUE,
                base=net_imposable,
                taux=Decimal("0"),
                montant=-impot_mensuel,
            )
        )

    # ── 8. Net à payer ───────────────────────────────────────────────────────
    net_a_payer = salaire_brut - total_cotisations_salariales - montant_taxe_minimale - impot_mensuel

    regles_snapshot = {
        "periode": str(periode),
        "pays": pays.nom,
        "nombre_parts": str(nombre_parts),
        "cotisations": snapshot_cotisations,
    }

    bulletin = BulletinPaie(
        employee=employee,
        periode=periode,
        salaire_brut=salaire_brut,
        cotisations_salariales=total_cotisations_salariales + montant_taxe_minimale,
        cotisations_patronales=total_cotisations_patronales,
        net_imposable=net_imposable,
        impot=impot_mensuel,
        net_a_payer=net_a_payer,
        statut=BulletinPaie.Statut.BROUILLON,
        regles_snapshot=regles_snapshot,
    )

    return bulletin, lignes


@transaction.atomic
def emettre_bulletin(employee: Employee, periode: date) -> BulletinPaie:
    """
    Calcule et persiste le bulletin de paie de manière atomique.
    Lève une ValueError si un bulletin non-annulé existe déjà pour cette période.
    """
    bulletin_existant = (
        BulletinPaie.objects.filter(
            employee=employee,
            periode=periode,
        )
        .exclude(statut=BulletinPaie.Statut.ANNULE)
        .first()
    )

    if bulletin_existant:
        raise ValueError(
            f"Un bulletin {bulletin_existant.statut} existe déjà pour "
            f"{employee} — {periode:%Y-%m}. Annulez-le avant de recalculer."
        )

    bulletin, lignes = calculer_bulletin(employee, periode)
    bulletin.save()

    for ligne in lignes:
        ligne.bulletin = bulletin
    LigneBulletin.objects.bulk_create(lignes)

    return bulletin


@transaction.atomic
def creer_bulletin_correctif(bulletin_original: BulletinPaie) -> BulletinPaie:
    """
    Annule un bulletin émis et crée un nouveau bulletin corrigé.
    Suit la règle comptable d'extourne : jamais de suppression, toujours un correctif.
    """
    if bulletin_original.statut not in (
        BulletinPaie.Statut.EMIS,
        BulletinPaie.Statut.VALIDE,
    ):
        raise ValueError(f"Seuls les bulletins EMIS ou VALIDES peuvent être corrigés. Statut actuel : {bulletin_original.statut}")

    bulletin_original.statut = BulletinPaie.Statut.ANNULE
    bulletin_original.save()

    nouveau_bulletin, lignes = calculer_bulletin(bulletin_original.employee, bulletin_original.periode)
    nouveau_bulletin.bulletin_remplace = bulletin_original
    nouveau_bulletin.save()

    for ligne in lignes:
        ligne.bulletin = nouveau_bulletin
    LigneBulletin.objects.bulk_create(lignes)

    return nouveau_bulletin
