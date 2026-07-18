from __future__ import annotations

import datetime
from unittest.mock import patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Objective
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
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


@pytest.fixture
def employee(db, employee_user) -> Employee:
    return Employee.objects.create(user=employee_user, hire_date=datetime.date(2023, 1, 1))


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestObjectiveAgentIntegration:
    def test_chat_message_creates_objective_end_to_end(self, employee_user, employee):
        provider = _FakeChatProvider(
            action_intent="objective_creation",
            action_params={
                "level": "individual",
                "department_name": None,
                "title": "Améliorer la couverture de tests",
                "period": "Q1 2026",
                "key_results": [{"title": "Atteindre 80%", "unit": "%", "target_value": 80}],
            },
        )
        client = _authenticated_client(employee_user)
        with patch("smart_hr.ai.views.chat.get_llm_provider", return_value=provider):
            response = client.post(
                CHAT_URL,
                {"question": "Crée un objectif : améliorer la couverture de tests à 80% pour Q1 2026"},
                format="json",
            )

        assert response.status_code == status.HTTP_201_CREATED
        assert "Objectif OKR créé" in response.data["response"]
        assert Objective.objects.filter(employee=employee, title="Améliorer la couverture de tests").exists()
        assert response.data["action_type"] == "objective_created"

    def test_chat_message_with_incomplete_objective_asks_for_more_info(self, employee_user, employee):
        provider = _FakeChatProvider(
            action_intent="objective_creation",
            action_params={"level": "individual", "department_name": None, "title": None, "period": None, "key_results": []},
        )
        client = _authenticated_client(employee_user)
        with patch("smart_hr.ai.views.chat.get_llm_provider", return_value=provider):
            response = client.post(CHAT_URL, {"question": "Je veux créer un objectif"}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert "précisez son titre" in response.data["response"]
        assert not Objective.objects.filter(employee=employee).exists()

    def test_chat_message_surfaces_error_when_employee_profile_missing(self, employee_user):
        """L'utilisateur n'a pas de profil Employee : l'erreur retournée par
        `execute_objective_creation` n'est pas un code connu de
        `_ACTION_ERROR_MESSAGES` — elle doit tout de même être affichée, pas
        silencieusement avalée."""
        provider = _FakeChatProvider(
            action_intent="objective_creation",
            action_params={
                "level": "individual",
                "department_name": None,
                "title": "Objectif",
                "period": "Q1 2026",
                "key_results": [{"title": "KR", "target_value": 5}],
            },
        )
        client = _authenticated_client(employee_user)
        with patch("smart_hr.ai.views.chat.get_llm_provider", return_value=provider):
            response = client.post(CHAT_URL, {"question": "Crée un objectif"}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert "profil employé" in response.data["response"]
