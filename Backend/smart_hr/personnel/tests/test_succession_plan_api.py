from __future__ import annotations

import datetime

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position
from smart_hr.personnel.models import SuccessionCandidate
from smart_hr.personnel.models import SuccessionPlan
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/personnel/succession-plans/"


@pytest.fixture
def department(db) -> Department:
    return Department.objects.create(name="Direction")


@pytest.fixture
def position(db) -> Position:
    return Position.objects.create(title="Directeur Général")


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


@pytest.fixture
def candidate_employee(db, department) -> Employee:
    user = UserFactory.create(role=User.Role.EMPLOYEE)
    return Employee.objects.create(user=user, department=department, hire_date=datetime.date(2020, 1, 1))


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestSuccessionPlan:
    def test_rh_can_create_plan(self, rh_user, position):
        client = _authenticated_client(rh_user)
        response = client.post(LIST_URL, {"position": position.pk, "notes": "Poste critique"}, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert SuccessionPlan.objects.filter(position=position).exists()

    def test_employee_cannot_access_succession_plans(self, employee_user, position):
        client = _authenticated_client(employee_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rh_can_add_candidate_with_readiness(self, rh_user, position, candidate_employee):
        plan = SuccessionPlan.objects.create(position=position)
        client = _authenticated_client(rh_user)
        response = client.post(
            f"{LIST_URL}{plan.pk}/candidates/",
            {"employee": candidate_employee.pk, "readiness": "ready_now", "notes": "Prêt dès maintenant"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert SuccessionCandidate.objects.filter(plan=plan, employee=candidate_employee, readiness="ready_now").exists()

    def test_cannot_add_same_candidate_twice(self, rh_user, position, candidate_employee):
        plan = SuccessionPlan.objects.create(position=position)
        SuccessionCandidate.objects.create(plan=plan, employee=candidate_employee, readiness="ready_now")
        client = _authenticated_client(rh_user)
        response = client.post(
            f"{LIST_URL}{plan.pk}/candidates/",
            {"employee": candidate_employee.pk, "readiness": "ready_1_2_years"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
