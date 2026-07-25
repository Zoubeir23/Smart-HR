"""Tests de la résolution d'employé par nom complet, utilisée par les agents
actionnables du chatbot (validation de congé, onboarding).

La correspondance doit être faite en base : la version historique chargeait
toute la table Employee en mémoire pour filtrer en Python.
"""

from __future__ import annotations

import datetime

import pytest

from smart_hr.ai.actions.shared import find_employee_by_full_name
from smart_hr.personnel.models import Employee
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


def _create_employee(first_name: str, last_name: str) -> Employee:
    user = UserFactory.create(role=User.Role.EMPLOYEE, first_name=first_name, last_name=last_name)
    return Employee.objects.create(user=user, hire_date=datetime.date(2023, 1, 1))


class TestFindEmployeeByFullName:
    def test_trouve_par_correspondance_exacte(self) -> None:
        employee = _create_employee("Awa", "Diallo")
        assert find_employee_by_full_name("Awa Diallo") == employee

    def test_insensible_a_la_casse(self) -> None:
        employee = _create_employee("Awa", "Diallo")
        assert find_employee_by_full_name("awa diallo") == employee

    def test_ignore_les_espaces_autour(self) -> None:
        employee = _create_employee("Awa", "Diallo")
        assert find_employee_by_full_name("  Awa Diallo  ") == employee

    def test_retourne_none_si_aucune_correspondance(self) -> None:
        _create_employee("Awa", "Diallo")
        assert find_employee_by_full_name("Moussa Sow") is None

    def test_retourne_none_si_ambigu(self) -> None:
        """Deux homonymes : mieux vaut demander une précision que de cibler le
        mauvais employé, une décision de congé étant irréversible côté métier."""
        _create_employee("Awa", "Diallo")
        _create_employee("Awa", "Diallo")
        assert find_employee_by_full_name("Awa Diallo") is None

    def test_retourne_none_si_nom_vide(self) -> None:
        _create_employee("Awa", "Diallo")
        assert find_employee_by_full_name("") is None
        assert find_employee_by_full_name("   ") is None

    def test_ne_charge_pas_toute_la_table(self, django_assert_num_queries) -> None:
        """Le filtrage doit être poussé en base : une seule requête, bornée à
        2 lignes, quel que soit l'effectif."""
        for index in range(10):
            _create_employee(f"Employe{index}", "Test")

        with django_assert_num_queries(1):
            find_employee_by_full_name("Employe5 Test")
