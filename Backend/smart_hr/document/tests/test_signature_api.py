from __future__ import annotations

import datetime

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.document.models import Document
from smart_hr.document.models import Signature
from smart_hr.document.models import SignatureRequest
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.users.models import User

pytestmark = pytest.mark.django_db

SIGNATURE_ME_URL = "/api/v1/document/signatures/me/"
SIGNATURE_REQUESTS_URL = "/api/v1/document/signature-requests/"

SAMPLE_SIGNATURE_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="


@pytest.fixture
def department(db):
    return Department.objects.create(name="Direction")


@pytest.fixture
def manager_user(db) -> User:
    return User.objects.create_user(
        username="manager_sig",
        email="manager_sig@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture
def employee_user(db) -> User:
    return User.objects.create_user(
        username="emp_sig",
        email="emp_sig@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture
def other_user(db) -> User:
    return User.objects.create_user(
        username="other_sig",
        email="other_sig@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture
def employee(db, employee_user, department) -> Employee:
    return Employee.objects.create(user=employee_user, department=department, hire_date=datetime.date(2023, 1, 1))


@pytest.fixture
def document(db, employee, manager_user) -> Document:
    return Document.objects.create(
        employee=employee,
        name="Attestation",
        document_type=Document.DocumentType.ATTESTATION,
        file=SimpleUploadedFile("attestation.pdf", b"%PDF-1.4 fake", content_type="application/pdf"),
        uploaded_by=manager_user,
    )


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestSignatureDeposit:
    def test_user_can_create_own_signature(self, manager_user):
        client = _authenticated_client(manager_user)
        response = client.put(SIGNATURE_ME_URL, {"image_data": SAMPLE_SIGNATURE_DATA_URL}, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert Signature.objects.filter(user=manager_user).exists()

    def test_user_can_replace_own_signature(self, manager_user):
        Signature.objects.create(user=manager_user, image_data=SAMPLE_SIGNATURE_DATA_URL)
        client = _authenticated_client(manager_user)
        response = client.put(SIGNATURE_ME_URL, {"image_data": SAMPLE_SIGNATURE_DATA_URL}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert Signature.objects.filter(user=manager_user).count() == 1

    def test_rejects_non_image_data_url(self, manager_user):
        client = _authenticated_client(manager_user)
        response = client.put(SIGNATURE_ME_URL, {"image_data": "not a data url"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_get_own_signature_404_when_not_set(self, manager_user):
        client = _authenticated_client(manager_user)
        response = client.get(SIGNATURE_ME_URL)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_anonymous_cannot_access(self):
        client = APIClient()
        response = client.get(SIGNATURE_ME_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestSignatureRequestWorkflow:
    def test_manager_can_request_signature(self, manager_user, employee_user, document):
        client = _authenticated_client(manager_user)
        payload = {"document": document.pk, "signatory": employee_user.pk}
        response = client.post(SIGNATURE_REQUESTS_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        request_obj = SignatureRequest.objects.get(pk=response.data["id"])
        assert request_obj.status == SignatureRequest.Status.PENDING
        assert request_obj.requested_by == manager_user

    def test_signatory_can_sign_after_depositing_signature(self, manager_user, employee_user, document):
        Signature.objects.create(user=employee_user, image_data=SAMPLE_SIGNATURE_DATA_URL)
        signature_request = SignatureRequest.objects.create(
            document=document, requested_by=manager_user, signatory=employee_user
        )
        client = _authenticated_client(employee_user)
        response = client.post(f"{SIGNATURE_REQUESTS_URL}{signature_request.pk}/sign/")
        assert response.status_code == status.HTTP_200_OK
        signature_request.refresh_from_db()
        assert signature_request.status == SignatureRequest.Status.SIGNED
        assert signature_request.signed_at is not None

    def test_cannot_sign_without_own_signature_deposited(self, manager_user, employee_user, document):
        signature_request = SignatureRequest.objects.create(
            document=document, requested_by=manager_user, signatory=employee_user
        )
        client = _authenticated_client(employee_user)
        response = client.post(f"{SIGNATURE_REQUESTS_URL}{signature_request.pk}/sign/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_other_user_cannot_sign_someone_elses_request(self, manager_user, employee_user, other_user, document):
        """other_user n'est ni signataire ni demandeur : la demande n'apparaît pas
        dans son queryset (404), ce qui évite même de révéler son existence."""
        Signature.objects.create(user=other_user, image_data=SAMPLE_SIGNATURE_DATA_URL)
        signature_request = SignatureRequest.objects.create(
            document=document, requested_by=manager_user, signatory=employee_user
        )
        client = _authenticated_client(other_user)
        response = client.post(f"{SIGNATURE_REQUESTS_URL}{signature_request.pk}/sign/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_sign_twice(self, manager_user, employee_user, document):
        Signature.objects.create(user=employee_user, image_data=SAMPLE_SIGNATURE_DATA_URL)
        signature_request = SignatureRequest.objects.create(
            document=document,
            requested_by=manager_user,
            signatory=employee_user,
            status=SignatureRequest.Status.SIGNED,
        )
        client = _authenticated_client(employee_user)
        response = client.post(f"{SIGNATURE_REQUESTS_URL}{signature_request.pk}/sign/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_signatory_can_decline(self, manager_user, employee_user, document):
        signature_request = SignatureRequest.objects.create(
            document=document, requested_by=manager_user, signatory=employee_user
        )
        client = _authenticated_client(employee_user)
        response = client.post(f"{SIGNATURE_REQUESTS_URL}{signature_request.pk}/decline/", {"comment": "Pas d'accord"})
        assert response.status_code == status.HTTP_200_OK
        signature_request.refresh_from_db()
        assert signature_request.status == SignatureRequest.Status.DECLINED

    def test_user_sees_only_own_signature_requests(self, manager_user, employee_user, other_user, document):
        SignatureRequest.objects.create(document=document, requested_by=manager_user, signatory=employee_user)
        SignatureRequest.objects.create(document=document, requested_by=manager_user, signatory=other_user)

        client = _authenticated_client(employee_user)
        response = client.get(SIGNATURE_REQUESTS_URL)
        results = response.data.get("results", response.data)
        assert len(results) == 1
        assert results[0]["signatory"] == employee_user.pk
