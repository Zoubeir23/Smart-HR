from __future__ import annotations

import datetime
from unittest.mock import patch

import pytest

from smart_hr.ai.actions import detect_action_intent
from smart_hr.ai.actions import execute_action
from smart_hr.ai.actions import extract_onboarding_parameters
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import OnboardingProgram
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


class _FakeLLMProvider:
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


@pytest.fixture
def new_hire_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE, first_name="Awa", last_name="Diallo")


@pytest.fixture
def new_hire(db, new_hire_user) -> Employee:
    return Employee.objects.create(user=new_hire_user, hire_date=datetime.date(2026, 7, 1))


class TestDetectOnboardingIntent:
    @pytest.mark.parametrize(
        "message",
        [
            "Crée un programme d'onboarding pour le nouvel employé",
            "Il me faut un parcours d'intégration",
            "Prépare l'offboarding de cet employé",
        ],
    )
    def test_detects_onboarding_intent(self, message):
        assert detect_action_intent(message) == "onboarding_creation"

    @pytest.mark.parametrize(
        "message",
        [
            "Comment fonctionne l'intégration avec Zoom ?",
            "Peux-tu m'expliquer l'intégration API de la paie ?",
        ],
    )
    def test_technical_integration_question_does_not_trigger_onboarding(self, message):
        """Le mot 'intégration' seul est trop générique (intégration technique/API
        vs programme d'intégration RH) — ne doit pas déclencher l'action à tort."""
        assert detect_action_intent(message) is None


class TestExtractOnboardingParameters:
    def test_extracts_generated_steps(self):
        json_response = (
            '{"employee_name": "Awa Diallo", "program_type": "onboarding", '
            '"title": "Intégration développeur backend", '
            '"steps": [{"title": "Créer les accès", "description": "Comptes email et VPN"}, '
            '{"title": "Présentation équipe", "description": "Rencontre avec l\'équipe technique"}]}'
        )
        with patch("smart_hr.ai.llm_providers.get_llm_provider", return_value=_FakeLLMProvider(json_response)):
            params = extract_onboarding_parameters("Crée un onboarding pour Awa Diallo, développeuse backend")
        assert params["employee_name"] == "Awa Diallo"
        assert len(params["steps"]) == 2

    def test_falls_back_to_onboarding_on_llm_error(self):
        with patch("smart_hr.ai.llm_providers.get_llm_provider", side_effect=Exception("boom")):
            params = extract_onboarding_parameters("Crée un onboarding")
        assert params["program_type"] == "onboarding"
        assert params["steps"] == []

    def test_invalid_program_type_defaults_to_onboarding(self):
        json_response = '{"employee_name": null, "program_type": "invalide", "title": null, "steps": []}'
        with patch("smart_hr.ai.llm_providers.get_llm_provider", return_value=_FakeLLMProvider(json_response)):
            params = extract_onboarding_parameters("Crée un programme")
        assert params["program_type"] == "onboarding"


class TestExecuteOnboardingCreation:
    def test_rh_creates_onboarding_program_for_matched_employee(self, rh_user, new_hire):
        params = {
            "employee_name": "Awa Diallo",
            "program_type": "onboarding",
            "title": "Intégration Awa",
            "steps": [{"title": "Créer les accès", "description": "Comptes email et VPN"}],
        }
        result = execute_action("onboarding_creation", rh_user, params)
        assert result["success"] is True
        assert result["type"] == "onboarding_created"
        program = OnboardingProgram.objects.get(pk=result["data"]["program_id"])
        assert program.employee == new_hire
        assert program.steps.count() == 1

    def test_generates_default_title_when_missing(self, rh_user, new_hire):
        params = {
            "employee_name": "Awa Diallo",
            "program_type": "onboarding",
            "title": None,
            "steps": [{"title": "Créer les accès"}],
        }
        result = execute_action("onboarding_creation", rh_user, params)
        assert result["success"] is True
        assert "Awa Diallo" in result["data"]["title"]

    def test_employee_role_cannot_create_onboarding(self, employee_user):
        params = {
            "employee_name": "Awa Diallo",
            "program_type": "onboarding",
            "title": "Interdit",
            "steps": [{"title": "Étape"}],
        }
        result = execute_action("onboarding_creation", employee_user, params)
        assert result["success"] is False
        assert "RH" in result["error"]

    def test_unknown_employee_name_is_rejected(self, rh_user):
        params = {
            "employee_name": "Personne Inconnue",
            "program_type": "onboarding",
            "title": "Programme",
            "steps": [{"title": "Étape"}],
        }
        result = execute_action("onboarding_creation", rh_user, params)
        assert result["success"] is False
        assert result["error"] == "employee_not_found"

    def test_missing_steps_is_rejected(self, rh_user, new_hire):
        params = {"employee_name": "Awa Diallo", "program_type": "onboarding", "title": "Programme", "steps": []}
        result = execute_action("onboarding_creation", rh_user, params)
        assert result["success"] is False
        assert result["error"] == "onboarding_info_missing"

    def test_ambiguous_name_match_is_rejected(self, rh_user, new_hire):
        homonym_user = UserFactory.create(role=User.Role.EMPLOYEE, first_name="Awa", last_name="Diallo")
        Employee.objects.create(user=homonym_user, hire_date=datetime.date(2026, 7, 1))

        params = {
            "employee_name": "Awa Diallo",
            "program_type": "onboarding",
            "title": "Programme",
            "steps": [{"title": "Étape"}],
        }
        result = execute_action("onboarding_creation", rh_user, params)
        assert result["success"] is False
        assert result["error"] == "employee_not_found"
