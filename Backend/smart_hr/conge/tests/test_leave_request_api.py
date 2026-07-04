import datetime

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.conge.models import LeaveRequest
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position
from smart_hr.users.models import User

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/conge/leave-requests/"


@pytest.fixture
def department(db):
    return Department.objects.create(name="RH Dept")


@pytest.fixture
def position(db):
    return Position.objects.create(title="Analyste")


@pytest.fixture
def rh_user(db):
    return User.objects.create_user(
        username="rh_conge",
        email="rh_conge@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture
def employee_user(db):
    return User.objects.create_user(
        username="emp_conge",
        email="emp_conge@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture
def employee(employee_user, department, position):
    return Employee.objects.create(
        user=employee_user,
        department=department,
        position=position,
        hire_date=datetime.date(2023, 1, 1),
    )


@pytest.fixture
def rh_employee(rh_user, department, position):
    return Employee.objects.create(
        user=rh_user,
        department=department,
        position=position,
        hire_date=datetime.date(2022, 1, 1),
    )


@pytest.fixture
def leave_request(employee):
    return LeaveRequest.objects.create(
        employee=employee,
        leave_type=LeaveRequest.LeaveType.VACATION,
        start_date=datetime.date(2026, 7, 1),
        end_date=datetime.date(2026, 7, 5),
        reason="Vacances",
        status=LeaveRequest.Status.PENDING,
    )


class TestLeaveRequestPermissions:
    def test_anonymous_cannot_list(self):
        client = APIClient()
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_employee_can_list_own(self, employee_user, leave_request):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK

    def test_rh_can_list_all(self, rh_user, leave_request):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1


class TestLeaveRequestCreate:
    def test_employee_can_create_leave(self, employee_user, employee):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        payload = {
            "employee": employee.pk,
            "leave_type": "vacation",
            "start_date": "2026-08-01",
            "end_date": "2026-08-05",
            "reason": "Test",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_missing_required_fields_rejected(self, employee_user):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.post(LIST_URL, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestLeaveRequestApproval:
    def test_rh_can_approve(self, rh_user, rh_employee, leave_request):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{leave_request.pk}/approve/"
        response = client.post(url)
        assert response.status_code == status.HTTP_200_OK
        leave_request.refresh_from_db()
        assert leave_request.status == LeaveRequest.Status.APPROVED

    def test_rh_can_reject(self, rh_user, rh_employee, leave_request):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{leave_request.pk}/reject/"
        response = client.post(url)
        assert response.status_code == status.HTTP_200_OK
        leave_request.refresh_from_db()
        assert leave_request.status == LeaveRequest.Status.REJECTED

    def test_employee_cannot_approve(self, employee_user, leave_request):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        url = f"{LIST_URL}{leave_request.pk}/approve/"
        response = client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestLeaveRequestBulk:
    def test_bulk_approve(self, rh_user, rh_employee, leave_request):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.post(
            f"{LIST_URL}bulk-approve/",
            {"ids": [leave_request.pk]},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        leave_request.refresh_from_db()
        assert leave_request.status == LeaveRequest.Status.APPROVED

    def test_bulk_reject(self, rh_user, rh_employee, leave_request):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.post(
            f"{LIST_URL}bulk-reject/",
            {"ids": [leave_request.pk]},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        leave_request.refresh_from_db()
        assert leave_request.status == LeaveRequest.Status.REJECTED


class TestLeaveRequestExport:
    def test_rh_can_export_csv(self, rh_user, leave_request):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(f"{LIST_URL}export/")
        assert response.status_code == status.HTTP_200_OK
        assert "text/csv" in response["Content-Type"]

    def test_rh_can_export_xlsx(self, rh_user, leave_request):
        """Régression : `?format=xlsx` renvoyait 404 (collision avec URL_FORMAT_OVERRIDE)."""
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(f"{LIST_URL}export/?export_format=xlsx")
        assert response.status_code == status.HTTP_200_OK
        assert "spreadsheetml" in response["Content-Type"]
