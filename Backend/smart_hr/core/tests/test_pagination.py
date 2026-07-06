from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position
from smart_hr.users.models import User

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/personnel/employees/"


@pytest.fixture
def rh_user(db) -> User:
    return User.objects.create_user(
        username="rh_pagination",
        email="rh_pagination@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture
def department(db) -> Department:
    return Department.objects.create(name="Pagination Dept")


@pytest.fixture
def position(db) -> Position:
    return Position.objects.create(title="Analyste Pagination")


@pytest.fixture
def thirty_employees(department, position) -> list[Employee]:
    """Régression : la liste employés était plafonnée à PAGE_SIZE=20 sans
    moyen pour le frontend de demander davantage, rendant les employés
    au-delà du 20e invisibles dans les pages de gestion (recherche/tri
    côté client sur un jeu de données déjà tronqué)."""
    employees = []
    for index in range(30):
        user = User.objects.create_user(
            username=f"employee_pagination_{index}",
            email=f"employee_pagination_{index}@test.com",
            password="pass1234!",
            role=User.Role.EMPLOYEE,
            is_email_verified=True,
        )
        employees.append(
            Employee.objects.create(
                user=user,
                department=department,
                position=position,
                hire_date="2023-01-01",
            ),
        )
    return employees


class TestPageSizeOverride:
    def test_default_page_size_is_unchanged(self, rh_user, thirty_employees):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL)
        assert response.status_code == 200
        assert len(response.data["results"]) == 20
        assert response.data["count"] == 30

    def test_client_can_request_a_larger_page_size(self, rh_user, thirty_employees):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL, {"page_size": 100})
        assert response.status_code == 200
        assert len(response.data["results"]) == 30
        assert response.data["count"] == 30


class TestLargeResultsSetPaginationCap:
    """Vérifie le plafond anti-abus (`?page_size=999999999`) sans avoir à
    créer des milliers d'objets réels : test unitaire sur la classe."""

    def test_max_page_size_is_capped(self):
        from smart_hr.core.pagination import LargeResultsSetPagination

        assert LargeResultsSetPagination.max_page_size == 200
        assert LargeResultsSetPagination.page_size_query_param == "page_size"
        assert LargeResultsSetPagination.page_size == 20
