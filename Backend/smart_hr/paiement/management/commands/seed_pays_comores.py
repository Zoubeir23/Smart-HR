"""
Commande de seeding des règles fiscales et sociales pour les Comores (secteur privé, 2024).

Sources officielles :
- SMIG : 60 000 KMF/mois (décret n°23-057/PR du 22 mai 2023, en vigueur en 2024)
- CSS (vieillesse) : salarial 4,0% / patronal 8,0% — plafond 300 000 KMF/mois
  (Code sécurité sociale, loi n°83-018/PR et arrêté d'application CSS Comores)
- Assurance maladie : aucun régime obligatoire en 2024
- ITS (barème mensuel) : Code Général des Impôts (loi n°11-003/AU), tranches converties en annuel :
  * 0 - 1 440 000 KMF : 0%
  * 1 440 001 - 3 600 000 KMF : 10%
  * 3 600 001 - 6 000 000 KMF : 15%
  * 6 000 001 - 12 000 000 KMF : 20%
  * > 12 000 000 KMF : 25%

Périmètre : secteur privé uniquement.

Usage :
    python manage.py seed_pays_comores
    python manage.py seed_pays_comores --reset
"""

from __future__ import annotations

import datetime
from decimal import Decimal

from django.core.management.base import BaseCommand

from smart_hr.paiement.models import BaremeImpot
from smart_hr.paiement.models import CategorieConvention
from smart_hr.paiement.models import ChargesFamiliales
from smart_hr.paiement.models import Pays
from smart_hr.paiement.models import RegleCotisation
from smart_hr.paiement.models import SalaireMinimum

DATE_DEBUT = datetime.date(2024, 1, 1)


class Command(BaseCommand):
    help = "Initialise les règles fiscales et sociales Comores (secteur privé) pour 2024."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Supprime les données existantes avant de recréer",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write("Suppression des données existantes pour les Comores…")
            Pays.objects.filter(code_iso="KMF", nom="Comores").delete()
            self.stdout.write(self.style.WARNING("Données supprimées."))

        # ── Pays ─────────────────────────────────────────────────────────────
        comores, created = Pays.objects.get_or_create(
            code_iso="KMF",
            defaults={
                "nom": "Comores",
                "devise": "KMF",
                "arrondi_impot": 1,
                "methode_arrondi": Pays.MethodeArrondi.FLOOR,
            },
        )
        comores.nom = "Comores"
        comores.devise = "KMF"
        comores.arrondi_impot = 1
        comores.methode_arrondi = Pays.MethodeArrondi.FLOOR
        comores.save()
        self._log("Pays", "Comores", created)

        # ── Catégories de convention ──────────────────────────────────────────
        _, created = CategorieConvention.objects.get_or_create(nom="Non-Cadre", pays=comores)
        self._log("Catégorie", "Non-Cadre", created)

        _, created = CategorieConvention.objects.get_or_create(nom="Cadre", pays=comores)
        self._log("Catégorie", "Cadre", created)

        # ── Salaire minimum (SMIG) ────────────────────────────────────────────
        _, smig_created = SalaireMinimum.objects.get_or_create(
            pays=comores,
            date_debut_validite=DATE_DEBUT,
            defaults={"valeur": Decimal("60000")},
        )
        self._log("SMIG", "60 000 KMF/mois (décret n°23-057/PR)", smig_created)

        # ── Cotisations sociales secteur privé ────────────────────────────────
        cotisations = [
            # (nom, code, taux_sal, taux_pat, plancher, plafond, deductible)
            (
                "CSS — Vieillesse",
                "CSS-VIE",
                Decimal("4.0"),
                Decimal("8.0"),
                None,
                Decimal("300000"),
                True,
            ),
        ]

        for nom, code, taux_sal, taux_pat, plancher, plafond, deductible in cotisations:
            _, created = RegleCotisation.objects.get_or_create(
                pays=comores,
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

        # ── Barème ITS (annualisé x12 pour correspondre au calculator) ────────
        # Source : barème mensuel du CGI comorien (loi n°11-003/AU)
        # Les tranches mensuelles sont multipliées par 12 pour usage dans le calculateur
        # qui travaille toujours en base annuelle par part.
        its_tranches = [
            # (plancher_annuel, plafond_annuel, taux%)
            (Decimal("0"), Decimal("1440000"), Decimal("0")),
            (Decimal("1440000"), Decimal("3600000"), Decimal("10")),
            (Decimal("3600000"), Decimal("6000000"), Decimal("15")),
            (Decimal("6000000"), Decimal("12000000"), Decimal("20")),
            (Decimal("12000000"), None, Decimal("25")),
        ]

        for plancher, plafond, taux in its_tranches:
            BaremeImpot.objects.get_or_create(
                pays=comores,
                plancher=plancher,
                date_debut_validite=DATE_DEBUT,
                defaults={"plafond": plafond, "taux": taux},
            )
        self._log("ITS", "5 tranches chargées (annuel)", True)

        # ── Charges familiales (quotient simplifié — 1 part par défaut) ───────
        # L'ITS comorien ne prévoit pas de système de parts fiscales formalisé.
        # On attribue 1 part à toutes les situations ; à affiner si règlement disponible.
        charges = [
            # (situation, nb_enfants, nb_parts, reduction_fixe)
            ("Célibataire", 0, Decimal("1.0"), Decimal("0")),
            ("Marié(e)", 0, Decimal("1.0"), Decimal("0")),
            ("Célibataire", 1, Decimal("1.0"), Decimal("0")),
            ("Célibataire", 2, Decimal("1.0"), Decimal("0")),
            ("Marié(e)", 1, Decimal("1.0"), Decimal("0")),
            ("Marié(e)", 2, Decimal("1.0"), Decimal("0")),
        ]

        for situation, nb_enfants, nb_parts, reduction in charges:
            ChargesFamiliales.objects.get_or_create(
                pays=comores,
                situation_matrimoniale=situation,
                nombre_enfants=nb_enfants,
                date_debut_validite=DATE_DEBUT,
                defaults={"nombre_parts": nb_parts, "reduction_impot_fixe": reduction},
            )
        self._log("Charges familiales", f"{len(charges)} configurations chargées (1 part uniforme)", True)

        self.stdout.write(self.style.SUCCESS("\n✓ Seeding Comores terminé. Règles fiscales et sociales 2024 prêtes."))

    def _log(self, model: str, nom: str, created: bool) -> None:
        status = self.style.SUCCESS("créé") if created else self.style.WARNING("existait déjà")
        self.stdout.write(f"  [{model}] {nom} — {status}")
