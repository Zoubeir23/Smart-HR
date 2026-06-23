"""
Commande de seeding des règles de cotisations sociales pour les Comores (secteur privé, 2024).

Sources officielles :
- CSS (vieillesse) : salarial 4,0% / patronal 8,0% — assiette plafonnée
  Plafond exact non consolidé au 2024-01-01 → champ plafond_assiette laissé null
  (à mettre à jour dès réception de l'arrêté officiel)
- Assurance maladie : aucun régime obligatoire en 2024

Périmètre : secteur privé uniquement.
L'ITS (Impôt sur les Traitements et Salaires) sera implémenté séparément via BaremeImpot
dès obtention du barème officiel 2024.

Usage :
    python manage.py seed_pays_comores
    python manage.py seed_pays_comores --reset
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


class Command(BaseCommand):
    help = "Initialise les cotisations sociales Comores (secteur privé) pour 2024."

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

        # ── Salaire minimum ───────────────────────────────────────────────────
        # SMIG Comores (valeur à confirmer avec l'arrêté en vigueur)
        _, smig_created = SalaireMinimum.objects.get_or_create(
            pays=comores,
            date_debut_validite=DATE_DEBUT,
            defaults={"valeur": Decimal("55000")},
        )
        self._log("SMIG", "55 000 KMF/mois (valeur à confirmer)", smig_created)

        # ── Cotisations sociales secteur privé ────────────────────────────────
        # La branche vieillesse est la seule obligatoire en 2024.
        # Le plafond exact de l'assiette CSS n'est pas encore consolidé ;
        # plafond_assiette = None (déplafonné provisoirement) jusqu'à réception de l'arrêté.
        cotisations = [
            # (nom, code, taux_sal, taux_pat, plancher, plafond, deductible)
            (
                "CSS — Vieillesse",
                "CSS-VIE",
                Decimal("4.0"),
                Decimal("8.0"),
                None,
                None,  # Plafond officiel non disponible — à mettre à jour
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

        self.stdout.write(
            self.style.SUCCESS(
                "\n✓ Seeding Comores terminé. Cotisations sociales secteur privé 2024 chargées."
            )
        )
        self.stdout.write(
            self.style.WARNING(
                "  ATTENTION : plafond_assiette CSS-VIE non renseigné (arrêté officiel en attente).\n"
                "  ITS (barème impôt) à implémenter séparément via BaremeImpot."
            )
        )

    def _log(self, model: str, nom: str, created: bool) -> None:
        status = self.style.SUCCESS("créé") if created else self.style.WARNING("existait déjà")
        self.stdout.write(f"  [{model}] {nom} — {status}")
