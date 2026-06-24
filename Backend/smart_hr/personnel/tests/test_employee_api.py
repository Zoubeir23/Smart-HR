import datetime

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position
from smart_hr.users.models import User

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/personnel/employees/"


@pytest.fixture
def department(db):
    return Department.objects.create(name="Engineering")


@pytest.fixture
def position(db):
    return Position.objects.create(title="Backend Developer")


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="admin_emp",
        email="admin_emp@test.com",
        password="pass1234!",
        role=User.Role.ADMIN,
        is_email_verified=True,
    )


@pytest.fixture
def rh_user(db):
    return User.objects.create_user(
        username="rh_emp",
        email="rh_emp@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture
def employee_user(db):
    return User.objects.create_user(
        username="emp_emp",
        email="emp_emp@test.com",
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
        salary=500000,
    )


@pytest.fixture
def rh_employee(rh_user, department):
    return Employee.objects.create(
        user=rh_user,
        department=department,
        hire_date=datetime.date(2022, 1, 1),
        salary=700000,
    )


class TestEmployeePermissions:
    def test_anonymous_cannot_list(self):
        client = APIClient()
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_rh_can_list_all(self, rh_user, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1

    def test_employee_sees_only_self(self, employee_user, rh_employee, employee):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data["results"]]
        assert employee.pk in ids
        assert rh_employee.pk not in ids


class TestEmployeeCRUD:
    def test_rh_can_create_employee(self, rh_user, department, position):
        new_user = User.objects.create_user(
            username="newbie",
            email="newbie@test.com",
            password="pass1234!",
            role=User.Role.EMPLOYEE,
        )
        client = APIClient()
        client.force_authenticate(user=rh_user)
        payload = {
            "user": new_user.pk,
            "department": department.pk,
            "position": position.pk,
            "hire_date": "2026-01-01",
            "salary": "450000.00",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_employee_cannot_create(self, employee_user):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.post(LIST_URL, {}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rh_can_update_salary(self, rh_user, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{employee.pk}/"
        response = client.patch(url, {"salary": "600000.00"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        employee.refresh_from_db()
        assert employee.salary == 600000

    def test_rh_can_delete_employee(self, rh_user, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{employee.pk}/"
        response = client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT


class TestEmployeeMe:
    def test_me_returns_own_profile(self, employee_user, employee):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(LIST_URL + "me/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == employee.pk

    def test_me_returns_404_if_no_profile(self, rh_user):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL + "me/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestEmployeeSearch:
    def test_search_by_name(self, rh_user, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        name = employee_user_name = employee.user.first_name or employee.user.username
        response = client.get(LIST_URL + f"?search={name}")
        assert response.status_code == status.HTTP_200_OK


class TestEmployeeExport:
    def test_rh_can_export_employees_csv(self, rh_user, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(f"{LIST_URL}export/")
        assert response.status_code == status.HTTP_200_OK
        assert "text/csv" in response["Content-Type"]

    def test_employee_cannot_export(self, employee_user, employee):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(f"{LIST_URL}export/")
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestEmployeeSetManager:
    def test_rh_can_set_manager(self, rh_user, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{employee.pk}/set-manager/"
        response = client.post(url, {"is_manager": True}, format="json")
        assert response.status_code == status.HTTP_200_OK
        employee.refresh_from_db()
        assert employee.is_department_manager is True

    def test_rh_can_remove_manager(self, rh_user, employee):
        employee.is_department_manager = True
        employee.save()
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{employee.pk}/set-manager/"
        response = client.post(url, {"is_manager": False}, format="json")
        assert response.status_code == status.HTTP_200_OK
        employee.refresh_from_db()
        assert employee.is_department_manager is False
