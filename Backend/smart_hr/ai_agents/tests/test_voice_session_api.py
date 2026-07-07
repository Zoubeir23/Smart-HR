from __future__ import annotations

from unittest.mock import patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.ai_agents.models import VoiceMessage
from smart_hr.ai_agents.models import VoiceSession
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

VOICE_SESSIONS_URL = "/api/v1/agents/voice/sessions/"
VOICE_ASK_URL = "/api/v1/agents/voice/ask/"


@pytest.fixture
def user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


@pytest.fixture
def other_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


@pytest.fixture
def session(user) -> VoiceSession:
    return VoiceSession.objects.create(user=user, title="Ma première session")


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestVoiceSessionListCreate:
    def test_anonymous_cannot_list(self, db):
        client = APIClient()
        response = client.get(VOICE_SESSIONS_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_lists_only_own_sessions(self, user, other_user, session):
        VoiceSession.objects.create(user=other_user, title="Session d'un autre")
        client = _authenticated_client(user)
        response = client.get(VOICE_SESSIONS_URL)
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", response.data)
        titles = [item["title"] for item in results]
        assert titles == ["Ma première session"]

    def test_create_returns_new_session(self, user):
        client = _authenticated_client(user)
        response = client.post(VOICE_SESSIONS_URL, {}, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert VoiceSession.objects.filter(user=user).count() == 1


class TestVoiceSessionDelete:
    def test_owner_can_delete_own_session(self, user, session):
        client = _authenticated_client(user)
        response = client.delete(f"{VOICE_SESSIONS_URL}{session.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not VoiceSession.objects.filter(id=session.id).exists()

    def test_delete_cascades_to_messages(self, user, session):
        VoiceMessage.objects.create(session=session, question="Q", response="R")
        client = _authenticated_client(user)
        client.delete(f"{VOICE_SESSIONS_URL}{session.id}/")
        assert not VoiceMessage.objects.filter(session_id=session.id).exists()

    def test_cannot_delete_another_users_session(self, other_user, session):
        client = _authenticated_client(other_user)
        response = client.delete(f"{VOICE_SESSIONS_URL}{session.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert VoiceSession.objects.filter(id=session.id).exists()


class TestVoiceSessionMessages:
    def test_lists_messages_in_chronological_order(self, session):
        VoiceMessage.objects.create(session=session, question="Premier", response="R1")
        VoiceMessage.objects.create(session=session, question="Second", response="R2")
        client = _authenticated_client(session.user)
        response = client.get(f"{VOICE_SESSIONS_URL}{session.id}/messages/")
        assert response.status_code == status.HTTP_200_OK
        questions = [item["question"] for item in response.data]
        assert questions == ["Premier", "Second"]

    def test_cannot_list_messages_of_another_users_session(self, other_user, session):
        client = _authenticated_client(other_user)
        response = client.get(f"{VOICE_SESSIONS_URL}{session.id}/messages/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestVoiceAskPersistsHistory:
    def test_first_question_without_session_creates_one(self, user):
        client = _authenticated_client(user)
        with patch("smart_hr.ai_agents.views._generate_audio_file", return_value=None):
            response = client.post(VOICE_ASK_URL, {"question": "Quels sont mes congés restants ?"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["session"] is not None
        created = VoiceSession.objects.get(id=response.data["session"])
        assert created.user == user
        assert created.title.startswith("Quels sont mes congés")
        assert VoiceMessage.objects.filter(session=created).count() == 1

    def test_second_question_reuses_provided_session_id(self, user, session):
        client = _authenticated_client(user)
        with patch("smart_hr.ai_agents.views._generate_audio_file", return_value=None):
            response = client.post(
                VOICE_ASK_URL,
                {"question": "Et pour la paie ?", "session": session.id},
                format="json",
            )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["session"] == session.id
        assert VoiceMessage.objects.filter(session=session).count() == 1

    def test_cannot_post_to_another_users_session(self, other_user, session):
        client = _authenticated_client(other_user)
        response = client.post(
            VOICE_ASK_URL,
            {"question": "Question interdite", "session": session.id},
            format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
