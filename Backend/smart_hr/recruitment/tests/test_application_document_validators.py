from __future__ import annotations

import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile

from smart_hr.recruitment.models import Application
from smart_hr.recruitment.models import ApplicationDocument
from smart_hr.recruitment.models import JobOffer
from smart_hr.users.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def application(db):
    rh_user = User.objects.create_user(
        username="rh_doc_validator",
        email="rh_doc_validator@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )
    candidate = User.objects.create_user(
        username="candidate_doc_validator",
        email="candidate_doc_validator@test.com",
        password="pass1234!",
        role=User.Role.CANDIDATE,
        is_email_verified=True,
    )
    job_offer = JobOffer.objects.create(
        title="Dev Backend",
        department="Tech",
        description="Développeur backend",
        status=JobOffer.Status.OPEN,
        created_by=rh_user,
    )
    return Application.objects.create(
        job_offer=job_offer,
        candidate=candidate,
        cv=SimpleUploadedFile("cv.pdf", b"%PDF-1.4 fake"),
    )


def _build_document(application, filename: str) -> ApplicationDocument:
    return ApplicationDocument(
        application=application,
        document_type=ApplicationDocument.DocumentType.OTHER,
        file=SimpleUploadedFile(filename, b"contenu"),
    )


class TestApplicationDocumentExtensionValidation:
    def test_pdf_accepted(self, application):
        _build_document(application, "diplome.pdf").full_clean()

    def test_jpg_accepted_for_photo(self, application):
        _build_document(application, "photo.jpg").full_clean()

    def test_html_rejected(self, application):
        with pytest.raises(ValidationError, match="non autorisée"):
            _build_document(application, "page.html").full_clean()

    def test_svg_rejected(self, application):
        with pytest.raises(ValidationError, match="non autorisée"):
            _build_document(application, "image.svg").full_clean()

    def test_exe_rejected(self, application):
        with pytest.raises(ValidationError, match="non autorisée"):
            _build_document(application, "programme.exe").full_clean()
