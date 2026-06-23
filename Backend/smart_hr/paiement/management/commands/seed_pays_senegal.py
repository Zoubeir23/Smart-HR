"""
Commande de seeding des règles fiscales du Sénégal (exercice 2024-2026).

Données de référence :
- SMIG : 63 238 FCFA/mois (décret 2023)
- IPRES RG : salarial 5,6% / patronal 8,4% — plafond 630 000 FCFA
- IPRES RC (cadres) : salarial 2,4% / patronal 3,6%
- CSS (allocations familiales) : patronal 7% — plafond 63 000 FCFA
- TRIMF : taxe minimale forfaitaire mensuelle par tranche
- IGR : barème progressif annuel par part fiscale
- Abattement professionnel : 30% du brut imposable (plancher 900 000, plafond 3 000 000/an)

Usage :
    python manage.py seed_pays_senegal
    python manage.py seed_pays_senegal --reset   # Supprime et recrée toutes les données
"""
from __future__ import annotations

import datetime
from decimal import Decimal

from django.core.management.base import BaseCommand

from smart_hr.paiement.models import (
    AbattementRegle,
    BaremeImpot,
    CategorieConvention,
    ChargesFamiliales,
    Pays,
    RegleCotisation,
    SalaireMinimum,
    TaxeMinimaleForfaitaire,
)

DATE_DEBUT = datetime.date(2024, 1, 1)


class Command(BaseCommand):
    help = "Initialise les règles fiscales et sociales du Sénégal pour 2024-2026."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Supprime les données existantes avant de recréer",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write("Suppression des données existantes pour le Sénégal…")
            Pays.objects.filter(code_iso="XOF", nom="Sénégal").delete()
            self.stdout.write(self.style.WARNING("Données supprimées."))

        # ── Pays ─────────────────────────────────────────────────────────────
        senegal, created = Pays.objects.get_or_create(
            code_iso="XOF",
            defaults={
                "nom": "Sénégal",
                "devise": "FCFA",
                "arrondi_impot": 100,
                "methode_arrondi": Pays.MethodeArrondi.FLOOR,
            },
        )
        senegal.nom = "Sénégal"
        senegal.devise = "FCFA"
        senegal.arrondi_impot = 100
        senegal.methode_arrondi = Pays.MethodeArrondi.FLOOR
        senegal.save()
        self._log("Pays", "Sénégal", created)

        # ── Catégories de convention ──────────────────────────────────────────
        non_cadre, created = CategorieConvention.objects.get_or_create(
            nom="Non-Cadre", pays=senegal
        )
        self._log("Catégorie", "Non-Cadre", created)

        cadre, created = CategorieConvention.objects.get_or_create(
            nom="Cadre", pays=senegal
        )
        self._log("Catégorie", "Cadre", created)

        # ── Salaire minimum (SMIG) ────────────────────────────────────────────
        SalaireMinimum.objects.get_or_create(
            pays=senegal,
            date_debut_validite=DATE_DEBUT,
            defaults={"valeur": Decimal("63238")},
        )
        self._log("SMIG", "63 238 FCFA/mois", created)

        # ── Cotisations sociales ──────────────────────────────────────────────
        cotisations = [
            # (nom, code, taux_sal, taux_pat, plafond, deductible, categorie)
            (
                "IPRES — Régime Général",
                "IPRES-RG",
                Decimal("5.6"), Decimal("8.4"),
                Decimal("630000"),
                True, None,
            ),
            (
                "IPRES — Régime Cadre",
                "IPRES-RC",
                Decimal("2.4"), Decimal("3.6"),
                Decimal("2016000"),
                True, cadre,
            ),
            (
                "CSS — Allocations familiales",
                "CSS-AF",
                Decimal("0"), Decimal("7"),
                Decimal("63000"),
                False, None,
            ),
        ]

        for nom, code, taux_sal, taux_pat, plafond, deductible, categorie in cotisations:
            obj, created = RegleCotisation.objects.get_or_create(
                pays=senegal,
                nom_cotisation=nom,
                date_debut_validite=DATE_DEBUT,
                defaults={
                    "code_declaration": code,
                    "taux_salarial": taux_sal,
                    "taux_patronal": taux_pat,
                    "plafond_assiette": plafond,
                    "est_deductible_base_imposable": deductible,
                    "categorie": categorie,
                },
            )
            self._log("Cotisation", nom, created)

        # ── TRIMF (taxe minimale forfaitaire) ─────────────────────────────────
        trimf_tranches = [
            # (plancher, plafond, montant_mensuel)
            (Decimal("0"), Decimal("25000"), Decimal("0")),
            (Decimal("25001"), Decimal("50000"), Decimal("1000")),
            (Decimal("50001"), Decimal("100000"), Decimal("2000")),
            (Decimal("100001"), Decimal("500000"), Decimal("4500")),
            (Decimal("500001"), None, Decimal("6000")),
        ]

        for plancher, plafond, montant in trimf_tranches:
            TaxeMinimaleForfaitaire.objects.get_or_create(
                pays=senegal,
                plancher=plancher,
                date_debut_validite=DATE_DEBUT,
                defaults={
                    "plafond": plafond,
                    "montant_mensuel": montant,
                    "est_deductible_base_imposable": False,
                },
            )
        self._log("TRIMF", "5 tranches chargées", True)

        # ── Barème IGR (tranches annuelles par part) ──────────────────────────
        igr_tranches = [
            # (plancher, plafond, taux%)
            (Decimal("0"), Decimal("630000"), Decimal("0")),
            (Decimal("630000"), Decimal("1500000"), Decimal("20")),
            (Decimal("1500000"), Decimal("4000000"), Decimal("30")),
            (Decimal("4000000"), Decimal("8000000"), Decimal("35")),
            (Decimal("8000000"), None, Decimal("40")),
        ]

        for plancher, plafond, taux in igr_tranches:
            BaremeImpot.objects.get_or_create(
                pays=senegal,
                plancher=plancher,
                date_debut_validite=DATE_DEBUT,
                defaults={"plafond": plafond, "taux": taux},
            )
        self._log("IGR", "5 tranches chargées", True)

        # ── Abattement professionnel ──────────────────────────────────────────
        AbattementRegle.objects.get_or_create(
            pays=senegal,
            nom="Abattement forfaitaire professionnel",
            date_debut_validite=DATE_DEBUT,
            defaults={
                "taux": Decimal("30"),
                "plafond_annuel": Decimal("3000000"),
                "plancher_annuel": Decimal("900000"),
            },
        )
        self._log("Abattement", "30% (plancher 900 000 / plafond 3 000 000)", True)

        # ── Charges familiales (parts fiscales IGR) ───────────────────────────
        charges = [
            # (situation, nb_enfants, nb_parts, reduction_fixe)
            ("Célibataire", 0, Decimal("1.0"), Decimal("0")),
            ("Divorcé(e)", 0, Decimal("1.0"), Decimal("0")),
            ("Veuf(ve)", 0, Decimal("1.0"), Decimal("0")),
            ("Marié(e)", 0, Decimal("1.5"), Decimal("0")),
            ("Célibataire", 1, Decimal("1.5"), Decimal("0")),
            ("Célibataire", 2, Decimal("2.0"), Decimal("0")),
            ("Célibataire", 3, Decimal("2.5"), Decimal("0")),
            ("Célibataire", 4, Decimal("3.0"), Decimal("0")),
            ("Célibataire", 5, Decimal("3.5"), Decimal("0")),
            ("Marié(e)", 1, Decimal("2.0"), Decimal("0")),
            ("Marié(e)", 2, Decimal("2.5"), Decimal("0")),
            ("Marié(e)", 3, Decimal("3.0"), Decimal("0")),
            ("Marié(e)", 4, Decimal("3.5"), Decimal("0")),
            ("Marié(e)", 5, Decimal("4.0"), Decimal("0")),
        ]

        for situation, nb_enfants, nb_parts, reduction in charges:
            ChargesFamiliales.objects.get_or_create(
                pays=senegal,
                situation_matrimoniale=situation,
                nombre_enfants=nb_enfants,
                date_debut_validite=DATE_DEBUT,
                defaults={"nombre_parts": nb_parts, "reduction_impot_fixe": reduction},
            )
        self._log("Charges familiales", f"{len(charges)} configurations chargées", True)

        self.stdout.write(self.style.SUCCESS(
            "\n✓ Seeding Sénégal terminé. "
            "Les règles fiscales 2024 sont prêtes pour le moteur de paie."
        ))

    def _log(self, model: str, nom: str, created: bool) -> None:
        status = self.style.SUCCESS("créé") if created else self.style.WARNING("existait déjà")
        self.stdout.write(f"  [{model}] {nom} — {status}")
