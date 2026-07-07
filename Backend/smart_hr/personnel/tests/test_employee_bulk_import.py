from __future__ import annotations

import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

IMPORT_URL = "/api/v1/personnel/employees/import/"
TEMPLATE_URL = "/api/v1/personnel/employees/import/template/"

CSV_HEADER = "email,prenom,nom,departement,poste,date_embauche,salaire,statut\n"


def _csv_upload(content: str, filename: str = "import.csv") -> SimpleUploadedFile:
    return SimpleUploadedFile(filename, content.encode("utf-8"), content_type="text/csv")


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


@pytest.fixture
def department(db) -> Department:
    return Department.objects.create(name="Technologie")


@pytest.fixture
def position(db) -> Position:
    return Position.objects.create(title="Développeur Backend")


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestBulkImportPermissions:
    def test_anonymous_cannot_import(self, department):
        client = APIClient()
        content = CSV_HEADER + "a@test.com,A,B,Technologie,,2024-01-01,300000,\n"
        response = client.post(IMPORT_URL, {"file": _csv_upload(content)}, format="multipart")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_employee_cannot_import(self, employee_user, department):
        client = _authenticated_client(employee_user)
        content = CSV_HEADER + "a@test.com,A,B,Technologie,,2024-01-01,300000,\n"
        response = client.post(IMPORT_URL, {"file": _csv_upload(content)}, format="multipart")
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestBulkImportSuccess:
    def test_creates_users_and_employees_from_valid_rows(self, rh_user, department, position):
        content = CSV_HEADER + (
            "aissatou@test.com,Aissatou,Ba,Technologie,Développeur Backend,2024-03-01,350000,\n"
            "moussa@test.com,Moussa,Sow,Technologie,,2023-06-15,400000,active\n"
        )
        client = _authenticated_client(rh_user)
        response = client.post(IMPORT_URL, {"file": _csv_upload(content)}, format="multipart")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["created"] == 2
        assert response.data["errors"] == []

        aissatou = User.objects.get(email="aissatou@test.com")
        employee = Employee.objects.get(user=aissatou)
        assert employee.department == department
        assert employee.position == position
        assert str(employee.salary) == "350000.00"

        moussa = User.objects.get(email="moussa@test.com")
        assert Employee.objects.filter(user=moussa, position__isnull=True).exists()

    def test_generates_unique_usernames_for_homonyms(self, rh_user, department):
        content = CSV_HEADER + (
            "moussa1@test.com,Moussa,Sow,Technologie,,2024-01-01,300000,\n"
            "moussa2@test.com,Moussa,Sow,Technologie,,2024-01-01,300000,\n"
        )
        client = _authenticated_client(rh_user)
        response = client.post(IMPORT_URL, {"file": _csv_upload(content)}, format="multipart")

        assert response.data["created"] == 2
        usernames = set(User.objects.filter(email__in=["moussa1@test.com", "moussa2@test.com"]).values_list("username", flat=True))
        assert len(usernames) == 2

    def test_sends_credentials_email_per_created_employee(self, rh_user, department, mailoutbox):
        content = CSV_HEADER + "aissatou@test.com,Aissatou,Ba,Technologie,,2024-01-01,300000,\n"
        client = _authenticated_client(rh_user)
        client.post(IMPORT_URL, {"file": _csv_upload(content)}, format="multipart")
        assert len(mailoutbox) == 1
        assert mailoutbox[0].to == ["aissatou@test.com"]

    def test_accepts_xlsx_file(self, rh_user, department):
        import openpyxl

        workbook = openpyxl.Workbook()
        sheet = workbook.active
        sheet.append(["email", "prenom", "nom", "departement", "poste", "date_embauche", "salaire", "statut"])
        sheet.append(["xlsx@test.com", "Xlsx", "Test", "Technologie", "", "2024-01-01", 300000, ""])
        buffer = io.BytesIO()
        workbook.save(buffer)
        buffer.seek(0)

        upload = SimpleUploadedFile(
            "import.xlsx",
            buffer.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        client = _authenticated_client(rh_user)
        response = client.post(IMPORT_URL, {"file": upload}, format="multipart")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["created"] == 1
        assert User.objects.filter(email="xlsx@test.com").exists()


class TestBulkImportPartialFailure:
    def test_continues_after_a_bad_row_and_reports_it(self, rh_user, department):
        content = CSV_HEADER + (
            "valide@test.com,Valide,Employe,Technologie,,2024-01-01,300000,\n"
            "sans_departement@test.com,Sans,Departement,Introuvable,,2024-01-01,300000,\n"
            "aussi_valide@test.com,Aussi,Valide,Technologie,,2024-01-01,300000,\n"
        )
        client = _authenticated_client(rh_user)
        response = client.post(IMPORT_URL, {"file": _csv_upload(content)}, format="multipart")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["created"] == 2
        assert len(response.data["errors"]) == 1
        assert response.data["errors"][0]["row"] == 3
        assert "Introuvable" in response.data["errors"][0]["reason"]
        assert User.objects.filter(email="valide@test.com").exists()
        assert User.objects.filter(email="aussi_valide@test.com").exists()
        assert not User.objects.filter(email="sans_departement@test.com").exists()

    def test_rejects_duplicate_email_already_in_use(self, rh_user, department, employee_user):
        content = CSV_HEADER + f"{employee_user.email},Existe,Deja,Technologie,,2024-01-01,300000,\n"
        client = _authenticated_client(rh_user)
        response = client.post(IMPORT_URL, {"file": _csv_upload(content)}, format="multipart")

        assert response.data["created"] == 0
        assert "existe déjà" in response.data["errors"][0]["reason"]

    def test_rejects_missing_required_field(self, rh_user, department):
        content = CSV_HEADER + ",SansEmail,Test,Technologie,,2024-01-01,300000,\n"
        client = _authenticated_client(rh_user)
        response = client.post(IMPORT_URL, {"file": _csv_upload(content)}, format="multipart")

        assert response.data["created"] == 0
        assert len(response.data["errors"]) == 1

    def test_no_file_returns_400(self, rh_user):
        client = _authenticated_client(rh_user)
        response = client.post(IMPORT_URL, {}, format="multipart")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unsupported_file_type_returns_400(self, rh_user):
        client = _authenticated_client(rh_user)
        upload = SimpleUploadedFile("import.txt", b"not a spreadsheet", content_type="text/plain")
        response = client.post(IMPORT_URL, {"file": upload}, format="multipart")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestImportTemplate:
    def test_rh_can_download_template(self, rh_user):
        client = _authenticated_client(rh_user)
        response = client.get(TEMPLATE_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response["Content-Type"].startswith("text/csv")
        body = b"".join(response.streaming_content) if response.streaming else response.content
        assert b"email" in body
        assert b"departement" in body

    def test_employee_cannot_download_template(self, employee_user):
        client = _authenticated_client(employee_user)
        response = client.get(TEMPLATE_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN
