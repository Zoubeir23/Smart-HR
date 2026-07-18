from __future__ import annotations

import datetime

import pytest

from smart_hr.ai.actions import execute_action
from smart_hr.conge.models import LeaveRequest
from smart_hr.personnel.models import Employee
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE, first_name="Awa", last_name="Diallo")


@pytest.fixture
def employee(db, employee_user) -> Employee:
    return Employee.objects.create(user=employee_user, hire_date=datetime.date(2023, 1, 1))


@pytest.fixture
def pending_leave(db, employee) -> LeaveRequest:
    return LeaveRequest.objects.create(
        employee=employee,
        leave_type=LeaveRequest.LeaveType.VACATION,
        start_date=datetime.date(2026, 8, 1),
        end_date=datetime.date(2026, 8, 5),
        reason="Vacances",
    )


class TestExecuteLeaveApproval:
    def test_rh_approves_pending_leave(self, rh_user, employee, pending_leave):
        params = {"employee_name": "Awa Diallo", "decision": "approve"}
        result = execute_action("leave_approval", rh_user, params)
        assert result["success"] is True
        assert result["type"] == "leave_decision_applied"
        pending_leave.refresh_from_db()
        assert pending_leave.status == LeaveRequest.Status.APPROVED

    def test_rh_rejects_pending_leave(self, rh_user, employee, pending_leave):
        params = {"employee_name": "Awa Diallo", "decision": "reject"}
        result = execute_action("leave_approval", rh_user, params)
        assert result["success"] is True
        pending_leave.refresh_from_db()
        assert pending_leave.status == LeaveRequest.Status.REJECTED

    def test_missing_decision_is_rejected(self, rh_user, employee, pending_leave):
        params = {"employee_name": "Awa Diallo", "decision": None}
        result = execute_action("leave_approval", rh_user, params)
        assert result["success"] is False
        assert result["error"] == "leave_decision_missing"

    def test_invalid_decision_is_rejected(self, rh_user, employee, pending_leave):
        """Garde-fou serveur : le schéma du tool contraint déjà decision à
        approve|reject, mais l'exécution ne doit jamais faire confiance
        aveuglément à ce que le LLM a réellement extrait."""
        params = {"employee_name": "Awa Diallo", "decision": "peut-être"}
        result = execute_action("leave_approval", rh_user, params)
        assert result["success"] is False
        assert result["error"] == "leave_decision_missing"

    def test_unknown_employee_name_is_rejected(self, rh_user):
        params = {"employee_name": "Personne Inconnue", "decision": "approve"}
        result = execute_action("leave_approval", rh_user, params)
        assert result["success"] is False
        assert result["error"] == "employee_not_found"

    def test_no_pending_leave_is_rejected(self, rh_user, employee):
        params = {"employee_name": "Awa Diallo", "decision": "approve"}
        result = execute_action("leave_approval", rh_user, params)
        assert result["success"] is False
        assert result["error"] == "no_pending_leave"

    def test_employee_cannot_approve_leave(self, employee_user, employee, pending_leave):
        other_employee_user = UserFactory.create(role=User.Role.EMPLOYEE, first_name="Autre", last_name="Employé")
        params = {"employee_name": "Awa Diallo", "decision": "approve"}
        result = execute_action("leave_approval", other_employee_user, params)
        assert result["success"] is False
        pending_leave.refresh_from_db()
        assert pending_leave.status == LeaveRequest.Status.PENDING

    def test_already_processed_leave_is_rejected(self, rh_user, employee, pending_leave):
        pending_leave.status = LeaveRequest.Status.APPROVED
        pending_leave.save()
        params = {"employee_name": "Awa Diallo", "decision": "approve"}
        result = execute_action("leave_approval", rh_user, params)
        assert result["success"] is False
        assert result["error"] == "no_pending_leave"
