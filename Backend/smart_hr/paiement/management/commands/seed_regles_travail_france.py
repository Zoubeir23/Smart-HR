"""
Seeding des regles de travail pour la France (2024) :
heures supplementaires, prime d'anciennete, indemnite de licenciement.

Sources officielles :
- Heures supplementaires : Code du travail art. L.3121-28 et L.3121-33
  * 36e - 43e heure : +25%
  * Au-dela de la 43e heure : +50%
  * Contingent annuel legal : 220 h
- Prime d'anciennete : pas de dispositif legal ; convention collective de la metallurgie
  (reference sectorielle tres repandue, CCN 2941)
  * 3 ans : 3%, 6 ans : 6%, ..., 15 ans : 15%, puis +1%/an jusqu'a 25% max
- Indemnite legale de licenciement : Code du travail art. L.1234-9 et R.1234-2
  * Condition : anciennete >= 8 mois (240 jours)
  * Annees 1 - 10 : 25% du salaire mensuel moyen (= 1/4 mois) par annee
  * Au-dela de 10 ans : 33.33% (= 1/3 mois) par annee
  * Base : max(1/12e des 12 derniers mois, 1/3 des 3 derniers mois)

Usage :
    python manage.py seed_regles_travail_france
    python manage.py seed_regles_travail_france --reset
"""

from __future__ import annotations

import datetime
from decimal import Decimal

from django.core.management.base import BaseCommand

from smart_hr.paiement.models import Pays
from smart_hr.paiement.models import TrancheHeureSupplementaire
from smart_hr.paiement.models import TrancheIndemniteLicenciement
from smart_hr.paiement.models import TranchePrimeAnciennete

DATE_DEBUT = datetime.date(2024, 1, 1)


class Command(BaseCommand):
    help = "Initialise les regles travail (HS, anciennete, licenciement) de la France 2024."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Supprime et recrée les règles")

    def handle(self, *args, **options):
        try:
            france = Pays.objects.get(code_iso="EUR")
        except Pays.DoesNotExist:
            self.stdout.write(self.style.ERROR("Pays France (EUR) introuvable. Lancez seed_pays_france d'abord."))
            return

        if options["reset"]:
            TrancheHeureSupplementaire.objects.filter(pays=france).delete()
            TranchePrimeAnciennete.objects.filter(pays=france).delete()
            TrancheIndemniteLicenciement.objects.filter(pays=france).delete()
            self.stdout.write(self.style.WARNING("Regles travail France supprimees."))

        # ── Heures supplementaires ────────────────────────────────────────────
        # Contingent legal : 220 h/an (art. D.3121-24)
        heures_sup = [
            # (heure_debut, heure_fin, taux_majoration, contingent_annuel)
            (36, 43, Decimal("25.00"), 220),
            (44, None, Decimal("50.00"), None),
        ]

        for heure_debut, heure_fin, taux, contingent in heures_sup:
            _, created = TrancheHeureSupplementaire.objects.get_or_create(
                pays=france,
                heure_debut=heure_debut,
                date_debut_validite=DATE_DEBUT,
                defaults={
                    "heure_fin": heure_fin,
                    "taux_majoration": taux,
                    "contingent_annuel": contingent,
                },
            )
            fin_str = f"{heure_fin}h" if heure_fin else "inf"
            self._log("HS", f"[{heure_debut}h -> {fin_str}] +{taux}%", created)

        # ── Prime d'anciennete (CCN metallurgie, tres repandue) ───────────────
        # 3% a 3 ans, +3% par tranche de 3 ans jusqu'a 15 ans,
        # puis +1% par an au-dela (plafond 25%)
        anciennete_tranches = [
            # (annees_debut, annees_fin, taux, plafond_taux)
            (3, 5, Decimal("3.00"), Decimal("25.00")),
            (6, 8, Decimal("6.00"), Decimal("25.00")),
            (9, 11, Decimal("9.00"), Decimal("25.00")),
            (12, 14, Decimal("12.00"), Decimal("25.00")),
            (15, 15, Decimal("15.00"), Decimal("25.00")),
            (16, 16, Decimal("16.00"), Decimal("25.00")),
            (17, 17, Decimal("17.00"), Decimal("25.00")),
            (18, 18, Decimal("18.00"), Decimal("25.00")),
            (19, 19, Decimal("19.00"), Decimal("25.00")),
            (20, 20, Decimal("20.00"), Decimal("25.00")),
            (21, 21, Decimal("21.00"), Decimal("25.00")),
            (22, 22, Decimal("22.00"), Decimal("25.00")),
            (23, 23, Decimal("23.00"), Decimal("25.00")),
            (24, 24, Decimal("24.00"), Decimal("25.00")),
            (25, None, Decimal("25.00"), Decimal("25.00")),
        ]

        for annees_debut, annees_fin, taux, plafond in anciennete_tranches:
            _, created = TranchePrimeAnciennete.objects.get_or_create(
                pays=france,
                annees_debut=annees_debut,
                date_debut_validite=DATE_DEBUT,
                defaults={
                    "annees_fin": annees_fin,
                    "taux": taux,
                    "plafond_taux": plafond,
                },
            )
            fin_str = f"{annees_fin} ans" if annees_fin else "inf"
            self._log("Anciennete", f"[{annees_debut} -> {fin_str}] {taux}%", created)

        # ── Indemnite legale de licenciement (art. L.1234-9) ──────────────────
        # Condition : anciennete >= 8 mois (= 8 mois minimum)
        # 1/4 mois par annee pour les 10 premieres annees = 25%
        # 1/3 mois par annee au-dela de 10 ans = 33.33%
        licenciement_tranches = [
            # (annees_debut, annees_fin, taux_par_annee, anciennete_minimale_mois)
            (1, 10, Decimal("25.00"), 8),
            (11, None, Decimal("33.33"), 8),
        ]

        for annees_debut, annees_fin, taux, anciennete_min in licenciement_tranches:
            _, created = TrancheIndemniteLicenciement.objects.get_or_create(
                pays=france,
                annees_debut=annees_debut,
                date_debut_validite=DATE_DEBUT,
                defaults={
                    "annees_fin": annees_fin,
                    "taux_par_annee": taux,
                    "anciennete_minimale_mois": anciennete_min,
                },
            )
            fin_str = f"{annees_fin} ans" if annees_fin else "inf"
            self._log("Licenciement", f"[{annees_debut} -> {fin_str}] {taux}%/an", created)

        self.stdout.write(self.style.SUCCESS("\n✓ Regles travail France 2024 chargees."))

    def _log(self, model: str, nom: str, created: bool) -> None:
        status = self.style.SUCCESS("cree") if created else self.style.WARNING("existait deja")
        self.stdout.write(f"  [{model}] {nom} -- {status}")
