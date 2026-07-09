from __future__ import annotations

import datetime

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.communication.models import DistressAlert
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/communication/distress-alerts/"


@pytest.fixture
def department(db) -> Department:
    return Department.objects.create(name="Support")


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


@pytest.fixture
def other_employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


@pytest.fixture
def employee(db, employee_user, department) -> Employee:
    return Employee.objects.create(user=employee_user, department=department, hire_date=datetime.date(2023, 1, 1))


@pytest.fixture
def other_employee(db, other_employee_user, department) -> Employee:
    return Employee.objects.create(user=other_employee_user, department=department, hire_date=datetime.date(2023, 1, 1))


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestCreateDistressAlert:
    def test_employee_can_trigger_alert_for_self(self, employee):
        client = _authenticated_client(employee.user)
        response = client.post(LIST_URL, {"message": "Je ne me sens pas bien au travail."}, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        alert = DistressAlert.objects.get(pk=response.data["id"])
        assert alert.employee == employee
        assert alert.status == DistressAlert.Status.NEW

    def test_anonymous_cannot_create(self):
        client = APIClient()
        response = client.post(LIST_URL, {"message": "x"}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestListDistressAlert:
    def test_employee_sees_only_own_alerts(self, employee, other_employee):
        DistressAlert.objects.create(employee=employee, message="Alerte perso")
        DistressAlert.objects.create(employee=other_employee, message="Alerte autre employé")

        client = _authenticated_client(employee.user)
        response = client.get(LIST_URL)
        results = response.data.get("results", response.data)
        messages = {item["message"] for item in results}
        assert messages == {"Alerte perso"}

    def test_rh_sees_all_alerts_and_can_filter_by_status(self, rh_user, employee, other_employee):
        DistressAlert.objects.create(employee=employee, message="A", status=DistressAlert.Status.NEW)
        DistressAlert.objects.create(employee=other_employee, message="B", status=DistressAlert.Status.RESOLVED)

        client = _authenticated_client(rh_user)
        response = client.get(LIST_URL)
        results = response.data.get("results", response.data)
        assert len(results) == 2

        response = client.get(LIST_URL, {"status": "resolved"})
        results = response.data.get("results", response.data)
        assert len(results) == 1
        assert results[0]["message"] == "B"


class TestUpdateDistressAlert:
    def test_rh_can_change_status_and_gets_recorded_as_handler(self, rh_user, employee):
        alert = DistressAlert.objects.create(employee=employee, message="Besoin d'aide")
        client = _authenticated_client(rh_user)
        response = client.patch(f"{LIST_URL}{alert.pk}/", {"status": "acknowledged"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        alert.refresh_from_db()
        assert alert.status == DistressAlert.Status.ACKNOWLEDGED
        assert alert.handled_by == rh_user

    def test_resolving_sets_resolved_at(self, rh_user, employee):
        alert = DistressAlert.objects.create(employee=employee, message="Besoin d'aide")
        client = _authenticated_client(rh_user)
        response = client.patch(f"{LIST_URL}{alert.pk}/", {"status": "resolved"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        alert.refresh_from_db()
        assert alert.status == DistressAlert.Status.RESOLVED
        assert alert.resolved_at is not None

    def test_employee_cannot_update_alert_status(self, employee):
        alert = DistressAlert.objects.create(employee=employee, message="Besoin d'aide")
        client = _authenticated_client(employee.user)
        response = client.patch(f"{LIST_URL}{alert.pk}/", {"status": "resolved"}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN
