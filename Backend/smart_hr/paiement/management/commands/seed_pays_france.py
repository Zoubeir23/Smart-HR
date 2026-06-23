"""
Commande de seeding des règles de cotisations sociales pour la France (secteur privé, 2024).

Sources officielles :
- CNAV (retraite base) : salarial 6,90% / patronal 8,55% — plafond T1 = 3 864 €/mois (1×PSS)
- Agirc-Arrco T1 (retraite complémentaire) : salarial 3,15% / patronal 4,72% — jusqu'au PSS
- Agirc-Arrco T2 (retraite complémentaire) : salarial 8,64% / patronal 12,95%
  — plancher 3 864 € (1×PSS), plafond 30 912 € (8×PSS)
- Assurance maladie : salarial 0% / patronal 13% (taux plein, sans plafond)

Périmètre : secteur privé uniquement. Les régimes fonction publique (CNRACL) ne sont pas inclus.
L'IR/PAS (prélèvement à la source) sera implémenté séparément via BaremeImpot.

Usage :
    python manage.py seed_pays_france
    python manage.py seed_pays_france --reset
"""

from __future__ import annotations

import datetime
from decimal import Decimal

from django.core.management.base import BaseCommand

from smart_hr.paiement.models import CategorieConvention
from smart_hr.paiement.models import Pays
from smart_hr.paiement.models import RegleCotisation
from smart_hr.paiement.models import SalaireMinimum

DATE_DEBUT = datetime.date(2024, 1, 1)

# Plafond mensuel de la Sécurité Sociale 2024 (valeur officielle URSSAF)
PLAFOND_SECURITE_SOCIALE = Decimal("3864")
PLAFOND_AGIRC_T2 = PLAFOND_SECURITE_SOCIALE * 8  # 30 912 €


class Command(BaseCommand):
    help = "Initialise les cotisations sociales France (secteur privé) pour 2024."

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
        self._log("SMIC", "1 766,92 €/mois (SMIC 2024 au 1er janvier)", smig_created)

        # ── Cotisations sociales secteur privé ────────────────────────────────
        # (nom, code, taux_sal, taux_pat, plancher, plafond, deductible)
        cotisations = [
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

        self.stdout.write(
            self.style.SUCCESS(
                "\n✓ Seeding France terminé. Cotisations sociales secteur privé 2024 chargées."
                "\n  Barème IR/PAS et charges familiales à implémenter séparément."
            )
        )

    def _log(self, model: str, nom: str, created: bool) -> None:
        status = self.style.SUCCESS("créé") if created else self.style.WARNING("existait déjà")
        self.stdout.write(f"  [{model}] {nom} — {status}")
