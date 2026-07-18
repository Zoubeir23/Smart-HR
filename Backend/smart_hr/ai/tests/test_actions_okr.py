from __future__ import annotations

import datetime

import pytest

from smart_hr.ai.actions import execute_action
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Objective
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def department(db) -> Department:
    return Department.objects.create(name="Commercial")


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee(db, employee_user, department) -> Employee:
    return Employee.objects.create(user=employee_user, department=department, hire_date=datetime.date(2023, 1, 1))


class TestExecuteObjectiveCreation:
    def test_employee_level_is_always_forced_to_individual(self, employee_user, employee):
        """Garde-fou serveur : le schéma du tool n'a pas connaissance des
        permissions par rôle — l'exécution doit rejeter/reclasser un niveau
        department/company demandé par un EMPLOYEE, quoi que le LLM ait extrait."""
        params = {
            "level": "company",
            "title": "CA en hausse",
            "period": "2026",
            "key_results": [{"title": "CA", "unit": "FCFA", "target_value": 100}],
        }
        result = execute_action("objective_creation", employee_user, params)
        assert result["success"] is True
        objective = Objective.objects.get(pk=result["data"]["objective_id"])
        assert objective.level == Objective.Level.INDIVIDUAL
        assert objective.employee == employee

    def test_creates_individual_objective_for_employee(self, employee_user, employee):
        params = {
            "level": "individual",
            "title": "Améliorer la couverture de tests",
            "period": "Q1 2026",
            "key_results": [{"title": "Atteindre 80%", "unit": "%", "target_value": 80}],
        }
        result = execute_action("objective_creation", employee_user, params)
        assert result["success"] is True
        assert result["type"] == "objective_created"
        objective = Objective.objects.get(pk=result["data"]["objective_id"])
        assert objective.employee == employee
        assert objective.level == Objective.Level.INDIVIDUAL
        assert objective.key_results.count() == 1

    def test_missing_title_or_key_results_is_rejected(self, employee_user, employee):
        params = {"level": "individual", "title": None, "period": "Q1 2026", "key_results": []}
        result = execute_action("objective_creation", employee_user, params)
        assert result["success"] is False
        assert result["error"] == "objective_info_missing"

    def test_employee_without_profile_is_rejected(self, rh_user):
        params = {
            "level": "individual",
            "title": "Objectif",
            "period": "Q1 2026",
            "key_results": [{"title": "KR", "target_value": 5}],
        }
        result = execute_action("objective_creation", rh_user, params)
        assert result["success"] is False
        assert "profil employé" in result["error"]

    def test_rh_creates_department_objective(self, rh_user, department):
        params = {
            "level": "department",
            "department_name": "Commercial",
            "title": "Signer 10 clients",
            "period": "Q1 2026",
            "key_results": [{"title": "Nouveaux clients", "target_value": 10}],
        }
        result = execute_action("objective_creation", rh_user, params)
        assert result["success"] is True
        objective = Objective.objects.get(pk=result["data"]["objective_id"])
        assert objective.department == department
        assert objective.level == Objective.Level.DEPARTMENT

    def test_unknown_department_name_is_rejected(self, rh_user):
        params = {
            "level": "department",
            "department_name": "Inexistant",
            "title": "Objectif",
            "period": "Q1 2026",
            "key_results": [{"title": "KR", "target_value": 5}],
        }
        result = execute_action("objective_creation", rh_user, params)
        assert result["success"] is False
        assert result["error"] == "department_not_found"

    def test_rh_creates_company_objective_without_employee_or_department(self, rh_user):
        params = {
            "level": "company",
            "title": "Croissance du CA de 20%",
            "period": "2026",
            "key_results": [{"title": "CA annuel", "unit": "FCFA", "target_value": 1000000000}],
        }
        result = execute_action("objective_creation", rh_user, params)
        assert result["success"] is True
        objective = Objective.objects.get(pk=result["data"]["objective_id"])
        assert objective.level == Objective.Level.COMPANY
        assert objective.employee is None
        assert objective.department is None
