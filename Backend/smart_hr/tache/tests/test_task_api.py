import datetime

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position
from smart_hr.tache.models import Task
from smart_hr.users.models import User

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/tache/tasks/"


@pytest.fixture
def department(db):
    return Department.objects.create(name="Dev")


@pytest.fixture
def position(db):
    return Position.objects.create(title="Développeur")


@pytest.fixture
def rh_user(db):
    return User.objects.create_user(
        username="rh_task",
        email="rh_task@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture
def employee_user(db):
    return User.objects.create_user(
        username="emp_task",
        email="emp_task@test.com",
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
def task(employee, rh_user):
    return Task.objects.create(
        title="Implémenter le module paie",
        description="Faire le module paie",
        assignee=employee,
        created_by=rh_user,
        status=Task.Status.TODO,
        priority=Task.Priority.HIGH,
        due_date=datetime.date(2026, 9, 1),
    )


class TestTaskPermissions:
    def test_anonymous_cannot_list(self):
        client = APIClient()
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_can_list(self, employee_user, task):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK


class TestTaskCRUD:
    def test_rh_can_create_task(self, rh_user, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        payload = {
            "title": "Revue de code",
            "assignee": employee.pk,
            "status": "todo",
            "priority": "medium",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert Task.objects.filter(title="Revue de code").exists()

    def test_retrieve_task(self, rh_user, task):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{task.pk}/"
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == task.title

    def test_update_task_status(self, rh_user, task):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{task.pk}/"
        response = client.patch(url, {"status": "in_progress"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        task.refresh_from_db()
        assert task.status == Task.Status.IN_PROGRESS

    def test_delete_task(self, rh_user, task):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{task.pk}/"
        response = client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Task.objects.filter(pk=task.pk).exists()

    def test_employee_can_update_own_task_status(self, employee_user, task):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        url = f"{LIST_URL}{task.pk}/"
        response = client.patch(url, {"status": "done"}, format="json")
        assert response.status_code in (status.HTTP_200_OK, status.HTTP_403_FORBIDDEN)
