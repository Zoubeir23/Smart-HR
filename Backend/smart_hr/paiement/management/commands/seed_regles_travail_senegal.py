"""
Seeding des regles de travail pour le Senegal (2024) :
heures supplementaires, prime d'anciennete, indemnite de licenciement.

Sources officielles :
- Heures supplementaires : Code du travail, art. L.140
  Arrete n°005816/MFPTEOP/DTSS du 19 juin 1995
  * 41e - 48e heure : +15%
  * Au-dela de la 48e heure : +40%
  * Contingent trimestriel : 50 h (=> 200 h/an)
- Prime d'anciennete : CCIP du 15 decembre 1959, modifiee
  * A partir de 3 ans : 3%, puis +3% par tranche de 3 ans jusqu'a 27%
  * Base : salaire de base ou salaire minimum de categorie
- Indemnite de licenciement : Code du travail, art. L.61
  * Condition : anciennete >= 1 an (12 mois)
  * 1 - 5 ans : 25% du salaire mensuel moyen par annee
  * 6 - 10 ans : 30% par annee
  * Au-dela de 10 ans : 35% par annee

Usage :
    python manage.py seed_regles_travail_senegal
    python manage.py seed_regles_travail_senegal --reset
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
    help = "Initialise les regles travail (HS, anciennete, licenciement) du Senegal 2024."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Supprime et recrée les règles")

    def handle(self, *args, **options):
        try:
            senegal = Pays.objects.get(code_iso="XOF")
        except Pays.DoesNotExist:
            self.stdout.write(self.style.ERROR("Pays Senegal (XOF) introuvable. Lancez seed_pays_senegal d'abord."))
            return

        if options["reset"]:
            TrancheHeureSupplementaire.objects.filter(pays=senegal).delete()
            TranchePrimeAnciennete.objects.filter(pays=senegal).delete()
            TrancheIndemniteLicenciement.objects.filter(pays=senegal).delete()
            self.stdout.write(self.style.WARNING("Regles travail Senegal supprimees."))

        # ── Heures supplementaires ────────────────────────────────────────────
        # Contingent trimestriel de 50 h => 200 h/an
        heures_sup = [
            # (heure_debut, heure_fin, taux_majoration, contingent_annuel)
            (41, 48, Decimal("15.00"), 200),
            (49, None, Decimal("40.00"), None),
        ]

        for heure_debut, heure_fin, taux, contingent in heures_sup:
            _, created = TrancheHeureSupplementaire.objects.get_or_create(
                pays=senegal,
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

        # ── Prime d'anciennete (CCIP) ─────────────────────────────────────────
        # 3% a 3 ans, 6% a 6 ans, ..., 27% a 27 ans et plus (plafond 27%)
        anciennete_tranches = [
            # (annees_debut, annees_fin, taux, plafond_taux)
            (3, 5, Decimal("3.00"), Decimal("27.00")),
            (6, 8, Decimal("6.00"), Decimal("27.00")),
            (9, 11, Decimal("9.00"), Decimal("27.00")),
            (12, 14, Decimal("12.00"), Decimal("27.00")),
            (15, 17, Decimal("15.00"), Decimal("27.00")),
            (18, 20, Decimal("18.00"), Decimal("27.00")),
            (21, 23, Decimal("21.00"), Decimal("27.00")),
            (24, 26, Decimal("24.00"), Decimal("27.00")),
            (27, None, Decimal("27.00"), Decimal("27.00")),
        ]

        for annees_debut, annees_fin, taux, plafond in anciennete_tranches:
            _, created = TranchePrimeAnciennete.objects.get_or_create(
                pays=senegal,
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

        # ── Indemnite de licenciement (art. L.61) ─────────────────────────────
        # Condition : anciennete >= 12 mois
        licenciement_tranches = [
            # (annees_debut, annees_fin, taux_par_annee, anciennete_minimale_mois)
            (1, 5, Decimal("25.00"), 12),
            (6, 10, Decimal("30.00"), 12),
            (11, None, Decimal("35.00"), 12),
        ]

        for annees_debut, annees_fin, taux, anciennete_min in licenciement_tranches:
            _, created = TrancheIndemniteLicenciement.objects.get_or_create(
                pays=senegal,
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

        self.stdout.write(self.style.SUCCESS("\n✓ Regles travail Senegal 2024 chargees."))

    def _log(self, model: str, nom: str, created: bool) -> None:
        status = self.style.SUCCESS("cree") if created else self.style.WARNING("existait deja")
        self.stdout.write(f"  [{model}] {nom} -- {status}")
