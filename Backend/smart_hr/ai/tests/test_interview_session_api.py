from __future__ import annotations

import uuid

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.ai.models import InterviewSession
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

SESSION_LIST_URL = "/api/v1/ai/interview/sessions/"
SESSION_CREATE_URL = "/api/v1/ai/interview/sessions/create/"


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


@pytest.fixture
def interview_session(db, rh_user) -> InterviewSession:
    return InterviewSession.objects.create(
        job_position="Développeur Django",
        job_description="Poste backend Django/DRF",
        duration="45 Min",
        interview_type="Technique",
        questions=[{"question": "Expliquez le cycle de vie Django"}],
        status=InterviewSession.Status.ACTIVE,
        created_by=rh_user,
    )


class TestInterviewSessionList:
    def test_rh_can_list_sessions(self, db, rh_user, interview_session):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(SESSION_LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_employee_cannot_list_sessions(self, db, employee_user, interview_session):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(SESSION_LIST_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_list_sessions(self, db, interview_session):
        client = APIClient()
        response = client.get(SESSION_LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestInterviewSessionDetail:
    def test_anyone_can_retrieve_session_by_token(self, db, interview_session):
        client = APIClient()
        url = f"/api/v1/ai/interview/sessions/{interview_session.token}/"
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["job_position"] == "Développeur Django"

    def test_invalid_token_returns_404(self, db):
        client = APIClient()
        url = f"/api/v1/ai/interview/sessions/{uuid.uuid4()}/"
        response = client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_closed_session_returns_410(self, db, rh_user):
        closed_session = InterviewSession.objects.create(
            job_position="Poste fermé",
            job_description="Session terminée",
            questions=[],
            status=InterviewSession.Status.CLOSED,
            created_by=rh_user,
        )
        client = APIClient()
        url = f"/api/v1/ai/interview/sessions/{closed_session.token}/"
        response = client.get(url)
        assert response.status_code == status.HTTP_410_GONE


class TestInterviewSessionCreate:
    def test_rh_can_create_session(self, db, rh_user):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        payload = {
            "job_position": "Développeur Python",
            "job_description": "Poste backend Python",
            "duration": "30 Min",
            "interview_type": "Technique",
            "questions": [{"question": "Expliquez le ORM Django"}],
        }
        response = client.post(SESSION_CREATE_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert "token" in response.data
        assert response.data["job_position"] == "Développeur Python"

    def test_employee_cannot_create_session(self, db, employee_user):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        payload = {
            "job_position": "Tentative",
            "job_description": "Non autorisé",
        }
        response = client.post(SESSION_CREATE_URL, payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_create_session(self, db):
        client = APIClient()
        payload = {
            "job_position": "Tentative anonyme",
        }
        response = client.post(SESSION_CREATE_URL, payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
