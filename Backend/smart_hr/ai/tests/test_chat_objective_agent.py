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
    """Simule le LLM du message de conversation (pas l'extraction JSON)."""

    def generate_response(self, system_prompt, history, question):
        return "Voici votre réponse."


class _FakeExtractionProvider:
    def __init__(self, json_response: str):
        self._json_response = json_response

    def extract_json(self, prompt):
        return self._json_response


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
        json_response = (
            '{"level": "individual", "department_name": null, "title": "Améliorer la couverture de tests", '
            '"period": "Q1 2026", "key_results": [{"title": "Atteindre 80%", "unit": "%", "target_value": 80}]}'
        )
        client = _authenticated_client(employee_user)
        with (
            patch("smart_hr.ai.views.chat.get_llm_provider", return_value=_FakeChatProvider()),
            patch("smart_hr.ai.llm_providers.get_llm_provider", return_value=_FakeExtractionProvider(json_response)),
        ):
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
        json_response = '{"level": "individual", "department_name": null, "title": null, "period": null, "key_results": []}'
        client = _authenticated_client(employee_user)
        with (
            patch("smart_hr.ai.views.chat.get_llm_provider", return_value=_FakeChatProvider()),
            patch("smart_hr.ai.llm_providers.get_llm_provider", return_value=_FakeExtractionProvider(json_response)),
        ):
            response = client.post(CHAT_URL, {"question": "Je veux créer un objectif"}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert "précisez son titre" in response.data["response"]
        assert not Objective.objects.filter(employee=employee).exists()
