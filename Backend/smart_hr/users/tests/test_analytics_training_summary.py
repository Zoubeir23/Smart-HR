from __future__ import annotations

import datetime

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from smart_hr.formation.models import Formation
from smart_hr.formation.models import Participation
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

ANALYTICS_URL = "/api/v1/stats/overview/"


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def department(db) -> Department:
    return Department.objects.create(name="Support")


@pytest.fixture
def employee(db, department) -> Employee:
    user = UserFactory.create(role=User.Role.EMPLOYEE)
    return Employee.objects.create(user=user, department=department, hire_date=datetime.date(2023, 1, 1))


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestTrainingSummaryInAnalytics:
    def test_training_summary_present_with_cost_and_completion_rate(self, rh_user, employee):
        now = timezone.now()
        formation = Formation.objects.create(
            title="Django avancé",
            start_date=now,
            end_date=now + datetime.timedelta(days=1),
            instructor="Alice",
            cost=200000,
        )
        Participation.objects.create(employee=employee, formation=formation, status=Participation.Status.COMPLETED)

        client = _authenticated_client(rh_user)
        response = client.get(ANALYTICS_URL)

        training_summary = response.data["training_summary"]
        assert training_summary["total_formations"] == 1
        assert training_summary["total_cost"] == 200000.0
        assert training_summary["total_participations"] == 1
        assert training_summary["completed_participations"] == 1
        assert training_summary["completion_rate"] == 100.0

    def test_training_summary_defaults_to_zero_without_formations(self, rh_user):
        client = _authenticated_client(rh_user)
        response = client.get(ANALYTICS_URL)

        training_summary = response.data["training_summary"]
        assert training_summary["total_formations"] == 0
        assert training_summary["total_cost"] == 0.0
        assert training_summary["completion_rate"] == 0.0
