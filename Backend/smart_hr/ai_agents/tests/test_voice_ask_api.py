from __future__ import annotations

from unittest.mock import patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

VOICE_ASK_URL = "/api/v1/agents/voice/ask/"


@pytest.fixture
def authenticated_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


class TestVoiceAskAuthentication:
    def test_anonymous_cannot_ask(self, db):
        client = APIClient()
        response = client.post(VOICE_ASK_URL, {"question": "Combien de jours de congé ?"}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_user_can_ask(self, db, authenticated_user):
        client = APIClient()
        client.force_authenticate(user=authenticated_user)
        with patch("smart_hr.ai_agents.views._generate_audio_file", return_value=None):
            response = client.post(VOICE_ASK_URL, {"question": "Combien de jours de congé ?"}, format="json")
        assert response.status_code == status.HTTP_200_OK


class TestVoiceAskValidation:
    def test_missing_question_returns_400(self, db, authenticated_user):
        client = APIClient()
        client.force_authenticate(user=authenticated_user)
        response = client.post(VOICE_ASK_URL, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "question" in response.data["detail"]

    def test_empty_question_returns_400(self, db, authenticated_user):
        client = APIClient()
        client.force_authenticate(user=authenticated_user)
        response = client.post(VOICE_ASK_URL, {"question": "   "}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_voice_defaults_to_nova(self, db, authenticated_user):
        client = APIClient()
        client.force_authenticate(user=authenticated_user)
        with patch("smart_hr.ai_agents.views._generate_audio_file", return_value=None):
            response = client.post(VOICE_ASK_URL, {"question": "congé", "voice": "invalid_voice"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["voice"] == "nova"


class TestVoiceAskResponse:
    def test_response_contains_required_fields(self, db, authenticated_user):
        client = APIClient()
        client.force_authenticate(user=authenticated_user)
        with patch("smart_hr.ai_agents.views._generate_audio_file", return_value=None):
            response = client.post(VOICE_ASK_URL, {"question": "formation"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "text_response" in response.data
        assert "audio_url" in response.data
        assert "mode" in response.data
        assert "voice" in response.data

    def test_faq_keyword_returns_relevant_answer(self, db, authenticated_user):
        client = APIClient()
        client.force_authenticate(user=authenticated_user)
        with (
            patch("smart_hr.ai_agents.views._generate_audio_file", return_value=None),
            patch("smart_hr.ai_agents.views._generate_voice_response", return_value="Les formations sont accessibles..."),
        ):
            response = client.post(VOICE_ASK_URL, {"question": "formation disponible ?"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "formation" in response.data["text_response"].lower()

    def test_no_audio_gives_text_only_mode(self, db, authenticated_user):
        client = APIClient()
        client.force_authenticate(user=authenticated_user)
        with patch("smart_hr.ai_agents.views._generate_audio_file", return_value=None):
            response = client.post(VOICE_ASK_URL, {"question": "congé"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["mode"] == "text_only"
        assert response.data["audio_url"] is None

    def test_valid_voices_accepted(self, db, authenticated_user):
        client = APIClient()
        client.force_authenticate(user=authenticated_user)
        for voice in ("nova", "alloy", "echo"):
            with patch("smart_hr.ai_agents.views._generate_audio_file", return_value=None):
                response = client.post(VOICE_ASK_URL, {"question": "congé", "voice": voice}, format="json")
            assert response.status_code == status.HTTP_200_OK
            assert response.data["voice"] == voice

    def test_rh_user_can_also_ask(self, db, rh_user):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        with patch("smart_hr.ai_agents.views._generate_audio_file", return_value=None):
            response = client.post(VOICE_ASK_URL, {"question": "avantages entreprise"}, format="json")
        assert response.status_code == status.HTTP_200_OK


class _FakeLLMProvider:
    """Capture le system_prompt reçu, pour vérifier son contenu RBAC/DB sans appel réseau réel."""

    def __init__(self):
        self.received_system_prompt: str | None = None

    def generate_response(self, system_prompt, history, question):
        self.received_system_prompt = system_prompt
        return "Réponse vocale de test."

    def extract_json(self, prompt):
        return "{}"


class TestVoiceAskDatabaseGrounding:
    """L'assistant vocal doit utiliser le même moteur de contexte RBAC que le
    chat texte (smart_hr.ai.context_builder), au lieu d'un prompt générique."""

    def test_uses_llm_provider_with_role_scoped_system_prompt(self, db, authenticated_user):
        fake_provider = _FakeLLMProvider()
        client = APIClient()
        client.force_authenticate(user=authenticated_user)
        with (
            patch("smart_hr.ai_agents.views._generate_audio_file", return_value=None),
            patch("smart_hr.ai_agents.views.get_llm_provider", return_value=fake_provider),
        ):
            response = client.post(VOICE_ASK_URL, {"question": "Quels sont mes congés ?"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["text_response"] == "Réponse vocale de test."
        assert fake_provider.received_system_prompt is not None
        assert "EMPLOYEE" in fake_provider.received_system_prompt
        assert authenticated_user.email in fake_provider.received_system_prompt or (
            authenticated_user.get_full_name() in fake_provider.received_system_prompt
        )

    def test_response_stays_concise_for_voice(self, db, authenticated_user):
        fake_provider = _FakeLLMProvider()
        client = APIClient()
        client.force_authenticate(user=authenticated_user)
        with (
            patch("smart_hr.ai_agents.views._generate_audio_file", return_value=None),
            patch("smart_hr.ai_agents.views.get_llm_provider", return_value=fake_provider),
        ):
            client.post(VOICE_ASK_URL, {"question": "congé"}, format="json")

        assert "3-4 phrases" in fake_provider.received_system_prompt

    def test_falls_back_to_faq_when_llm_provider_unavailable(self, db, authenticated_user):
        client = APIClient()
        client.force_authenticate(user=authenticated_user)
        with (
            patch("smart_hr.ai_agents.views._generate_audio_file", return_value=None),
            patch("smart_hr.ai_agents.views.get_llm_provider", side_effect=Exception("indisponible")),
        ):
            response = client.post(VOICE_ASK_URL, {"question": "formation"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "Formations" in response.data["text_response"]
