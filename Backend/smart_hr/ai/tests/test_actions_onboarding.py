from __future__ import annotations

import datetime

import pytest

from smart_hr.ai.actions import execute_action
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import OnboardingProgram
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


@pytest.fixture
def new_hire_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE, first_name="Awa", last_name="Diallo")


@pytest.fixture
def new_hire(db, new_hire_user) -> Employee:
    return Employee.objects.create(user=new_hire_user, hire_date=datetime.date(2026, 7, 1))


class TestExecuteOnboardingCreation:
    def test_invalid_program_type_is_rejected(self, rh_user, new_hire):
        """Le schéma du tool contraint déjà program_type à onboarding|offboarding,
        mais si une valeur hors-enum arrivait malgré tout, le serializer DRF la
        rejette explicitement plutôt que de la substituer silencieusement."""
        params = {
            "employee_name": "Awa Diallo",
            "program_type": "invalide",
            "title": "Programme",
            "steps": [{"title": "Étape"}],
        }
        result = execute_action("onboarding_creation", rh_user, params)
        assert result["success"] is False
        assert not OnboardingProgram.objects.exists()

    def test_rh_creates_onboarding_program_for_matched_employee(self, rh_user, new_hire):
        params = {
            "employee_name": "Awa Diallo",
            "program_type": "onboarding",
            "title": "Intégration Awa",
            "steps": [{"title": "Créer les accès", "description": "Comptes email et VPN"}],
        }
        result = execute_action("onboarding_creation", rh_user, params)
        assert result["success"] is True
        assert result["type"] == "onboarding_created"
        program = OnboardingProgram.objects.get(pk=result["data"]["program_id"])
        assert program.employee == new_hire
        assert program.steps.count() == 1

    def test_generates_default_title_when_missing(self, rh_user, new_hire):
        params = {
            "employee_name": "Awa Diallo",
            "program_type": "onboarding",
            "title": None,
            "steps": [{"title": "Créer les accès"}],
        }
        result = execute_action("onboarding_creation", rh_user, params)
        assert result["success"] is True
        assert "Awa Diallo" in result["data"]["title"]

    def test_employee_role_cannot_create_onboarding(self, employee_user):
        params = {
            "employee_name": "Awa Diallo",
            "program_type": "onboarding",
            "title": "Interdit",
            "steps": [{"title": "Étape"}],
        }
        result = execute_action("onboarding_creation", employee_user, params)
        assert result["success"] is False
        assert "RH" in result["error"]

    def test_unknown_employee_name_is_rejected(self, rh_user):
        params = {
            "employee_name": "Personne Inconnue",
            "program_type": "onboarding",
            "title": "Programme",
            "steps": [{"title": "Étape"}],
        }
        result = execute_action("onboarding_creation", rh_user, params)
        assert result["success"] is False
        assert result["error"] == "employee_not_found"

    def test_missing_steps_is_rejected(self, rh_user, new_hire):
        params = {"employee_name": "Awa Diallo", "program_type": "onboarding", "title": "Programme", "steps": []}
        result = execute_action("onboarding_creation", rh_user, params)
        assert result["success"] is False
        assert result["error"] == "onboarding_info_missing"

    def test_ambiguous_name_match_is_rejected(self, rh_user, new_hire):
        homonym_user = UserFactory.create(role=User.Role.EMPLOYEE, first_name="Awa", last_name="Diallo")
        Employee.objects.create(user=homonym_user, hire_date=datetime.date(2026, 7, 1))

        params = {
            "employee_name": "Awa Diallo",
            "program_type": "onboarding",
            "title": "Programme",
            "steps": [{"title": "Étape"}],
        }
        result = execute_action("onboarding_creation", rh_user, params)
        assert result["success"] is False
        assert result["error"] == "employee_not_found"
