from __future__ import annotations

import datetime

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.document.models import Document
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position
from smart_hr.users.models import User

LIST_URL = "/api/v1/document/documents/"


@pytest.fixture
def department(db):
    return Department.objects.create(name="Engineering")


@pytest.fixture
def position(db):
    return Position.objects.create(title="Developer")


@pytest.fixture
def rh_user(db) -> User:
    return User.objects.create_user(
        username="rh_doc",
        email="rh_doc@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture
def employee_user(db) -> User:
    return User.objects.create_user(
        username="emp_doc",
        email="emp_doc@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture
def other_employee_user(db) -> User:
    return User.objects.create_user(
        username="other_doc",
        email="other_doc@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture
def employee(db, employee_user, department, position) -> Employee:
    return Employee.objects.create(
        user=employee_user,
        department=department,
        position=position,
        hire_date=datetime.date(2023, 1, 1),
        salary=500000,
    )


@pytest.fixture
def other_employee(db, other_employee_user, department, position) -> Employee:
    return Employee.objects.create(
        user=other_employee_user,
        department=department,
        position=position,
        hire_date=datetime.date(2023, 6, 1),
        salary=450000,
    )


def _make_pdf_file(name: str = "contrat.pdf") -> SimpleUploadedFile:
    return SimpleUploadedFile(name, b"%PDF-1.4 fake content", content_type="application/pdf")


@pytest.fixture
def employee_document(db, employee, rh_user) -> Document:
    return Document.objects.create(
        employee=employee,
        name="Contrat CDI",
        document_type=Document.DocumentType.CONTRACT,
        category=Document.Category.ADMINISTRATIVE,
        file=_make_pdf_file(),
        uploaded_by=rh_user,
    )


@pytest.fixture
def other_employee_document(db, other_employee, rh_user) -> Document:
    return Document.objects.create(
        employee=other_employee,
        name="Certificat de travail",
        document_type=Document.DocumentType.CERTIFICATE,
        category=Document.Category.ADMINISTRATIVE,
        file=_make_pdf_file("cert.pdf"),
        uploaded_by=rh_user,
    )


class TestDocumentVisibility:
    def test_rh_sees_all_documents(self, db, rh_user, employee_document, other_employee_document):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_employee_sees_only_own_documents(self, db, employee_user, employee_document, other_employee_document):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "Contrat CDI"

    def test_anonymous_cannot_list_documents(self, db, employee_document):
        client = APIClient()
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_rh_can_filter_by_employee_id(self, db, rh_user, employee, employee_document, other_employee_document):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL, {"employee_id": employee.pk})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "Contrat CDI"

    def test_employee_cannot_filter_by_other_employee_id(
        self, db, employee_user, other_employee, employee_document, other_employee_document
    ):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(LIST_URL, {"employee_id": other_employee.pk})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1


class TestDocumentCRUD:
    def test_rh_can_upload_document(self, db, rh_user, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        payload = {
            "employee": employee.pk,
            "name": "Attestation de travail",
            "document_type": Document.DocumentType.ATTESTATION,
            "category": Document.Category.ADMINISTRATIVE,
            "file": _make_pdf_file("attestation.pdf"),
        }
        response = client.post(LIST_URL, payload, format="multipart")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Attestation de travail"

    def test_employee_cannot_upload_document(self, db, employee_user, employee):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        payload = {
            "employee": employee.pk,
            "name": "Mon contrat",
            "document_type": Document.DocumentType.CONTRACT,
            "category": Document.Category.ADMINISTRATIVE,
            "file": _make_pdf_file(),
        }
        response = client.post(LIST_URL, payload, format="multipart")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rh_can_delete_document(self, db, rh_user, employee_document):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.delete(f"{LIST_URL}{employee_document.pk}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_filter_by_category(self, db, rh_user, employee_document, other_employee_document):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL, {"category": Document.Category.ADMINISTRATIVE})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_filter_by_document_type(self, db, rh_user, employee_document, other_employee_document):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL, {"document_type": Document.DocumentType.CONTRACT})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
