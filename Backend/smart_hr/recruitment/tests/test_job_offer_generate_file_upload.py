from __future__ import annotations

from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

GENERATE_URL = "/api/v1/recruitment/job-offers/generate/"

_FAKE_JSON_RESPONSE = """```json
{
  "title": "Business Developer Senior",
  "department": "Commercial",
  "location": "Abidjan, Côte d'Ivoire",
  "job_type": "full_time",
  "description": "Description générée depuis le fichier fourni.",
  "requirements": "5 ans d'expérience\\nLinkedIn Sales Navigator",
  "salary_range": ""
}
```"""


class _FakeProvider:
    def __init__(self):
        self.received_prompt = None

    def extract_json(self, prompt):
        self.received_prompt = prompt
        return _FAKE_JSON_RESPONSE

    def generate_response(self, system_prompt, history, question):
        return ""


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestGenerateJobOfferFromTextFile:
    def test_generates_draft_from_txt_file_alone(self, rh_user):
        client = _authenticated_client(rh_user)
        txt_file = SimpleUploadedFile(
            "JD_BUSINESS_DEVELOPER.txt",
            "Business Developer Senior chez Agiltym, 5 ans d'expérience.".encode(),
            content_type="text/plain",
        )
        fake_provider = _FakeProvider()
        with patch("smart_hr.recruitment.views.job_offer.get_llm_provider", return_value=fake_provider):
            response = client.post(GENERATE_URL, {"file": txt_file}, format="multipart")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Business Developer Senior"
        assert "Agiltym" in fake_provider.received_prompt

    def test_generates_draft_from_md_file_alone(self, rh_user):
        client = _authenticated_client(rh_user)
        md_file = SimpleUploadedFile(
            "job_description.md",
            b"# Business Developer Senior\n\nAgiltym recrute un profil senior.",
            content_type="text/markdown",
        )
        fake_provider = _FakeProvider()
        with patch("smart_hr.recruitment.views.job_offer.get_llm_provider", return_value=fake_provider):
            response = client.post(GENERATE_URL, {"file": md_file}, format="multipart")

        assert response.status_code == status.HTTP_200_OK
        assert "Agiltym" in fake_provider.received_prompt

    def test_combines_text_and_file_when_both_provided(self, rh_user):
        client = _authenticated_client(rh_user)
        txt_file = SimpleUploadedFile("job_description.txt", b"Contenu du fichier joint.", content_type="text/plain")
        fake_provider = _FakeProvider()
        with patch("smart_hr.recruitment.views.job_offer.get_llm_provider", return_value=fake_provider):
            response = client.post(
                GENERATE_URL,
                {"job_description": "Instruction du recruteur.", "file": txt_file},
                format="multipart",
            )

        assert response.status_code == status.HTTP_200_OK
        assert "Instruction du recruteur" in fake_provider.received_prompt
        assert "Contenu du fichier joint" in fake_provider.received_prompt

    def test_rejects_unsupported_file_extension(self, rh_user):
        client = _authenticated_client(rh_user)
        exe_file = SimpleUploadedFile("malware.exe", b"binary content", content_type="application/octet-stream")

        response = client.post(GENERATE_URL, {"file": exe_file}, format="multipart")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_rejects_when_neither_text_nor_file_provided(self, rh_user):
        client = _authenticated_client(rh_user)
        response = client.post(GENERATE_URL, {}, format="multipart")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_rejects_oversized_file(self, rh_user):
        client = _authenticated_client(rh_user)
        too_large = SimpleUploadedFile("job_description.txt", (b"x" * (10 * 1024 * 1024 + 1)), content_type="text/plain")
        response = client.post(GENERATE_URL, {"file": too_large}, format="multipart")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_pdf_file_is_extracted_via_pypdf2(self, rh_user):
        client = _authenticated_client(rh_user)
        pdf_file = SimpleUploadedFile("job_description.pdf", b"%PDF-1.4 fake pdf", content_type="application/pdf")
        fake_provider = _FakeProvider()

        with (
            patch("smart_hr.recruitment.views.job_offer.get_llm_provider", return_value=fake_provider),
            patch(
                "smart_hr.recruitment.services.document_text_extraction.extract_text_from_pdf",
                return_value="Texte extrait du PDF de fiche de poste.",
            ),
        ):
            response = client.post(GENERATE_URL, {"file": pdf_file}, format="multipart")

        assert response.status_code == status.HTTP_200_OK
        assert "Texte extrait du PDF" in fake_provider.received_prompt
