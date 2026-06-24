import datetime
from unittest.mock import patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.paiement.models import Payroll
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position
from smart_hr.users.models import User

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/paiement/payrolls/"


@pytest.fixture
def rh_user(db):
    return User.objects.create_user(
        username="rh_payroll",
        email="rh_payroll@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture
def employee_user(db):
    return User.objects.create_user(
        username="emp_payroll",
        email="emp_payroll@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture
def department(db):
    return Department.objects.create(name="Paie Dept")


@pytest.fixture
def position(db):
    return Position.objects.create(title="Analyste Paie")


@pytest.fixture
def employee(employee_user, department, position):
    return Employee.objects.create(
        user=employee_user,
        department=department,
        position=position,
        hire_date=datetime.date(2021, 6, 1),
        salary=300000,
    )


@pytest.fixture
def payroll(employee):
    return Payroll.objects.create(
        employee=employee,
        month="2026-05",
        base_salary=300000,
        bonuses=5000,
        deductions=1000,
        status=Payroll.Status.PENDING,
    )


class TestPayrollPermissions:
    def test_anonymous_cannot_list(self):
        client = APIClient()
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_rh_can_list_all(self, rh_user, payroll):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1

    def test_employee_sees_only_own(self, employee_user, payroll):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        for item in response.data["results"]:
            assert item["employee"] == payroll.employee.pk


class TestPayrollCRUD:
    def test_rh_can_create_payroll(self, rh_user, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        payload = {
            "employee": employee.pk,
            "month": "2026-06",
            "base_salary": "300000.00",
            "bonuses": "10000.00",
            "deductions": "2000.00",
            "status": "pending",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert Payroll.objects.filter(employee=employee, month="2026-06").exists()

    def test_employee_cannot_create(self, employee_user, employee):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        payload = {
            "employee": employee.pk,
            "month": "2026-07",
            "base_salary": "300000.00",
            "bonuses": "0.00",
            "deductions": "0.00",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rh_can_retrieve_payroll(self, rh_user, payroll):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(f"{LIST_URL}{payroll.pk}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["month"] == payroll.month

    def test_rh_can_delete_payroll(self, rh_user, payroll):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.delete(f"{LIST_URL}{payroll.pk}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Payroll.objects.filter(pk=payroll.pk).exists()


class TestPayrollMarkPaid:
    @patch("smart_hr.paiement.views.payroll.send_payslip_paid_email")
    def test_rh_can_mark_payroll_as_paid(self, mock_email, rh_user, payroll):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{payroll.pk}/mark-paid/"
        response = client.post(url)
        assert response.status_code == status.HTTP_200_OK
        payroll.refresh_from_db()
        assert payroll.status == Payroll.Status.PAID

    @patch("smart_hr.paiement.views.payroll.send_payslip_paid_email")
    def test_mark_paid_twice_returns_400(self, mock_email, rh_user, payroll):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{payroll.pk}/mark-paid/"
        payroll.status = Payroll.Status.PAID
        payroll.save()
        response = client.post(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch("smart_hr.paiement.views.payroll.send_payslip_paid_email")
    def test_employee_can_mark_own_payroll_paid(self, mock_email, employee_user, payroll):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        url = f"{LIST_URL}{payroll.pk}/mark-paid/"
        response = client.post(url)
        assert response.status_code == status.HTTP_200_OK


class TestPayrollFilters:
    def test_filter_by_month(self, rh_user, payroll):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL + "?month=2026-05")
        assert response.status_code == status.HTTP_200_OK
        for item in response.data["results"]:
            assert item["month"] == "2026-05"

    def test_filter_by_status(self, rh_user, payroll):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL + "?status=pending")
        assert response.status_code == status.HTTP_200_OK


class TestPayrollBulkGenerate:
    def test_bulk_generate_creates_payrolls(self, rh_user, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        payload = {"month": "2026-08"}
        response = client.post(f"{LIST_URL}bulk-generate/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert "created" in response.data

    def test_bulk_generate_skips_duplicates(self, rh_user, employee, payroll):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        payload = {"month": payroll.month}
        response = client.post(f"{LIST_URL}bulk-generate/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["skipped_already_exists"] >= 1

    def test_bulk_generate_requires_rh(self, employee_user):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        payload = {"month": "2026-09"}
        response = client.post(f"{LIST_URL}bulk-generate/", payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN
