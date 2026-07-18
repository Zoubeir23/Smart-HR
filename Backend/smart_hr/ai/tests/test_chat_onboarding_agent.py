from __future__ import annotations

import datetime
from unittest.mock import patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import OnboardingProgram
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

CHAT_URL = "/api/v1/ai/chat/"


class _FakeChatProvider:
    """Simule le function-calling natif : `detect_action` retourne directement
    (nom_de_l_action, arguments) comme le ferait un fournisseur réel."""

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
def new_hire_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE, first_name="Awa", last_name="Diallo")


@pytest.fixture
def new_hire(db, new_hire_user) -> Employee:
    return Employee.objects.create(user=new_hire_user, hire_date=datetime.date(2026, 7, 1))


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestOnboardingAgentIntegration:
    def test_chat_message_creates_onboarding_program_end_to_end(self, rh_user, new_hire):
        provider = _FakeChatProvider(
            action_intent="onboarding_creation",
            action_params={
                "employee_name": "Awa Diallo",
                "program_type": "onboarding",
                "title": "Intégration développeuse backend",
                "steps": [
                    {"title": "Créer les accès", "description": "Comptes email et VPN"},
                    {"title": "Présentation équipe", "description": "Rencontre équipe technique"},
                ],
            },
        )
        client = _authenticated_client(rh_user)
        with patch("smart_hr.ai.views.chat.get_llm_provider", return_value=provider):
            response = client.post(
                CHAT_URL,
                {"question": "Crée un programme d'onboarding pour Awa Diallo, développeuse backend"},
                format="json",
            )

        assert response.status_code == status.HTTP_201_CREATED
        assert "créé pour **Awa Diallo**" in response.data["response"]
        assert response.data["action_type"] == "onboarding_created"
        program = OnboardingProgram.objects.get(employee=new_hire)
        assert program.steps.count() == 2

    def test_employee_cannot_trigger_onboarding_creation(self, new_hire_user):
        """Un EMPLOYEE n'a pas accès au tool onboarding_creation (filtré par rôle
        dans `build_available_tools`) : le function-calling ne peut donc pas le
        déclencher, quelle que soit la question posée."""
        provider = _FakeChatProvider()
        client = _authenticated_client(new_hire_user)
        with patch("smart_hr.ai.views.chat.get_llm_provider", return_value=provider):
            response = client.post(CHAT_URL, {"question": "Crée un onboarding pour moi"}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["response"] == "Voici votre réponse."
        assert response.data["action_type"] == ""
        assert not OnboardingProgram.objects.exists()
