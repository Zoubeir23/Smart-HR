"""Tests du moteur de calcul de bulletin de paie (smart_hr.paiement.services.bulletin_calculator).

Avant cette PR, ce moteur (502 lignes, données fiscales Sénégal 2024 réelles)
n'était appelé nulle part dans l'application — ni endpoint API, ni commande de
management. Ces tests vérifient que le pipeline de calcul produit des montants
mathématiquement corrects avec les vraies règles fiscales sénégalaises seedées
par `seed_pays_senegal`, avant de le brancher à une API.
"""

from __future__ import annotations

import datetime
from decimal import Decimal

import pytest
from django.core.management import call_command

from smart_hr.paiement.models import BulletinPaie
from smart_hr.paiement.models import CategorieConvention
from smart_hr.paiement.models import HistoriqueSalaire
from smart_hr.paiement.models import LigneBulletin
from smart_hr.paiement.models import Pays
from smart_hr.paiement.services.bulletin_calculator import calculer_bulletin
from smart_hr.paiement.services.bulletin_calculator import creer_bulletin_correctif
from smart_hr.paiement.services.bulletin_calculator import emettre_bulletin
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

PERIODE = datetime.date(2026, 6, 1)


@pytest.fixture
def senegal(db) -> Pays:
    call_command("seed_pays_senegal")
    return Pays.objects.get(code_iso="XOF")


@pytest.fixture
def non_cadre(senegal) -> CategorieConvention:
    return CategorieConvention.objects.get(pays=senegal, nom="Non-Cadre")


@pytest.fixture
def cadre(senegal) -> CategorieConvention:
    return CategorieConvention.objects.get(pays=senegal, nom="Cadre")


@pytest.fixture
def department(db) -> Department:
    return Department.objects.create(name="Technologie")


def _make_employee(user: User, department: Department, pays: Pays, categorie: CategorieConvention, salaire: Decimal) -> Employee:
    employee = Employee.objects.create(
        user=user,
        department=department,
        hire_date=datetime.date(2023, 1, 1),
        salary=salaire,
        pays=pays,
        categorie_convention=categorie,
        status="active",
    )
    HistoriqueSalaire.objects.create(
        employee=employee,
        salaire_de_base=salaire,
        date_debut=datetime.date(2024, 1, 1),
    )
    return employee


@pytest.fixture
def employee_non_cadre(non_cadre, department, senegal) -> Employee:
    user = UserFactory.create(role=User.Role.EMPLOYEE, first_name="Ousmane", last_name="Sarr")
    return _make_employee(user, department, senegal, non_cadre, Decimal("300000"))


class TestCalculerBulletinSenegal:
    """Vérifie chaque étape du pipeline contre un calcul fait à la main, à
    partir des vraies données seedées : IPRES-RG 5.6%/8.4%, RAM-CSS 1%/3%,
    CSS-AF 7% patronal plafonné à 63 000, TRIMF, barème IGR progressif,
    abattement 30% (plancher 900k/plafond 3M annuel)."""

    def test_cotisations_salariales_ipres_ram(self, employee_non_cadre):
        bulletin, lignes = calculer_bulletin(employee_non_cadre, PERIODE)

        # IPRES-RG : 300 000 * 5.6% = 16 800 ; RAM-CSS : 300 000 * 1% = 3 000
        # CSS-AF est 0% côté salarial (100% patronal) → n'apparaît pas en retenue salariale.
        assert bulletin.cotisations_salariales == Decimal("19800") + Decimal("4500")  # + TRIMF (voir test dédié)

        ipres = next(l for l in lignes if l.libelle == "IPRES — Régime Général")
        assert ipres.montant == Decimal("-16800")
        ram = next(l for l in lignes if l.libelle == "RAM — Assurance maladie")
        assert ram.montant == Decimal("-3000")

    def test_css_af_plafonnee_a_63000_cote_patronal(self, employee_non_cadre):
        _, lignes = calculer_bulletin(employee_non_cadre, PERIODE)
        css_af = next(l for l in lignes if l.libelle == "CSS — Allocations familiales (patronal)")
        # Assiette plafonnée à 63 000 (pas 300 000) : 63 000 * 7% = 4 410
        assert css_af.montant == Decimal("4410")

    def test_ipres_rc_non_applicable_a_un_non_cadre(self, employee_non_cadre):
        _, lignes = calculer_bulletin(employee_non_cadre, PERIODE)
        assert not any("Régime Cadre" in l.libelle for l in lignes)

    def test_ipres_rc_applicable_a_un_cadre(self, cadre, department, senegal):
        user = UserFactory.create(role=User.Role.EMPLOYEE, first_name="Awa", last_name="Diallo")
        employee = _make_employee(user, department, senegal, cadre, Decimal("300000"))
        _, lignes = calculer_bulletin(employee, PERIODE)
        assert any("Régime Cadre" in l.libelle for l in lignes)

    def test_trimf_tranche_correcte(self, employee_non_cadre):
        # Salaire brut 300 000 FCFA → tranche TRIMF "100 001-500 000" = 4 500.
        _, lignes = calculer_bulletin(employee_non_cadre, PERIODE)
        trimf = next(l for l in lignes if l.libelle == "Taxe minimale forfaitaire")
        assert trimf.montant == Decimal("-4500")

    def test_net_imposable_apres_abattement_30_pourcent(self, employee_non_cadre):
        # net_imposable = 300 000 - (16 800 + 3 000 déductibles) - abattement(90 000) = 190 200
        bulletin, _ = calculer_bulletin(employee_non_cadre, PERIODE)
        assert bulletin.net_imposable == Decimal("190200")

    def test_impot_igr_bareme_progressif(self, employee_non_cadre):
        # Revenu annuel imposable 190 200 * 12 = 2 282 400, part unique (célibataire, 0 enfant).
        # Tranche 0-630k à 0% + tranche 630k-1.5M à 20% (870k*20%=174 000)
        # + tranche 1.5M-2 282 400 à 30% (782 400*30%=234 720) = 408 720/an, arrondi plancher 100 → 408 700
        # → 408 700 / 12 = 34 058,33 → tronqué à 34 058 FCFA/mois.
        bulletin, lignes = calculer_bulletin(employee_non_cadre, PERIODE)
        assert bulletin.impot == Decimal("34058")
        igr = next(l for l in lignes if l.libelle == "Impôt sur le revenu (IGR)")
        assert igr.montant == Decimal("-34058")

    def test_net_a_payer_final(self, employee_non_cadre):
        # 300 000 (brut) - 19 800 (cotisations sal.) - 4 500 (TRIMF) - 34 058 (IGR) = 241 642
        bulletin, _ = calculer_bulletin(employee_non_cadre, PERIODE)
        assert bulletin.net_a_payer == Decimal("241642")

    def test_salaire_sous_le_smig_est_rejete(self, non_cadre, department, senegal):
        user = UserFactory.create(role=User.Role.EMPLOYEE, first_name="Test", last_name="Smig")
        employee = _make_employee(user, department, senegal, non_cadre, Decimal("50000"))
        with pytest.raises(ValueError, match="inférieur au SMIG"):
            calculer_bulletin(employee, PERIODE)

    def test_employe_sans_pays_leve_une_erreur_explicite(self, department):
        user = UserFactory.create(role=User.Role.EMPLOYEE, first_name="Sans", last_name="Pays")
        employee = Employee.objects.create(
            user=user,
            department=department,
            hire_date=datetime.date(2023, 1, 1),
            salary=Decimal("300000"),
            status="active",
        )
        with pytest.raises(ValueError, match="pays fiscal"):
            calculer_bulletin(employee, PERIODE)

    def test_employe_sans_historique_salaire_leve_une_erreur_explicite(self, non_cadre, department, senegal):
        user = UserFactory.create(role=User.Role.EMPLOYEE, first_name="Sans", last_name="Historique")
        employee = Employee.objects.create(
            user=user,
            department=department,
            hire_date=datetime.date(2023, 1, 1),
            salary=Decimal("300000"),
            pays=senegal,
            categorie_convention=non_cadre,
            status="active",
        )
        with pytest.raises(ValueError, match="Aucun historique de salaire"):
            calculer_bulletin(employee, PERIODE)


class TestEmettreBulletin:
    def test_persiste_bulletin_et_lignes(self, employee_non_cadre):
        bulletin = emettre_bulletin(employee_non_cadre, PERIODE)
        assert bulletin.pk is not None
        assert bulletin.statut == BulletinPaie.Statut.BROUILLON
        assert LigneBulletin.objects.filter(bulletin=bulletin).count() > 0

    def test_refuse_un_doublon_pour_la_meme_periode(self, employee_non_cadre):
        emettre_bulletin(employee_non_cadre, PERIODE)
        with pytest.raises(ValueError, match="existe déjà"):
            emettre_bulletin(employee_non_cadre, PERIODE)

    def test_autorise_regeneration_apres_annulation(self, employee_non_cadre):
        premier = emettre_bulletin(employee_non_cadre, PERIODE)
        premier.statut = BulletinPaie.Statut.ANNULE
        premier.save()
        second = emettre_bulletin(employee_non_cadre, PERIODE)
        assert second.pk != premier.pk


class TestCreerBulletinCorrectif:
    def test_annule_original_et_cree_un_correctif_lie(self, employee_non_cadre):
        original = emettre_bulletin(employee_non_cadre, PERIODE)
        original.statut = BulletinPaie.Statut.EMIS
        original.save()

        correctif = creer_bulletin_correctif(original)

        original.refresh_from_db()
        assert original.statut == BulletinPaie.Statut.ANNULE
        assert correctif.bulletin_remplace_id == original.pk
        assert correctif.statut == BulletinPaie.Statut.BROUILLON

    def test_refuse_de_corriger_un_brouillon(self, employee_non_cadre):
        brouillon = emettre_bulletin(employee_non_cadre, PERIODE)
        with pytest.raises(ValueError, match="EMIS ou VALIDES"):
            creer_bulletin_correctif(brouillon)
