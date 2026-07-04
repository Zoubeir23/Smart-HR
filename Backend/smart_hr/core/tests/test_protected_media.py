from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from smart_hr.recruitment.models import Application
from smart_hr.recruitment.models import ApplicationDocument
from smart_hr.recruitment.models import JobOffer
from smart_hr.users.models import User

pytestmark = pytest.mark.django_db

MINIMAL_PDF_CONTENT = b"%PDF-1.4 fake"


@pytest.fixture(autouse=True)
def isolated_media_root(settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)


@pytest.fixture
def rh_user(db):
    return User.objects.create_user(
        username="rh_media",
        email="rh_media@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture
def candidate_user(db):
    return User.objects.create_user(
        username="candidate_media",
        email="candidate_media@test.com",
        password="pass1234!",
        role=User.Role.CANDIDATE,
        is_email_verified=True,
    )


@pytest.fixture
def other_candidate(db):
    return User.objects.create_user(
        username="other_candidate_media",
        email="other_candidate_media@test.com",
        password="pass1234!",
        role=User.Role.CANDIDATE,
        is_email_verified=True,
    )


@pytest.fixture
def application(rh_user, candidate_user):
    job_offer = JobOffer.objects.create(
        title="Dev Backend",
        department="Tech",
        description="Développeur backend",
        status=JobOffer.Status.OPEN,
        created_by=rh_user,
    )
    return Application.objects.create(
        job_offer=job_offer,
        candidate=candidate_user,
        cv=SimpleUploadedFile("cv_candidat.pdf", MINIMAL_PDF_CONTENT),
    )


@pytest.fixture
def recruitment_document(application):
    return ApplicationDocument.objects.create(
        application=application,
        document_type=ApplicationDocument.DocumentType.ID_CARD,
        file=SimpleUploadedFile("piece_identite.pdf", MINIMAL_PDF_CONTENT),
    )


class TestRecruitmentDocumentAccess:
    def test_owner_candidate_can_download_own_document(
        self,
        client,
        candidate_user,
        recruitment_document,
    ):
        client.force_login(candidate_user)
        response = client.get(f"/media/{recruitment_document.file.name}")
        assert response.status_code == 200

    def test_other_candidate_cannot_download_document(
        self,
        client,
        other_candidate,
        recruitment_document,
    ):
        client.force_login(other_candidate)
        response = client.get(f"/media/{recruitment_document.file.name}")
        assert response.status_code == 403

    def test_rh_can_download_any_document(
        self,
        client,
        rh_user,
        recruitment_document,
    ):
        client.force_login(rh_user)
        response = client.get(f"/media/{recruitment_document.file.name}")
        assert response.status_code == 200

    def test_unauthenticated_request_is_rejected(
        self,
        client,
        recruitment_document,
    ):
        response = client.get(f"/media/{recruitment_document.file.name}")
        assert response.status_code == 403


class TestSensitiveFilesServedAsAttachment:
    def test_recruitment_document_has_attachment_disposition(
        self,
        client,
        rh_user,
        recruitment_document,
    ):
        client.force_login(rh_user)
        response = client.get(f"/media/{recruitment_document.file.name}")
        assert response.status_code == 200
        assert "attachment" in response["Content-Disposition"]

    def test_cv_has_attachment_disposition(self, client, rh_user, application):
        client.force_login(rh_user)
        response = client.get(f"/media/{application.cv.name}")
        assert response.status_code == 200
        assert "attachment" in response["Content-Disposition"]


class TestCvAccessRegression:
    def test_owner_candidate_can_download_own_cv(
        self,
        client,
        candidate_user,
        application,
    ):
        client.force_login(candidate_user)
        response = client.get(f"/media/{application.cv.name}")
        assert response.status_code == 200

    def test_other_candidate_cannot_download_cv(
        self,
        client,
        other_candidate,
        application,
    ):
        client.force_login(other_candidate)
        response = client.get(f"/media/{application.cv.name}")
        assert response.status_code == 403
