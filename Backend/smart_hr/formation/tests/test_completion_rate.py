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
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

STATS_URL = "/api/v1/formation/formations/completion-stats/"


@pytest.fixture
def department(db) -> Department:
    return Department.objects.create(name="Tech")


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


@pytest.fixture
def employee(employee_user, department) -> Employee:
    return Employee.objects.create(
        user=employee_user,
        department=department,
        hire_date=datetime.date(2023, 1, 1),
        salary=300000,
        status="active",
    )


@pytest.fixture
def other_employee(department) -> Employee:
    other_user = UserFactory.create(role=User.Role.EMPLOYEE)
    return Employee.objects.create(
        user=other_user,
        department=department,
        hire_date=datetime.date(2023, 1, 1),
        salary=300000,
        status="active",
    )


@pytest.fixture
def formation(db) -> Formation:
    now = timezone.now()
    return Formation.objects.create(
        title="Django avancé",
        start_date=now,
        end_date=now + datetime.timedelta(days=1),
        instructor="Alice",
    )


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestParticipationCompletedAtAutoSet:
    def test_completed_at_set_automatically_when_status_becomes_completed(self, employee, formation):
        participation = Participation.objects.create(employee=employee, formation=formation, status=Participation.Status.ENROLLED)
        assert participation.completed_at is None

        participation.status = Participation.Status.COMPLETED
        participation.save()

        assert participation.completed_at == timezone.now().date()

    def test_completed_at_cleared_when_status_moves_away_from_completed(self, employee, formation):
        participation = Participation.objects.create(
            employee=employee, formation=formation, status=Participation.Status.COMPLETED
        )
        assert participation.completed_at is not None

        participation.status = Participation.Status.ABSENT
        participation.save()

        assert participation.completed_at is None

    def test_existing_completed_at_not_overwritten(self, employee, formation):
        fixed_date = datetime.date(2024, 1, 1)
        participation = Participation.objects.create(
            employee=employee,
            formation=formation,
            status=Participation.Status.COMPLETED,
            completed_at=fixed_date,
        )
        participation.save()
        assert participation.completed_at == fixed_date


class TestCompletionStatsEndpoint:
    def test_anonymous_cannot_access(self, formation):
        client = APIClient()
        response = client.get(STATS_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_employee_cannot_access(self, employee_user, formation):
        client = _authenticated_client(employee_user)
        response = client.get(STATS_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_global_completion_rate_computed_correctly(self, rh_user, employee, other_employee, formation):
        Participation.objects.create(employee=employee, formation=formation, status=Participation.Status.COMPLETED)
        Participation.objects.create(employee=other_employee, formation=formation, status=Participation.Status.ENROLLED)

        client = _authenticated_client(rh_user)
        response = client.get(STATS_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["global"]["total_participations"] == 2
        assert response.data["global"]["completed"] == 1
        assert response.data["global"]["completion_rate"] == 50.0

    def test_per_formation_breakdown(self, rh_user, employee, other_employee, formation):
        second_formation = Formation.objects.create(
            title="Sécurité web",
            start_date=timezone.now(),
            end_date=timezone.now() + datetime.timedelta(days=1),
            instructor="Bob",
        )
        Participation.objects.create(employee=employee, formation=formation, status=Participation.Status.COMPLETED)
        Participation.objects.create(employee=other_employee, formation=second_formation, status=Participation.Status.ABSENT)

        client = _authenticated_client(rh_user)
        response = client.get(STATS_URL)

        by_formation = {row["id"]: row for row in response.data["by_formation"]}
        assert by_formation[formation.pk]["completion_rate"] == 100.0
        assert by_formation[second_formation.pk]["completion_rate"] == 0.0

    def test_formation_with_no_participations_reports_zero_not_error(self, rh_user, formation):
        client = _authenticated_client(rh_user)
        response = client.get(STATS_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["global"]["completion_rate"] == 0.0

    def test_by_formation_ordered_by_start_date_descending(self, rh_user, formation):
        client = _authenticated_client(rh_user)
        response = client.get(STATS_URL)
        assert response.data["by_formation"][0]["title"] == "Django avancé"

    def test_global_cost_totals_computed_correctly(self, rh_user, formation):
        formation.cost = 500000
        formation.save()
        second_formation = Formation.objects.create(
            title="Sécurité web",
            start_date=timezone.now(),
            end_date=timezone.now() + datetime.timedelta(days=1),
            instructor="Bob",
            cost=300000,
        )

        client = _authenticated_client(rh_user)
        response = client.get(STATS_URL)

        assert response.data["global"]["total_cost"] == 800000.0
        assert response.data["global"]["average_cost"] == 400000.0
        by_formation = {row["id"]: row for row in response.data["by_formation"]}
        assert by_formation[formation.pk]["cost"] == 500000.0
        assert by_formation[second_formation.pk]["cost"] == 300000.0

    def test_formation_cost_defaults_to_zero(self, rh_user, formation):
        client = _authenticated_client(rh_user)
        response = client.get(STATS_URL)
        assert response.data["global"]["total_cost"] == 0.0
