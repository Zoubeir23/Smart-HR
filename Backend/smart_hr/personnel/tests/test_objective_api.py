from __future__ import annotations

import datetime

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import KeyResult
from smart_hr.personnel.models import Objective
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/personnel/objectives/"


@pytest.fixture
def department(db) -> Department:
    return Department.objects.create(name="Technologie")


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE, first_name="Awa", last_name="Diallo")


@pytest.fixture
def other_employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE, first_name="Moussa", last_name="Sow")


@pytest.fixture
def employee(employee_user, department) -> Employee:
    return Employee.objects.create(
        user=employee_user,
        department=department,
        hire_date=datetime.date(2026, 1, 1),
        salary=300000,
        status="active",
    )


@pytest.fixture
def other_employee(other_employee_user, department) -> Employee:
    return Employee.objects.create(
        user=other_employee_user,
        department=department,
        hire_date=datetime.date(2020, 1, 1),
        salary=300000,
        status="active",
    )


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestCreateObjective:
    def test_anonymous_cannot_create(self, employee):
        client = APIClient()
        response = client.post(
            LIST_URL,
            {"employee": employee.pk, "title": "Améliorer la couverture de tests", "period": "Q1 2026", "key_results": []},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_employee_can_create_own_objective(self, employee_user, employee):
        client = _authenticated_client(employee_user)
        payload = {
            "employee": employee.pk,
            "title": "Améliorer la couverture de tests",
            "period": "Q1 2026",
            "key_results": [{"title": "Atteindre 80% de couverture", "unit": "%", "target_value": 80}],
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert Objective.objects.filter(employee=employee).count() == 1

    def test_employee_cannot_create_objective_for_another_employee(self, employee_user, other_employee):
        client = _authenticated_client(employee_user)
        payload = {
            "employee": other_employee.pk,
            "title": "Objectif",
            "period": "Q1 2026",
            "key_results": [{"title": "KR", "unit": "", "target_value": 10}],
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rh_can_create_objective_for_any_employee(self, rh_user, employee):
        client = _authenticated_client(rh_user)
        payload = {
            "employee": employee.pk,
            "title": "Recruter 3 développeurs",
            "period": "Q1 2026",
            "key_results": [
                {"title": "Publier 3 offres", "unit": "offres", "target_value": 3},
                {"title": "Signer 3 contrats", "unit": "contrats", "target_value": 3},
            ],
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        objective = Objective.objects.get(pk=response.data["id"])
        assert objective.key_results.count() == 2
        assert response.data["progress"] == 0
        assert response.data["status"] == "not_started"

    def test_requires_at_least_one_key_result(self, rh_user, employee):
        client = _authenticated_client(rh_user)
        payload = {"employee": employee.pk, "title": "Vide", "period": "Q1 2026", "key_results": []}
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_rejects_key_results_with_only_empty_titles(self, rh_user, employee):
        client = _authenticated_client(rh_user)
        payload = {
            "employee": employee.pk,
            "title": "Objectif",
            "period": "Q1 2026",
            "key_results": [{"title": "", "target_value": 10}],
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert not Objective.objects.filter(title="Objectif").exists()


class TestListObjectives:
    def test_rh_sees_all_objectives(self, rh_user, employee, other_employee):
        Objective.objects.create(employee=employee, title="A", period="Q1 2026")
        Objective.objects.create(employee=other_employee, title="B", period="Q1 2026")
        client = _authenticated_client(rh_user)
        response = client.get(LIST_URL)
        results = response.data.get("results", response.data)
        assert len(results) == 2

    def test_employee_sees_only_own_objectives(self, employee_user, employee, other_employee):
        Objective.objects.create(employee=employee, title="Mine", period="Q1 2026")
        Objective.objects.create(employee=other_employee, title="Not mine", period="Q1 2026")
        client = _authenticated_client(employee_user)
        response = client.get(LIST_URL)
        results = response.data.get("results", response.data)
        assert len(results) == 1
        assert results[0]["title"] == "Mine"


class TestUpdateKeyResultProgress:
    def test_owner_can_update_current_value(self, employee_user, employee):
        objective = Objective.objects.create(employee=employee, title="Test", period="Q1 2026")
        key_result = KeyResult.objects.create(objective=objective, title="KR", target_value=10, current_value=0)

        client = _authenticated_client(employee_user)
        url = f"{LIST_URL}{objective.pk}/key-results/{key_result.pk}/"
        response = client.patch(url, {"current_value": 4}, format="json")

        assert response.status_code == status.HTTP_200_OK
        key_result.refresh_from_db()
        assert key_result.current_value == 4
        assert response.data["progress"] == 40

    def test_objective_status_becomes_completed_when_key_results_reach_target(self, employee_user, employee):
        objective = Objective.objects.create(employee=employee, title="Test", period="Q1 2026")
        key_result = KeyResult.objects.create(objective=objective, title="KR", target_value=10, current_value=0)
        client = _authenticated_client(employee_user)
        url = f"{LIST_URL}{objective.pk}/key-results/{key_result.pk}/"

        client.patch(url, {"current_value": 10}, format="json")

        detail = client.get(f"{LIST_URL}{objective.pk}/")
        assert detail.data["status"] == "completed"
        assert detail.data["progress"] == 100

    def test_employee_cannot_update_another_employees_key_result(self, other_employee_user, employee):
        objective = Objective.objects.create(employee=employee, title="Test", period="Q1 2026")
        key_result = KeyResult.objects.create(objective=objective, title="KR", target_value=10, current_value=0)
        client = _authenticated_client(other_employee_user)
        url = f"{LIST_URL}{objective.pk}/key-results/{key_result.pk}/"
        response = client.patch(url, {"current_value": 4}, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_rh_can_update_any_key_result(self, rh_user, employee):
        objective = Objective.objects.create(employee=employee, title="Test", period="Q1 2026")
        key_result = KeyResult.objects.create(objective=objective, title="KR", target_value=10, current_value=0)
        client = _authenticated_client(rh_user)
        url = f"{LIST_URL}{objective.pk}/key-results/{key_result.pk}/"
        response = client.patch(url, {"current_value": 7}, format="json")
        assert response.status_code == status.HTTP_200_OK


class TestDestroyObjective:
    def test_employee_cannot_delete_own_objective(self, employee_user, employee):
        objective = Objective.objects.create(employee=employee, title="Test", period="Q1 2026")
        client = _authenticated_client(employee_user)
        response = client.delete(f"{LIST_URL}{objective.pk}/")
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert Objective.objects.filter(pk=objective.pk).exists()

    def test_rh_can_delete_any_objective(self, rh_user, employee):
        objective = Objective.objects.create(employee=employee, title="Test", period="Q1 2026")
        client = _authenticated_client(rh_user)
        response = client.delete(f"{LIST_URL}{objective.pk}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Objective.objects.filter(pk=objective.pk).exists()
