from __future__ import annotations

import datetime

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import OnboardingProgram
from smart_hr.personnel.models import OnboardingStep
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/personnel/onboarding-programs/"


@pytest.fixture
def department(db) -> Department:
    return Department.objects.create(name="Technologie")


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE, first_name="Awa", last_name="Diallo")


@pytest.fixture
def other_employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE, first_name="Moussa", last_name="Sow")


@pytest.fixture
def employee(employee_user, department) -> Employee:
    return Employee.objects.create(
        user=employee_user,
        department=department,
        hire_date=datetime.date(2026, 1, 1),
        salary=300000,
        status="active",
    )


@pytest.fixture
def other_employee(other_employee_user, department) -> Employee:
    return Employee.objects.create(
        user=other_employee_user,
        department=department,
        hire_date=datetime.date(2020, 1, 1),
        salary=300000,
        status="active",
    )


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestCreateOnboardingProgram:
    def test_anonymous_cannot_create(self, employee):
        client = APIClient()
        response = client.post(
            LIST_URL,
            {"employee": employee.pk, "program_type": "onboarding", "title": "Intégration", "steps": []},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_employee_cannot_create(self, employee_user, employee):
        client = _authenticated_client(employee_user)
        response = client.post(
            LIST_URL,
            {"employee": employee.pk, "program_type": "onboarding", "title": "Intégration", "steps": []},
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rh_can_create_program_with_steps(self, rh_user, employee):
        client = _authenticated_client(rh_user)
        payload = {
            "employee": employee.pk,
            "program_type": "onboarding",
            "title": "Intégration développeur",
            "steps": [
                {"title": "Créer le compte email", "description": ""},
                {"title": "Remettre le matériel", "description": "Laptop + badge"},
                {"title": "Présenter l'équipe", "description": ""},
            ],
        }
        response = client.post(LIST_URL, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        program = OnboardingProgram.objects.get(pk=response.data["id"])
        assert program.employee == employee
        assert program.status == OnboardingProgram.Status.IN_PROGRESS
        assert program.steps.count() == 3
        assert list(program.steps.order_by("order").values_list("title", flat=True)) == [
            "Créer le compte email",
            "Remettre le matériel",
            "Présenter l'équipe",
        ]

    def test_offboarding_program_type(self, rh_user, employee):
        client = _authenticated_client(rh_user)
        payload = {
            "employee": employee.pk,
            "program_type": "offboarding",
            "title": "Départ",
            "steps": [{"title": "Récupérer le badge", "description": ""}],
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["program_type"] == "offboarding"

    def test_requires_at_least_one_step(self, rh_user, employee):
        client = _authenticated_client(rh_user)
        payload = {"employee": employee.pk, "program_type": "onboarding", "title": "Vide", "steps": []}
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestListOnboardingPrograms:
    def test_rh_sees_all_programs(self, rh_user, employee, other_employee):
        OnboardingProgram.objects.create(employee=employee, program_type="onboarding", title="A")
        OnboardingProgram.objects.create(employee=other_employee, program_type="onboarding", title="B")
        client = _authenticated_client(rh_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", response.data)
        assert len(results) == 2

    def test_employee_sees_only_own_programs(self, employee_user, employee, other_employee):
        OnboardingProgram.objects.create(employee=employee, program_type="onboarding", title="Mine")
        OnboardingProgram.objects.create(employee=other_employee, program_type="onboarding", title="Not mine")
        client = _authenticated_client(employee_user)
        response = client.get(LIST_URL)
        results = response.data.get("results", response.data)
        assert len(results) == 1
        assert results[0]["title"] == "Mine"

    def test_rh_can_filter_by_employee(self, rh_user, employee, other_employee):
        OnboardingProgram.objects.create(employee=employee, program_type="onboarding", title="A")
        OnboardingProgram.objects.create(employee=other_employee, program_type="onboarding", title="B")
        client = _authenticated_client(rh_user)
        response = client.get(LIST_URL, {"employee": employee.pk})
        results = response.data.get("results", response.data)
        assert len(results) == 1
        assert results[0]["title"] == "A"


class TestToggleOnboardingStep:
    def test_rh_can_toggle_step_completion(self, rh_user, employee):
        program = OnboardingProgram.objects.create(employee=employee, program_type="onboarding", title="Test")
        step = OnboardingStep.objects.create(program=program, title="Étape 1", order=0)

        client = _authenticated_client(rh_user)
        url = f"{LIST_URL}{program.pk}/steps/{step.pk}/toggle/"
        response = client.post(url)

        assert response.status_code == status.HTTP_200_OK
        step.refresh_from_db()
        assert step.is_completed is True
        assert step.completed_at is not None

    def test_program_marked_completed_when_all_steps_done(self, rh_user, employee):
        program = OnboardingProgram.objects.create(employee=employee, program_type="onboarding", title="Test")
        step1 = OnboardingStep.objects.create(program=program, title="Étape 1", order=0)
        step2 = OnboardingStep.objects.create(program=program, title="Étape 2", order=1)

        client = _authenticated_client(rh_user)
        client.post(f"{LIST_URL}{program.pk}/steps/{step1.pk}/toggle/")
        program.refresh_from_db()
        assert program.status == OnboardingProgram.Status.IN_PROGRESS

        client.post(f"{LIST_URL}{program.pk}/steps/{step2.pk}/toggle/")
        program.refresh_from_db()
        assert program.status == OnboardingProgram.Status.COMPLETED
        assert program.completed_at is not None

    def test_untoggling_a_step_reopens_the_program(self, rh_user, employee):
        program = OnboardingProgram.objects.create(employee=employee, program_type="onboarding", title="Test")
        step = OnboardingStep.objects.create(program=program, title="Étape 1", order=0)
        client = _authenticated_client(rh_user)
        url = f"{LIST_URL}{program.pk}/steps/{step.pk}/toggle/"

        client.post(url)
        program.refresh_from_db()
        assert program.status == OnboardingProgram.Status.COMPLETED

        client.post(url)
        program.refresh_from_db()
        step.refresh_from_db()
        assert step.is_completed is False
        assert program.status == OnboardingProgram.Status.IN_PROGRESS
        assert program.completed_at is None

    def test_employee_can_toggle_own_step(self, employee_user, employee):
        program = OnboardingProgram.objects.create(employee=employee, program_type="onboarding", title="Test")
        step = OnboardingStep.objects.create(program=program, title="Étape 1", order=0)
        client = _authenticated_client(employee_user)
        response = client.post(f"{LIST_URL}{program.pk}/steps/{step.pk}/toggle/")
        assert response.status_code == status.HTTP_200_OK

    def test_employee_cannot_toggle_another_employees_step(self, other_employee_user, employee):
        program = OnboardingProgram.objects.create(employee=employee, program_type="onboarding", title="Test")
        step = OnboardingStep.objects.create(program=program, title="Étape 1", order=0)
        client = _authenticated_client(other_employee_user)
        response = client.post(f"{LIST_URL}{program.pk}/steps/{step.pk}/toggle/")
        assert response.status_code == status.HTTP_404_NOT_FOUND
