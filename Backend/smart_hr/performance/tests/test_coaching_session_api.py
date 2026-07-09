from __future__ import annotations

import datetime

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.performance.models import CoachingSession
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.users.models import User

LIST_URL = "/api/v1/performance/coaching-sessions/"


@pytest.fixture
def department(db):
    return Department.objects.create(name="RH")


@pytest.fixture
def rh_user(db) -> User:
    return User.objects.create_user(
        username="rh_coaching",
        email="rh_coaching@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture
def coach_user(db) -> User:
    return User.objects.create_user(
        username="coach_user",
        email="coach_user@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture
def coachee_user(db) -> User:
    return User.objects.create_user(
        username="coachee_user",
        email="coachee_user@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture
def outsider_user(db) -> User:
    return User.objects.create_user(
        username="outsider_coaching",
        email="outsider_coaching@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture
def coach_employee(db, coach_user, department) -> Employee:
    return Employee.objects.create(user=coach_user, department=department, hire_date=datetime.date(2020, 1, 1))


@pytest.fixture
def coachee_employee(db, coachee_user, department) -> Employee:
    return Employee.objects.create(user=coachee_user, department=department, hire_date=datetime.date(2023, 1, 1))


@pytest.fixture
def outsider_employee(db, outsider_user, department) -> Employee:
    return Employee.objects.create(user=outsider_user, department=department, hire_date=datetime.date(2023, 1, 1))


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestCreateCoachingSession:
    def test_rh_can_schedule_a_session(self, rh_user, coach_employee, coachee_employee):
        client = _authenticated_client(rh_user)
        payload = {
            "coach": coach_employee.pk,
            "coachee": coachee_employee.pk,
            "scheduled_at": "2026-08-01T10:00:00Z",
            "topic": "Prise de poste manager",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert CoachingSession.objects.filter(coach=coach_employee, coachee=coachee_employee).exists()

    def test_employee_cannot_schedule_a_session(self, coach_employee, coachee_employee):
        client = _authenticated_client(coach_employee.user)
        payload = {
            "coach": coach_employee.pk,
            "coachee": coachee_employee.pk,
            "scheduled_at": "2026-08-01T10:00:00Z",
            "topic": "Auto-planification",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_coach_and_coachee_cannot_be_the_same_person(self, rh_user, coach_employee):
        client = _authenticated_client(rh_user)
        payload = {
            "coach": coach_employee.pk,
            "coachee": coach_employee.pk,
            "scheduled_at": "2026-08-01T10:00:00Z",
            "topic": "Session avec soi-même",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestListCoachingSession:
    def test_participant_sees_own_sessions_only(self, rh_user, coach_employee, coachee_employee, outsider_employee):
        CoachingSession.objects.create(
            coach=coach_employee,
            coachee=coachee_employee,
            scheduled_at=datetime.datetime(2026, 8, 1, 10, 0, tzinfo=datetime.UTC),
            topic="Session concernée",
        )
        CoachingSession.objects.create(
            coach=outsider_employee,
            coachee=coach_employee,
            scheduled_at=datetime.datetime(2026, 8, 2, 10, 0, tzinfo=datetime.UTC),
            topic="Session non concernée pour coachee",
        )

        client = _authenticated_client(coachee_employee.user)
        response = client.get(LIST_URL)
        results = response.data.get("results", response.data)
        topics = {item["topic"] for item in results}
        assert topics == {"Session concernée"}

    def test_rh_sees_all_sessions(self, rh_user, coach_employee, coachee_employee):
        CoachingSession.objects.create(
            coach=coach_employee,
            coachee=coachee_employee,
            scheduled_at=datetime.datetime(2026, 8, 1, 10, 0, tzinfo=datetime.UTC),
            topic="Session 1",
        )
        client = _authenticated_client(rh_user)
        response = client.get(LIST_URL)
        results = response.data.get("results", response.data)
        assert len(results) == 1
