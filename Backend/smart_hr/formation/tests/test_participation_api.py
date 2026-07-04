from __future__ import annotations

import datetime

import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.formation.models import Formation
from smart_hr.formation.models import Participation
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/formation/participations/"


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
def employee(employee_user) -> Employee:
    department = Department.objects.create(name="Formation Dept")
    position = Position.objects.create(title="Analyste")
    return Employee.objects.create(
        user=employee_user,
        department=department,
        position=position,
        hire_date=datetime.date(2023, 1, 1),
    )


@pytest.fixture
def formation(db) -> Formation:
    return Formation.objects.create(
        title="Formation Django REST",
        description="Approfondissement Django et DRF",
        instructor="Alice Dupont",
        start_date=timezone.datetime(2024, 9, 1, 9, 0, tzinfo=datetime.UTC),
        end_date=timezone.datetime(2024, 9, 3, 17, 0, tzinfo=datetime.UTC),
    )


@pytest.fixture
def participation(employee, formation) -> Participation:
    return Participation.objects.create(employee=employee, formation=formation)


class TestParticipationVisibility:
    def test_employee_can_list_own_participations(self, employee_user, participation):
        """Régression : la vue filtrait avec `employee=user` (User) au lieu de
        `employee__user=user`, provoquant un 500 (ValueError)."""
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_employee_sees_only_own_participations(self, other_employee_user, participation):
        client = APIClient()
        client.force_authenticate(user=other_employee_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 0

    def test_rh_can_list_all_participations(self, rh_user, participation):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
