from __future__ import annotations

from unittest.mock import patch

import pytest

from smart_hr.ai.actions import detect_action_intent
from smart_hr.ai.actions import execute_action
from smart_hr.ai.actions import extract_job_offer_parameters
from smart_hr.recruitment.models import JobOffer
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


class TestDetectJobOfferIntent:
    @pytest.mark.parametrize(
        "message",
        [
            "Crée une offre d'emploi pour un développeur backend",
            "Publie une offre pour un poste de comptable",
            "Il y a un poste à pourvoir en marketing",
            "Recruter pour le service RH",
        ],
    )
    def test_detects_job_offer_intent(self, message):
        assert detect_action_intent(message) == "job_offer_creation"

    def test_leave_request_is_not_confused_with_job_offer(self):
        assert detect_action_intent("Je veux prendre un congé demain") == "leave_request"


class TestExtractJobOfferParameters:
    def test_extracts_generated_offer(self):
        json_response = (
            '{"title": "Développeur Backend Django", "department": "Technique", '
            '"location": "Dakar", "job_type": "full_time", '
            '"description": "Nous recherchons un développeur Django expérimenté.", '
            '"requirements": "3 ans d\'expérience\\nDjango\\nPostgreSQL", "salary_range": "800k-1.2M FCFA"}'
        )
        with patch("smart_hr.ai.llm_providers.get_llm_provider", return_value=_FakeLLMProvider(json_response)):
            params = extract_job_offer_parameters("Crée une offre pour un développeur Django à Dakar")
        assert params["title"] == "Développeur Backend Django"
        assert params["department"] == "Technique"
        assert params["job_type"] == "full_time"

    def test_falls_back_to_full_time_on_llm_error(self):
        with patch("smart_hr.ai.llm_providers.get_llm_provider", side_effect=Exception("boom")):
            params = extract_job_offer_parameters("Crée une offre d'emploi")
        assert params["job_type"] == "full_time"
        assert params["title"] is None

    def test_invalid_job_type_defaults_to_full_time(self):
        json_response = (
            '{"title": "Poste", "department": "RH", "location": "", '
            '"job_type": "invalide", "description": "Description", "requirements": "", "salary_range": ""}'
        )
        with patch("smart_hr.ai.llm_providers.get_llm_provider", return_value=_FakeLLMProvider(json_response)):
            params = extract_job_offer_parameters("Crée une offre")
        assert params["job_type"] == "full_time"


class TestExecuteJobOfferCreation:
    def test_rh_creates_job_offer(self, rh_user):
        params = {
            "title": "Développeur Backend Django",
            "department": "Technique",
            "location": "Dakar",
            "job_type": "full_time",
            "description": "Nous recherchons un développeur Django expérimenté.",
            "requirements": "3 ans d'expérience\nDjango",
            "salary_range": "800k-1.2M FCFA",
        }
        result = execute_action("job_offer_creation", rh_user, params)
        assert result["success"] is True
        assert result["type"] == "job_offer_created"
        job_offer = JobOffer.objects.get(pk=result["data"]["job_offer_id"])
        assert job_offer.title == "Développeur Backend Django"
        assert job_offer.created_by == rh_user
        assert job_offer.status == JobOffer.Status.OPEN

    def test_employee_role_cannot_create_job_offer(self, employee_user):
        params = {
            "title": "Poste interdit",
            "department": "Technique",
            "location": "",
            "job_type": "full_time",
            "description": "Description",
            "requirements": "",
            "salary_range": "",
        }
        result = execute_action("job_offer_creation", employee_user, params)
        assert result["success"] is False
        assert "RH" in result["error"]
        assert not JobOffer.objects.exists()

    def test_missing_required_fields_is_rejected(self, rh_user):
        params = {
            "title": None,
            "department": "Technique",
            "location": "",
            "job_type": "full_time",
            "description": "Description",
            "requirements": "",
            "salary_range": "",
        }
        result = execute_action("job_offer_creation", rh_user, params)
        assert result["success"] is False
        assert result["error"] == "job_offer_info_missing"
        assert not JobOffer.objects.exists()
