"""
Commande de seeding des règles fiscales et sociales pour la France (secteur privé, 2024).

Sources officielles :
- SMIC : 1 766,92 €/mois (1er janvier 2024)
- CNAV (retraite base) : salarial 6,90% / patronal 8,55% -- plafond 3 864 EUR/mois (1xPSS)
- Agirc-Arrco T1 : salarial 3,15% / patronal 4,72% -- jusqu'au PSS
- Agirc-Arrco T2 : salarial 8,64% / patronal 12,95% -- de 3 864 EUR a 30 912 EUR (8xPSS)
- Assurance maladie : salarial 0% / patronal 13% (taux plein, deplafonne)
- Bareme IR 2024 (revenus 2023, par part, source DGFiP) :
  * 0 - 11 294 EUR : 0%   * 11 295 - 28 797 EUR : 11%   * 28 798 - 82 341 EUR : 30%
  * 82 342 - 177 106 EUR : 41%   * > 177 106 EUR : 45%
- Abattement professionnel : 10% du revenu brut, plancher 448 €, plafond 12 829 €/an (2024)
- Quotient familial : couple +2 parts, chaque enfant +0,5 part (3ème +1 part)

Périmètre : secteur privé uniquement. CNRACL (fonctionnaires) non inclus.

Usage :
    python manage.py seed_pays_france
    python manage.py seed_pays_france --reset
"""

from __future__ import annotations

import datetime
from decimal import Decimal

from django.core.management.base import BaseCommand

from smart_hr.paiement.models import AbattementRegle
from smart_hr.paiement.models import BaremeImpot
from smart_hr.paiement.models import CategorieConvention
from smart_hr.paiement.models import ChargesFamiliales
from smart_hr.paiement.models import Pays
from smart_hr.paiement.models import RegleCotisation
from smart_hr.paiement.models import SalaireMinimum

DATE_DEBUT = datetime.date(2024, 1, 1)

# Plafond mensuel de la Sécurité Sociale 2024 (URSSAF)
PLAFOND_SECURITE_SOCIALE = Decimal("3864")
PLAFOND_AGIRC_T2 = PLAFOND_SECURITE_SOCIALE * 8  # 30 912 €


class Command(BaseCommand):
    help = "Initialise les règles fiscales et sociales France (secteur privé) pour 2024."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Supprime les données existantes avant de recréer",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write("Suppression des données existantes pour la France…")
            Pays.objects.filter(code_iso="EUR", nom="France").delete()
            self.stdout.write(self.style.WARNING("Données supprimées."))

        # ── Pays ─────────────────────────────────────────────────────────────
        france, created = Pays.objects.get_or_create(
            code_iso="EUR",
            defaults={
                "nom": "France",
                "devise": "EUR",
                "arrondi_impot": 1,
                "methode_arrondi": Pays.MethodeArrondi.ROUND,
            },
        )
        france.nom = "France"
        france.devise = "EUR"
        france.arrondi_impot = 1
        france.methode_arrondi = Pays.MethodeArrondi.ROUND
        france.save()
        self._log("Pays", "France", created)

        # ── Catégories de convention ──────────────────────────────────────────
        _, created = CategorieConvention.objects.get_or_create(nom="Non-Cadre", pays=france)
        self._log("Catégorie", "Non-Cadre", created)

        _, created = CategorieConvention.objects.get_or_create(nom="Cadre", pays=france)
        self._log("Catégorie", "Cadre", created)

        # ── Salaire minimum (SMIC) ────────────────────────────────────────────
        _, smig_created = SalaireMinimum.objects.get_or_create(
            pays=france,
            date_debut_validite=DATE_DEBUT,
            defaults={"valeur": Decimal("1766.92")},
        )
        self._log("SMIC", "1 766,92 €/mois (au 1er janvier 2024)", smig_created)

        # ── Cotisations sociales secteur privé ────────────────────────────────
        cotisations = [
            # (nom, code, taux_sal, taux_pat, plancher, plafond, deductible)
            (
                "CNAV — Retraite de base (T1)",
                "CNAV-T1",
                Decimal("6.90"),
                Decimal("8.55"),
                None,
                PLAFOND_SECURITE_SOCIALE,
                True,
            ),
            (
                "Agirc-Arrco — Retraite complémentaire T1",
                "ARRCO-T1",
                Decimal("3.15"),
                Decimal("4.72"),
                None,
                PLAFOND_SECURITE_SOCIALE,
                True,
            ),
            (
                "Agirc-Arrco — Retraite complémentaire T2",
                "ARRCO-T2",
                Decimal("8.64"),
                Decimal("12.95"),
                PLAFOND_SECURITE_SOCIALE,
                PLAFOND_AGIRC_T2,
                True,
            ),
            (
                "Assurance maladie",
                "MALADIE",
                Decimal("0.00"),
                Decimal("13.00"),
                None,
                None,
                False,
            ),
        ]

        for nom, code, taux_sal, taux_pat, plancher, plafond, deductible in cotisations:
            _, created = RegleCotisation.objects.get_or_create(
                pays=france,
                nom_cotisation=nom,
                date_debut_validite=DATE_DEBUT,
                defaults={
                    "code_declaration": code,
                    "taux_salarial": taux_sal,
                    "taux_patronal": taux_pat,
                    "plancher_assiette": plancher,
                    "plafond_assiette": plafond,
                    "est_deductible_base_imposable": deductible,
                },
            )
            self._log("Cotisation", nom, created)

        # ── Barème IR 2024 (par part fiscale, revenus annuels) ────────────────
        # Source : DGFiP, barème progressif applicable aux revenus 2023
        ir_tranches = [
            # (plancher, plafond, taux%)
            (Decimal("0"), Decimal("11294"), Decimal("0")),
            (Decimal("11294"), Decimal("28797"), Decimal("11")),
            (Decimal("28797"), Decimal("82341"), Decimal("30")),
            (Decimal("82341"), Decimal("177106"), Decimal("41")),
            (Decimal("177106"), None, Decimal("45")),
        ]

        for plancher, plafond, taux in ir_tranches:
            BaremeImpot.objects.get_or_create(
                pays=france,
                plancher=plancher,
                date_debut_validite=DATE_DEBUT,
                defaults={"plafond": plafond, "taux": taux},
            )
        self._log("IR", "5 tranches chargées (barème DGFiP 2024)", True)

        # ── Abattement professionnel ──────────────────────────────────────────
        # 10% du revenu brut imposable, plancher 448 € et plafond 12 829 €/an (2024)
        AbattementRegle.objects.get_or_create(
            pays=france,
            nom="Abattement forfaitaire professionnel",
            date_debut_validite=DATE_DEBUT,
            defaults={
                "taux": Decimal("10"),
                "plafond_annuel": Decimal("12829"),
                "plancher_annuel": Decimal("448"),
            },
        )
        self._log("Abattement", "10% (plancher 448 € / plafond 12 829 €/an)", True)

        # ── Quotient familial (parts fiscales IR) ─────────────────────────────
        # Règles standard 2024 : couple = 2 parts, +0,5 par enfant (1er et 2ème),
        # +1 part à partir du 3ème enfant.
        charges = [
            # (situation, nb_enfants, nb_parts, reduction_fixe)
            ("Célibataire", 0, Decimal("1.0"), Decimal("0")),
            ("Divorcé(e)", 0, Decimal("1.0"), Decimal("0")),
            ("Veuf(ve)", 0, Decimal("1.0"), Decimal("0")),
            ("Marié(e)", 0, Decimal("2.0"), Decimal("0")),
            ("Célibataire", 1, Decimal("1.5"), Decimal("0")),
            ("Célibataire", 2, Decimal("2.0"), Decimal("0")),
            ("Célibataire", 3, Decimal("3.0"), Decimal("0")),
            ("Célibataire", 4, Decimal("4.0"), Decimal("0")),
            ("Marié(e)", 1, Decimal("2.5"), Decimal("0")),
            ("Marié(e)", 2, Decimal("3.0"), Decimal("0")),
            ("Marié(e)", 3, Decimal("4.0"), Decimal("0")),
            ("Marié(e)", 4, Decimal("5.0"), Decimal("0")),
        ]

        for situation, nb_enfants, nb_parts, reduction in charges:
            ChargesFamiliales.objects.get_or_create(
                pays=france,
                situation_matrimoniale=situation,
                nombre_enfants=nb_enfants,
                date_debut_validite=DATE_DEBUT,
                defaults={"nombre_parts": nb_parts, "reduction_impot_fixe": reduction},
            )
        self._log("Charges familiales", f"{len(charges)} configurations chargées", True)

        self.stdout.write(self.style.SUCCESS("\n✓ Seeding France terminé. Règles fiscales et sociales 2024 prêtes."))

    def _log(self, model: str, nom: str, created: bool) -> None:
        status = self.style.SUCCESS("créé") if created else self.style.WARNING("existait déjà")
        self.stdout.write(f"  [{model}] {nom} — {status}")
