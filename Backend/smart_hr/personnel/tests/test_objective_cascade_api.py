from __future__ import annotations

import datetime

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Objective
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/personnel/objectives/"


@pytest.fixture
def department(db) -> Department:
    return Department.objects.create(name="Commercial")


@pytest.fixture
def other_department(db) -> Department:
    return Department.objects.create(name="Technologie")


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


@pytest.fixture
def employee(db, employee_user, department) -> Employee:
    return Employee.objects.create(user=employee_user, department=department, hire_date=datetime.date(2023, 1, 1))


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestCreateCascadeObjective:
    def test_rh_can_create_company_level_objective(self, rh_user):
        client = _authenticated_client(rh_user)
        payload = {
            "level": "company",
            "title": "Croissance du CA de 20%",
            "period": "2026",
            "key_results": [{"title": "CA annuel", "unit": "FCFA", "target_value": 1000000000}],
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        objective = Objective.objects.get(pk=response.data["id"])
        assert objective.level == Objective.Level.COMPANY
        assert objective.employee is None
        assert objective.department is None

    def test_rh_can_create_department_level_objective(self, rh_user, department):
        client = _authenticated_client(rh_user)
        payload = {
            "level": "department",
            "department": department.pk,
            "title": "Signer 10 nouveaux clients",
            "period": "Q1 2026",
            "key_results": [{"title": "Nouveaux clients", "unit": "clients", "target_value": 10}],
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        objective = Objective.objects.get(pk=response.data["id"])
        assert objective.level == Objective.Level.DEPARTMENT
        assert objective.department == department

    def test_department_level_requires_department(self, rh_user):
        client = _authenticated_client(rh_user)
        payload = {"level": "department", "title": "Sans département", "period": "Q1 2026", "key_results": [{"title": "KR"}]}
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_employee_cannot_create_department_or_company_objective(self, employee_user, department):
        client = _authenticated_client(employee_user)
        payload = {
            "level": "department",
            "department": department.pk,
            "title": "Objectif interdit",
            "period": "Q1 2026",
            "key_results": [{"title": "KR"}],
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_without_employee_profile_cannot_create_individual_objective_without_target(self, employee_user):
        """Utilisateur EMPLOYEE sans profil Employee associé, et sans employee dans le payload :
        doit être rejeté en 403, pas laissé passer par une comparaison None == None."""
        client = _authenticated_client(employee_user)
        payload = {
            "level": "individual",
            "title": "Objectif sans cible",
            "period": "Q1 2026",
            "key_results": [{"title": "KR"}],
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_individual_objective_can_be_linked_to_department_parent(self, rh_user, employee, department):
        department_objective = Objective.objects.create(
            level=Objective.Level.DEPARTMENT, department=department, title="Objectif dept", period="Q1 2026"
        )
        client = _authenticated_client(rh_user)
        payload = {
            "level": "individual",
            "employee": employee.pk,
            "parent": department_objective.pk,
            "title": "Contribuer à l'objectif du département",
            "period": "Q1 2026",
            "key_results": [{"title": "KR", "target_value": 5}],
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        objective = Objective.objects.get(pk=response.data["id"])
        assert objective.parent == department_objective


class TestListCascadeObjective:
    def test_employee_sees_company_and_own_department_objectives(self, employee_user, employee, department, other_department):
        Objective.objects.create(level=Objective.Level.COMPANY, title="Stratégie entreprise", period="2026")
        Objective.objects.create(
            level=Objective.Level.DEPARTMENT, department=department, title="Objectif mon dept", period="2026"
        )
        Objective.objects.create(
            level=Objective.Level.DEPARTMENT, department=other_department, title="Objectif autre dept", period="2026"
        )
        Objective.objects.create(level=Objective.Level.INDIVIDUAL, employee=employee, title="Mon objectif", period="2026")

        client = _authenticated_client(employee_user)
        response = client.get(LIST_URL)
        results = response.data.get("results", response.data)
        titles = {item["title"] for item in results}
        assert titles == {"Stratégie entreprise", "Objectif mon dept", "Mon objectif"}

    def test_rh_can_filter_by_level(self, rh_user, employee):
        Objective.objects.create(level=Objective.Level.COMPANY, title="Company", period="2026")
        Objective.objects.create(level=Objective.Level.INDIVIDUAL, employee=employee, title="Individual", period="2026")

        client = _authenticated_client(rh_user)
        response = client.get(LIST_URL, {"level": "company"})
        results = response.data.get("results", response.data)
        assert len(results) == 1
        assert results[0]["title"] == "Company"
