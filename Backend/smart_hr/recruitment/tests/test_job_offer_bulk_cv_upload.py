from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.recruitment.models import Application
from smart_hr.recruitment.models import JobOffer
from smart_hr.users.models import User

pytestmark = pytest.mark.django_db

BULK_MODULE = "smart_hr.recruitment.services.bulk_cv_upload"


@pytest.fixture
def rh_user(db):
    return User.objects.create_user(
        username="rh_bulk",
        email="rh_bulk@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture
def employee_user(db):
    return User.objects.create_user(
        username="employee_bulk",
        email="employee_bulk@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture
def open_job(rh_user):
    return JobOffer.objects.create(
        title="Développeur Backend",
        department="Technologie",
        description="Poste de développeur backend Django.",
        requirements="Python\nDjango\nPostgreSQL",
        status=JobOffer.Status.OPEN,
        created_by=rh_user,
    )


def _cv_file(name="cv.pdf"):
    return SimpleUploadedFile(name, b"%PDF-1.4 fake cv content", content_type="application/pdf")


def _authenticated_client(as_user):
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


def _bulk_url(job_offer):
    return f"/api/v1/recruitment/job-offers/{job_offer.pk}/bulk-upload-cvs/"


class TestBulkUploadPermissions:
    def test_anonymous_cannot_upload(self, open_job):
        client = APIClient()
        response = client.post(_bulk_url(open_job), {"cvs": [_cv_file()]}, format="multipart")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_employee_cannot_upload(self, employee_user, open_job):
        client = _authenticated_client(employee_user)
        response = client.post(_bulk_url(open_job), {"cvs": [_cv_file()]}, format="multipart")
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestBulkUploadCreatesApplications:
    def test_creates_candidate_and_application_from_cv(self, rh_user, open_job):
        client = _authenticated_client(rh_user)

        with (
            patch(f"{BULK_MODULE}.extract_text_from_pdf", return_value="texte du cv de Awa Diallo"),
            patch(
                f"{BULK_MODULE}.extract_candidate_identity",
                return_value={"first_name": "Awa", "last_name": "Diallo", "email": "awa.diallo@example.com"},
            ),
            patch(
                f"{BULK_MODULE}.analyze_cv_against_job_offer",
                return_value={"skills_extracted": ["Python", "Django"], "matching_score": 82.0, "ai_summary": "Bon profil."},
            ),
        ):
            response = client.post(_bulk_url(open_job), {"cvs": [_cv_file()]}, format="multipart")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["created"] == 1
        assert response.data["total_files"] == 1
        assert response.data["errors"] == []

        application = Application.objects.get(job_offer=open_job)
        assert application.candidate.email == "awa.diallo@example.com"
        assert application.candidate.role == User.Role.CANDIDATE
        assert application.matching_score == 82.0
        assert application.skills_extracted == ["Python", "Django"]

    def test_reuses_existing_candidate_account_by_email(self, rh_user, open_job):
        existing = User.objects.create_user(
            username="awa.existing",
            email="awa.diallo@example.com",
            password="pass1234!",
            role=User.Role.CANDIDATE,
        )
        client = _authenticated_client(rh_user)

        with (
            patch(f"{BULK_MODULE}.extract_text_from_pdf", return_value="texte du cv"),
            patch(
                f"{BULK_MODULE}.extract_candidate_identity",
                return_value={"first_name": "Awa", "last_name": "Diallo", "email": "awa.diallo@example.com"},
            ),
            patch(
                f"{BULK_MODULE}.analyze_cv_against_job_offer",
                return_value={"skills_extracted": [], "matching_score": 60.0, "ai_summary": ""},
            ),
        ):
            response = client.post(_bulk_url(open_job), {"cvs": [_cv_file()]}, format="multipart")

        assert response.status_code == status.HTTP_200_OK
        application = Application.objects.get(job_offer=open_job)
        assert application.candidate_id == existing.id
        assert User.objects.filter(email__iexact="awa.diallo@example.com").count() == 1

    def test_reuses_existing_candidate_with_different_email_casing(self, rh_user, open_job):
        """L'e-mail extrait du CV est toujours en minuscules, mais un compte existant
        peut avoir été créé avec une casse différente — la recherche doit rester
        insensible à la casse pour éviter un doublon (régression PR #183)."""
        existing = User.objects.create_user(
            username="awa.existing",
            email="Awa.Diallo@Example.com",
            password="pass1234!",
            role=User.Role.CANDIDATE,
        )
        client = _authenticated_client(rh_user)

        with (
            patch(f"{BULK_MODULE}.extract_text_from_pdf", return_value="texte du cv"),
            patch(
                f"{BULK_MODULE}.extract_candidate_identity",
                return_value={"first_name": "Awa", "last_name": "Diallo", "email": "awa.diallo@example.com"},
            ),
            patch(
                f"{BULK_MODULE}.analyze_cv_against_job_offer",
                return_value={"skills_extracted": [], "matching_score": 60.0, "ai_summary": ""},
            ),
        ):
            response = client.post(_bulk_url(open_job), {"cvs": [_cv_file()]}, format="multipart")

        assert response.status_code == status.HTTP_200_OK
        application = Application.objects.get(job_offer=open_job)
        assert application.candidate_id == existing.id
        assert User.objects.filter(email__iexact="awa.diallo@example.com").count() == 1

    def test_multiple_files_processed_independently(self, rh_user, open_job):
        client = _authenticated_client(rh_user)
        identities = [
            {"first_name": "Awa", "last_name": "Diallo", "email": "awa2@example.com"},
            {"first_name": "Moussa", "last_name": "Sow", "email": "moussa2@example.com"},
        ]

        with (
            patch(f"{BULK_MODULE}.extract_text_from_pdf", return_value="texte"),
            patch(f"{BULK_MODULE}.extract_candidate_identity", side_effect=identities),
            patch(
                f"{BULK_MODULE}.analyze_cv_against_job_offer",
                return_value={"skills_extracted": [], "matching_score": 50.0, "ai_summary": ""},
            ),
        ):
            response = client.post(
                _bulk_url(open_job),
                {"cvs": [_cv_file("cv1.pdf"), _cv_file("cv2.pdf")]},
                format="multipart",
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["created"] == 2
        assert Application.objects.filter(job_offer=open_job).count() == 2


class TestBulkUploadErrorHandling:
    def test_file_without_extractable_email_reported_as_error_not_fatal(self, rh_user, open_job):
        client = _authenticated_client(rh_user)

        with (
            patch(f"{BULK_MODULE}.extract_text_from_pdf", return_value="texte sans email"),
            patch(
                f"{BULK_MODULE}.extract_candidate_identity",
                return_value={"first_name": "", "last_name": "", "email": ""},
            ),
        ):
            response = client.post(_bulk_url(open_job), {"cvs": [_cv_file()]}, format="multipart")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["created"] == 0
        assert len(response.data["errors"]) == 1
        assert "e-mail" in response.data["errors"][0]["reason"].lower()

    def test_invalid_extension_rejected_without_aborting_batch(self, rh_user, open_job):
        client = _authenticated_client(rh_user)
        bad_file = SimpleUploadedFile("cv.exe", b"not a cv", content_type="application/octet-stream")
        good_file = _cv_file("good.pdf")

        with (
            patch(f"{BULK_MODULE}.extract_text_from_pdf", return_value="texte"),
            patch(
                f"{BULK_MODULE}.extract_candidate_identity",
                return_value={"first_name": "Awa", "last_name": "Diallo", "email": "awa3@example.com"},
            ),
            patch(
                f"{BULK_MODULE}.analyze_cv_against_job_offer",
                return_value={"skills_extracted": [], "matching_score": 50.0, "ai_summary": ""},
            ),
        ):
            response = client.post(_bulk_url(open_job), {"cvs": [bad_file, good_file]}, format="multipart")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["created"] == 1
        assert len(response.data["errors"]) == 1
        assert response.data["errors"][0]["filename"] == "cv.exe"

    def test_requires_at_least_one_file(self, rh_user, open_job):
        client = _authenticated_client(rh_user)
        response = client.post(_bulk_url(open_job), {}, format="multipart")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
