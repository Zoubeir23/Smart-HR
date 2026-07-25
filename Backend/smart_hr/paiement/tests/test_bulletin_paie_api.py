from __future__ import annotations

import datetime
from decimal import Decimal

import pytest
from django.core.management import call_command
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.paiement.models import BulletinPaie
from smart_hr.paiement.models import CategorieConvention
from smart_hr.paiement.models import HistoriqueSalaire
from smart_hr.paiement.models import Pays
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

GENERER_URL = "/api/v1/paiement/bulletins/generer/"
LISTE_URL = "/api/v1/paiement/bulletins/"
PERIODE = "2026-06-01"


@pytest.fixture
def senegal(db) -> Pays:
    call_command("seed_pays_senegal")
    return Pays.objects.get(code_iso="XOF")


@pytest.fixture
def non_cadre(senegal) -> CategorieConvention:
    return CategorieConvention.objects.get(pays=senegal, nom="Non-Cadre")


@pytest.fixture
def department(db) -> Department:
    return Department.objects.create(name="Technologie")


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE, first_name="Ousmane", last_name="Sarr")


@pytest.fixture
def employee(employee_user, department, senegal, non_cadre) -> Employee:
    employee = Employee.objects.create(
        user=employee_user,
        department=department,
        hire_date=datetime.date(2023, 1, 1),
        salary=Decimal("300000"),
        pays=senegal,
        categorie_convention=non_cadre,
        status="active",
    )
    HistoriqueSalaire.objects.create(
        employee=employee,
        salaire_de_base=Decimal("300000"),
        date_debut=datetime.date(2024, 1, 1),
    )
    return employee


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestGenererBulletin:
    def test_anonymous_cannot_generate(self, employee):
        client = APIClient()
        response = client.post(GENERER_URL, {"employee_id": employee.pk, "periode": PERIODE}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_employee_cannot_generate(self, employee_user, employee):
        client = _authenticated_client(employee_user)
        response = client.post(GENERER_URL, {"employee_id": employee.pk, "periode": PERIODE}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rh_can_generate_a_real_bulletin(self, rh_user, employee):
        client = _authenticated_client(rh_user)
        response = client.post(GENERER_URL, {"employee_id": employee.pk, "periode": PERIODE}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["net_a_payer"] == "241642.00"
        assert BulletinPaie.objects.filter(employee=employee, periode=datetime.date(2026, 6, 1)).exists()

    def test_rejects_duplicate_period(self, rh_user, employee):
        client = _authenticated_client(rh_user)
        client.post(GENERER_URL, {"employee_id": employee.pk, "periode": PERIODE}, format="json")
        response = client.post(GENERER_URL, {"employee_id": employee.pk, "periode": PERIODE}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "existe déjà" in response.data["detail"]

    def test_rejects_employee_without_pays(self, rh_user, department):
        user = UserFactory.create(role=User.Role.EMPLOYEE, first_name="Sans", last_name="Pays")
        employee = Employee.objects.create(
            user=user,
            department=department,
            hire_date=datetime.date(2023, 1, 1),
            salary=Decimal("300000"),
            status="active",
        )
        client = _authenticated_client(rh_user)
        response = client.post(GENERER_URL, {"employee_id": employee.pk, "periode": PERIODE}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "pays fiscal" in response.data["detail"]

    def test_missing_employee_id_returns_400(self, rh_user):
        client = _authenticated_client(rh_user)
        response = client.post(GENERER_URL, {"periode": PERIODE}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unknown_employee_returns_404(self, rh_user):
        client = _authenticated_client(rh_user)
        response = client.post(GENERER_URL, {"employee_id": 999999, "periode": PERIODE}, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestListerBulletins:
    """La consultation est ouverte à tout utilisateur authentifié, le cloisonnement
    étant assuré par `get_queryset` : chaque employé ne voit que ses propres bulletins."""

    def _generer_bulletin(self, rh_user, employee) -> None:
        client = _authenticated_client(rh_user)
        response = client.post(
            GENERER_URL,
            {"employee_id": employee.pk, "periode": PERIODE},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_employee_voit_son_propre_bulletin(self, rh_user, employee_user, employee):
        """Régression : `list` était réservé au RH, ce qui empêchait l'employé de
        consulter sa propre paie et rendait la branche employé du queryset morte."""
        self._generer_bulletin(rh_user, employee)

        response = _authenticated_client(employee_user).get(LISTE_URL)

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", response.data)
        assert len(results) == 1
        assert results[0]["employee"] == employee.pk

    def test_employee_ne_voit_pas_le_bulletin_d_un_autre(self, rh_user, employee, department, senegal, non_cadre):
        self._generer_bulletin(rh_user, employee)

        autre_user = UserFactory.create(role=User.Role.EMPLOYEE, first_name="Fatou", last_name="Ba")
        Employee.objects.create(
            user=autre_user,
            department=department,
            hire_date=datetime.date(2023, 1, 1),
            salary=Decimal("300000"),
            pays=senegal,
            categorie_convention=non_cadre,
            status="active",
        )

        response = _authenticated_client(autre_user).get(LISTE_URL)

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", response.data)
        assert results == []

    def test_rh_voit_tous_les_bulletins(self, rh_user, employee):
        self._generer_bulletin(rh_user, employee)

        response = _authenticated_client(rh_user).get(LISTE_URL)

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", response.data)
        assert len(results) == 1

    def test_anonyme_refuse(self, rh_user, employee):
        self._generer_bulletin(rh_user, employee)

        response = APIClient().get(LISTE_URL)

        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_generation_reste_reservee_au_rh(self, employee_user, employee):
        """La génération manipule le moteur de calcul : elle reste RH/Admin."""
        client = _authenticated_client(employee_user)
        response = client.post(GENERER_URL, {"employee_id": employee.pk, "periode": PERIODE}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN
