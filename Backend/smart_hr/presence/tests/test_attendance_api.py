import datetime

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position
from smart_hr.presence.models import Attendance
from smart_hr.users.models import User

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/presence/attendances/"


@pytest.fixture()
def department(db):
    return Department.objects.create(name="Ops")


@pytest.fixture()
def position(db):
    return Position.objects.create(title="Ops Agent")


@pytest.fixture()
def rh_user(db):
    return User.objects.create_user(
        username="rh_presence",
        email="rh_presence@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture()
def employee_user(db):
    return User.objects.create_user(
        username="emp_presence",
        email="emp_presence@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture()
def employee(employee_user, department, position):
    return Employee.objects.create(
        user=employee_user,
        department=department,
        position=position,
        hire_date=datetime.date(2023, 1, 1),
    )


@pytest.fixture()
def attendance(employee):
    return Attendance.objects.create(
        employee=employee,
        date=datetime.date(2026, 6, 1),
        status=Attendance.Status.PRESENT,
        check_in=datetime.time(8, 30),
        check_out=datetime.time(17, 30),
    )


class TestAttendancePermissions:
    def test_anonymous_cannot_list(self):
        client = APIClient()
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_rh_can_list(self, rh_user, attendance):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1

    def test_employee_can_list(self, employee_user, attendance):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK


class TestAttendanceCRUD:
    def test_rh_can_create_attendance(self, rh_user, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        payload = {
            "employee": employee.pk,
            "date": "2026-06-10",
            "status": "present",
            "check_in": "08:00:00",
            "check_out": "17:00:00",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_duplicate_date_rejected(self, rh_user, employee, attendance):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        payload = {
            "employee": employee.pk,
            "date": "2026-06-01",
            "status": "absent",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_rh_can_update(self, rh_user, attendance):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{attendance.pk}/"
        response = client.patch(url, {"status": "late"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        attendance.refresh_from_db()
        assert attendance.status == Attendance.Status.LATE

    def test_retrieve(self, rh_user, attendance):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{attendance.pk}/"
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "present"


class TestAttendanceFilters:
    def test_filter_by_employee(self, rh_user, attendance, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL + f"?employee={employee.pk}")
        assert response.status_code == status.HTTP_200_OK

    def test_filter_by_date(self, rh_user, attendance):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL + "?date=2026-06-01")
        assert response.status_code == status.HTTP_200_OK


class TestAttendanceExport:
    def test_rh_can_export_csv(self, rh_user, attendance):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(f"{LIST_URL}export/")
        assert response.status_code == status.HTTP_200_OK
        assert "text/csv" in response["Content-Type"]
