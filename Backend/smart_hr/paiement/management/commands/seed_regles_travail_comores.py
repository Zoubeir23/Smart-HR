"""
Seeding des regles de travail pour les Comores (2024) :
heures supplementaires, prime d'anciennete, indemnite de licenciement.

Sources officielles :
- Heures supplementaires : Code du travail comorien (loi n°84-108/PR), art. 107
  * 41e - 44e heure : +30%
  * Au-dela de la 44e heure : +50%
  * Contingent annuel : 100 h
- Prime d'anciennete : Code du travail, art. 87
  * Droit ouvert apres 2 ans d'anciennete continue
  * 2 ans : 2%, +1% par annee supplementaire, plafond 15%
- Indemnite de licenciement : Code du travail comorien
  * Aucun bareme legal unifie -- fixe par convention collective ou juge
  * Pratique observee (indicative) : 20% du salaire mensuel moyen par annee
  * Condition : anciennete >= 24 mois (2 ans)

ATTENTION : l'indemnite de licenciement est indicative, sans force de loi.
            A adapter selon la convention collective applicable.

Usage :
    python manage.py seed_regles_travail_comores
    python manage.py seed_regles_travail_comores --reset
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
    help = "Initialise les regles travail (HS, anciennete, licenciement) des Comores 2024."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Supprime et recrée les règles")

    def handle(self, *args, **options):
        try:
            comores = Pays.objects.get(code_iso="KMF")
        except Pays.DoesNotExist:
            self.stdout.write(self.style.ERROR("Pays Comores (KMF) introuvable. Lancez seed_pays_comores d'abord."))
            return

        if options["reset"]:
            TrancheHeureSupplementaire.objects.filter(pays=comores).delete()
            TranchePrimeAnciennete.objects.filter(pays=comores).delete()
            TrancheIndemniteLicenciement.objects.filter(pays=comores).delete()
            self.stdout.write(self.style.WARNING("Regles travail Comores supprimees."))

        # ── Heures supplementaires ────────────────────────────────────────────
        # Contingent annuel : 100 h (art. 107 Code travail comorien)
        heures_sup = [
            # (heure_debut, heure_fin, taux_majoration, contingent_annuel)
            (41, 44, Decimal("30.00"), 100),
            (45, None, Decimal("50.00"), None),
        ]

        for heure_debut, heure_fin, taux, contingent in heures_sup:
            _, created = TrancheHeureSupplementaire.objects.get_or_create(
                pays=comores,
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

        # ── Prime d'anciennete (art. 87 Code travail) ─────────────────────────
        # Droit ouvert a partir de 2 ans ; 2% la 2e annee, +1% par annee, plafond 15%
        anciennete_tranches = []
        plafond_taux = Decimal("15.00")
        for annee in range(2, 16):
            taux = min(Decimal(str(annee)), plafond_taux)
            annees_fin = annee if annee < 15 else None
            anciennete_tranches.append((annee, annees_fin, taux, plafond_taux))

        for annees_debut, annees_fin, taux, plafond in anciennete_tranches:
            _, created = TranchePrimeAnciennete.objects.get_or_create(
                pays=comores,
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

        # ── Indemnite de licenciement (pratique observee, indicative) ─────────
        # Condition : anciennete >= 24 mois
        # Taux : 20% du salaire mensuel moyen par annee
        licenciement_tranches = [
            # (annees_debut, annees_fin, taux_par_annee, anciennete_minimale_mois)
            (2, None, Decimal("20.00"), 24),
        ]

        for annees_debut, annees_fin, taux, anciennete_min in licenciement_tranches:
            _, created = TrancheIndemniteLicenciement.objects.get_or_create(
                pays=comores,
                annees_debut=annees_debut,
                date_debut_validite=DATE_DEBUT,
                defaults={
                    "annees_fin": annees_fin,
                    "taux_par_annee": taux,
                    "anciennete_minimale_mois": anciennete_min,
                },
            )
            fin_str = f"{annees_fin} ans" if annees_fin else "inf"
            self._log("Licenciement (indicatif)", f"[{annees_debut} -> {fin_str}] {taux}%/an", created)

        self.stdout.write(self.style.SUCCESS("\n✓ Regles travail Comores 2024 chargees."))
        self.stdout.write(self.style.WARNING("  RAPPEL : indemnite de licenciement = pratique observee, pas de bareme legal."))

    def _log(self, model: str, nom: str, created: bool) -> None:
        status = self.style.SUCCESS("cree") if created else self.style.WARNING("existait deja")
        self.stdout.write(f"  [{model}] {nom} -- {status}")
