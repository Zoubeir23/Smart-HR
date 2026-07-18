from __future__ import annotations

from unittest.mock import patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.recruitment.models import JobOffer
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

CHAT_URL = "/api/v1/ai/chat/"


class _FakeChatProvider:
    """Simule le function-calling natif : `detect_action` retourne directement
    (nom_de_l_action, arguments) comme le ferait un fournisseur réel (Gemini,
    OpenAI...), sans dépendre d'un JSON textuel à parser."""

    def __init__(self, action_intent=None, action_params=None):
        self._action_intent = action_intent
        self._action_params = action_params or {}

    def generate_response(self, system_prompt, history, question):
        return "Voici votre réponse."

    def detect_action(self, system_prompt, question, tools):
        return self._action_intent, self._action_params


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestJobOfferAgentIntegration:
    def test_chat_message_creates_job_offer_end_to_end(self, rh_user):
        provider = _FakeChatProvider(
            action_intent="job_offer_creation",
            action_params={
                "title": "Développeur Backend Django",
                "department": "Technique",
                "location": "Dakar",
                "job_type": "full_time",
                "description": "Nous recherchons un développeur Django expérimenté.",
                "requirements": "Django\nPostgreSQL",
                "salary_range": "",
            },
        )
        client = _authenticated_client(rh_user)
        with patch("smart_hr.ai.views.chat.get_llm_provider", return_value=provider):
            response = client.post(
                CHAT_URL,
                {"question": "Crée une offre d'emploi pour un développeur Django à Dakar"},
                format="json",
            )

        assert response.status_code == status.HTTP_201_CREATED
        assert "Offre d'emploi créée" in response.data["response"]
        assert response.data["action_type"] == "job_offer_created"
        assert JobOffer.objects.filter(title="Développeur Backend Django", created_by=rh_user).exists()

    def test_employee_cannot_trigger_job_offer_creation(self, employee_user):
        """Un EMPLOYEE n'a pas accès au tool job_offer_creation (filtré par rôle
        dans `build_available_tools`) : le function-calling ne peut donc pas le
        déclencher, quelle que soit la question posée."""
        provider = _FakeChatProvider()
        client = _authenticated_client(employee_user)
        with patch("smart_hr.ai.views.chat.get_llm_provider", return_value=provider):
            response = client.post(CHAT_URL, {"question": "Crée une offre d'emploi pour moi"}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["response"] == "Voici votre réponse."
        assert response.data["action_type"] == ""
        assert not JobOffer.objects.exists()
