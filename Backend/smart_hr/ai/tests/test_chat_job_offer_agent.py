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
    def generate_response(self, system_prompt, history, question):
        return "Voici votre réponse."


class _FakeExtractionProvider:
    def __init__(self, json_response: str):
        self._json_response = json_response

    def extract_json(self, prompt):
        return self._json_response


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
        json_response = (
            '{"title": "Développeur Backend Django", "department": "Technique", '
            '"location": "Dakar", "job_type": "full_time", '
            '"description": "Nous recherchons un développeur Django expérimenté.", '
            '"requirements": "Django\\nPostgreSQL", "salary_range": ""}'
        )
        client = _authenticated_client(rh_user)
        with (
            patch("smart_hr.ai.views.chat.get_llm_provider", return_value=_FakeChatProvider()),
            patch("smart_hr.ai.llm_providers.get_llm_provider", return_value=_FakeExtractionProvider(json_response)),
        ):
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
        """Un EMPLOYEE mentionnant une offre d'emploi ne doit pas déclencher l'agent
        d'action (ni appel LLM d'extraction, ni message d'erreur d'action) : il reçoit
        une réponse de chat normale, comme n'importe quelle autre question."""
        extraction_provider = _FakeExtractionProvider(
            '{"title": "Poste", "department": "Technique", "location": "", "job_type": "full_time", '
            '"description": "Description", "requirements": "", "salary_range": ""}'
        )
        client = _authenticated_client(employee_user)
        with (
            patch("smart_hr.ai.views.chat.get_llm_provider", return_value=_FakeChatProvider()),
            patch("smart_hr.ai.llm_providers.get_llm_provider", return_value=extraction_provider) as mocked_llm,
        ):
            response = client.post(CHAT_URL, {"question": "Crée une offre d'emploi pour moi"}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["response"] == "Voici votre réponse."
        assert response.data["action_type"] == ""
        mocked_llm.assert_not_called()
        assert not JobOffer.objects.exists()
