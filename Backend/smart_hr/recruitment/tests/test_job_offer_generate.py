from __future__ import annotations

from unittest.mock import patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

GENERATE_URL = "/api/v1/recruitment/job-offers/generate/"

_FAKE_JSON_RESPONSE = """```json
{
  "title": "Développeur Backend Django",
  "department": "Technologie",
  "location": "Dakar, Sénégal",
  "job_type": "full_time",
  "description": "Nous recherchons un développeur backend expérimenté...",
  "requirements": "3+ ans d'expérience Django\\nMaîtrise de PostgreSQL\\nAnglais professionnel",
  "salary_range": "600 000 - 900 000 FCFA"
}
```"""


class _FakeProvider:
    def extract_json(self, prompt):
        return _FAKE_JSON_RESPONSE

    def generate_response(self, system_prompt, history, question):
        return ""


class _BrokenProvider:
    def extract_json(self, prompt):
        raise RuntimeError("boom")

    def generate_response(self, system_prompt, history, question):
        return ""


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


class TestGenerateJobOfferPermissions:
    def test_anonymous_cannot_generate(self):
        client = APIClient()
        response = client.post(GENERATE_URL, {"job_description": "Fiche de poste"}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_employee_cannot_generate(self, employee_user):
        client = _authenticated_client(employee_user)
        response = client.post(GENERATE_URL, {"job_description": "Fiche de poste"}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestGenerateJobOfferSuccess:
    def test_rh_receives_structured_draft(self, rh_user):
        client = _authenticated_client(rh_user)
        with patch("smart_hr.recruitment.views.job_offer.get_llm_provider", return_value=_FakeProvider()):
            response = client.post(
                GENERATE_URL,
                {"job_description": "Développeur backend Django, 3 ans XP, Dakar."},
                format="json",
            )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Développeur Backend Django"
        assert response.data["department"] == "Technologie"
        assert response.data["job_type"] == "full_time"
        assert "développeur backend" in response.data["description"]
        assert "PostgreSQL" in response.data["requirements"]

    def test_does_not_persist_a_job_offer(self, rh_user):
        from smart_hr.recruitment.models import JobOffer

        client = _authenticated_client(rh_user)
        with patch("smart_hr.recruitment.views.job_offer.get_llm_provider", return_value=_FakeProvider()):
            client.post(GENERATE_URL, {"job_description": "Développeur backend Django."}, format="json")
        assert JobOffer.objects.count() == 0


class TestGenerateJobOfferValidation:
    def test_missing_job_description_returns_400(self, rh_user):
        client = _authenticated_client(rh_user)
        response = client.post(GENERATE_URL, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_blank_job_description_returns_400(self, rh_user):
        client = _authenticated_client(rh_user)
        response = client.post(GENERATE_URL, {"job_description": "   "}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_llm_failure_returns_502(self, rh_user):
        client = _authenticated_client(rh_user)
        with patch("smart_hr.recruitment.views.job_offer.get_llm_provider", return_value=_BrokenProvider()):
            response = client.post(GENERATE_URL, {"job_description": "Développeur backend."}, format="json")
        assert response.status_code == status.HTTP_502_BAD_GATEWAY
