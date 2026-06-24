from __future__ import annotations

import datetime

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.discipline.models import DisciplinaryAction
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position
from smart_hr.users.models import User

LIST_URL = "/api/v1/discipline/actions/"


@pytest.fixture
def department(db):
    return Department.objects.create(name="Engineering")


@pytest.fixture
def position(db):
    return Position.objects.create(title="Developer")


@pytest.fixture
def rh_user(db) -> User:
    return User.objects.create_user(
        username="rh_disc",
        email="rh_disc@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture
def employee_user(db) -> User:
    return User.objects.create_user(
        username="emp_disc",
        email="emp_disc@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture
def other_employee_user(db) -> User:
    return User.objects.create_user(
        username="other_disc",
        email="other_disc@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture
def employee(db, employee_user, department, position) -> Employee:
    return Employee.objects.create(
        user=employee_user,
        department=department,
        position=position,
        hire_date=datetime.date(2023, 1, 1),
        salary=500000,
    )


@pytest.fixture
def other_employee(db, other_employee_user, department, position) -> Employee:
    return Employee.objects.create(
        user=other_employee_user,
        department=department,
        position=position,
        hire_date=datetime.date(2023, 6, 1),
        salary=450000,
    )


@pytest.fixture
def warning_action(db, employee, rh_user) -> DisciplinaryAction:
    return DisciplinaryAction.objects.create(
        employee=employee,
        action_type=DisciplinaryAction.ActionType.WARNING,
        reason="Retards répétés",
        incident_date=datetime.date(2024, 3, 10),
        issued_date=datetime.date(2024, 3, 12),
        issued_by=rh_user,
    )


@pytest.fixture
def reprimand_action(db, other_employee, rh_user) -> DisciplinaryAction:
    return DisciplinaryAction.objects.create(
        employee=other_employee,
        action_type=DisciplinaryAction.ActionType.REPRIMAND,
        reason="Manquement au règlement",
        incident_date=datetime.date(2024, 4, 5),
        issued_date=datetime.date(2024, 4, 6),
        issued_by=rh_user,
    )


class TestDisciplinaryActionVisibility:
    def test_rh_sees_all_actions(self, db, rh_user, warning_action, reprimand_action):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_employee_sees_only_own_actions(
        self, db, employee_user, warning_action, reprimand_action
    ):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["reason"] == "Retards répétés"

    def test_employee_without_employee_profile_sees_nothing(
        self, db, reprimand_action
    ):
        user_no_profile = User.objects.create_user(
            username="no_profile_disc",
            email="no_profile_disc@test.com",
            password="pass1234!",
            role=User.Role.EMPLOYEE,
            is_email_verified=True,
        )
        client = APIClient()
        client.force_authenticate(user=user_no_profile)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 0

    def test_anonymous_cannot_list_actions(self, db, warning_action):
        client = APIClient()
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_rh_can_filter_by_action_type(self, db, rh_user, warning_action, reprimand_action):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL, {"action_type": DisciplinaryAction.ActionType.WARNING})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_rh_can_filter_by_employee_id(
        self, db, rh_user, employee, warning_action, reprimand_action
    ):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL, {"employee_id": employee.pk})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1


class TestDisciplinaryActionCRUD:
    def test_rh_can_create_action(self, db, rh_user, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        payload = {
            "employee": employee.pk,
            "action_type": DisciplinaryAction.ActionType.REPRIMAND,
            "reason": "Non-respect du règlement intérieur",
            "incident_date": "2024-05-01",
            "issued_date": "2024-05-03",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["reason"] == "Non-respect du règlement intérieur"

    def test_employee_cannot_create_action(self, db, employee_user, employee):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        payload = {
            "employee": employee.pk,
            "action_type": DisciplinaryAction.ActionType.REPRIMAND,
            "reason": "Tentative non autorisée",
            "incident_date": "2024-05-01",
            "issued_date": "2024-05-03",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rh_can_update_action(self, db, rh_user, warning_action):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.patch(
            f"{LIST_URL}{warning_action.pk}/",
            {"reason": "Raison mise à jour"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["reason"] == "Raison mise à jour"

    def test_rh_can_delete_action(self, db, rh_user, warning_action):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.delete(f"{LIST_URL}{warning_action.pk}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
