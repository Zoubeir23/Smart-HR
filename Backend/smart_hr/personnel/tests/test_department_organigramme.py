from __future__ import annotations

import datetime

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position
from smart_hr.personnel.models import Service
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

ORGANIGRAMME_URL = "/api/v1/personnel/departments/organigramme/"


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestOrganigrammePermissions:
    def test_anonymous_cannot_view(self):
        client = APIClient()
        response = client.get(ORGANIGRAMME_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_employee_can_view(self, employee_user):
        client = _authenticated_client(employee_user)
        response = client.get(ORGANIGRAMME_URL)
        assert response.status_code == status.HTTP_200_OK


class TestOrganigrammeStructure:
    def test_builds_department_service_position_tree_with_counts(self, rh_user):
        tech = Department.objects.create(name="Technologie")
        dev_service = Service.objects.create(name="Développement", department=tech)
        backend_position = Position.objects.create(title="Développeur Backend", service=dev_service)

        for i in range(2):
            user = UserFactory.create(role=User.Role.EMPLOYEE, first_name=f"Dev{i}", last_name="Test")
            Employee.objects.create(
                user=user,
                department=tech,
                service=dev_service,
                position=backend_position,
                hire_date=datetime.date(2023, 1, 1),
                salary=300000,
                status=Employee.Status.ACTIVE,
            )

        client = _authenticated_client(rh_user)
        response = client.get(ORGANIGRAMME_URL)

        assert response.status_code == status.HTTP_200_OK
        [dept_node] = [d for d in response.data if d["id"] == tech.pk]
        assert dept_node["name"] == "Technologie"
        assert dept_node["employee_count"] == 2

        [service_node] = dept_node["services"]
        assert service_node["name"] == "Développement"
        assert service_node["employee_count"] == 2

        [position_node] = service_node["positions"]
        assert position_node["title"] == "Développeur Backend"
        assert position_node["employee_count"] == 2

    def test_excludes_terminated_employees_from_counts(self, rh_user):
        tech = Department.objects.create(name="Technologie")
        service = Service.objects.create(name="Développement", department=tech)
        position = Position.objects.create(title="Développeur Backend", service=service)

        active_user = UserFactory.create(role=User.Role.EMPLOYEE, first_name="Active", last_name="One")
        Employee.objects.create(
            user=active_user,
            department=tech,
            service=service,
            position=position,
            hire_date=datetime.date(2023, 1, 1),
            salary=300000,
            status=Employee.Status.ACTIVE,
        )
        terminated_user = UserFactory.create(role=User.Role.EMPLOYEE, first_name="Gone", last_name="One")
        Employee.objects.create(
            user=terminated_user,
            department=tech,
            service=service,
            position=position,
            hire_date=datetime.date(2020, 1, 1),
            salary=300000,
            status=Employee.Status.TERMINATED,
        )

        client = _authenticated_client(rh_user)
        response = client.get(ORGANIGRAMME_URL)
        [dept_node] = [d for d in response.data if d["id"] == tech.pk]
        assert dept_node["employee_count"] == 1

    def test_department_manager_is_identified(self, rh_user):
        tech = Department.objects.create(name="Technologie")
        manager_user = UserFactory.create(role=User.Role.EMPLOYEE, first_name="Manager", last_name="Chief")
        Employee.objects.create(
            user=manager_user,
            department=tech,
            hire_date=datetime.date(2020, 1, 1),
            salary=500000,
            status=Employee.Status.ACTIVE,
            is_department_manager=True,
        )

        client = _authenticated_client(rh_user)
        response = client.get(ORGANIGRAMME_URL)
        [dept_node] = [d for d in response.data if d["id"] == tech.pk]
        assert dept_node["manager_name"] == "Manager Chief"

    def test_department_without_services_still_appears(self, rh_user):
        Department.objects.create(name="Commercial")
        client = _authenticated_client(rh_user)
        response = client.get(ORGANIGRAMME_URL)
        names = [d["name"] for d in response.data]
        assert "Commercial" in names
