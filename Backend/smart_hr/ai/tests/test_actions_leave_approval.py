from __future__ import annotations

import datetime
from unittest.mock import patch

import pytest

from smart_hr.ai.actions import detect_action_intent
from smart_hr.ai.actions import execute_action
from smart_hr.ai.actions import extract_leave_approval_parameters
from smart_hr.conge.models import LeaveRequest
from smart_hr.personnel.models import Employee
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


class _FakeLLMProvider:
    def __init__(self, json_response: str):
        self._json_response = json_response

    def extract_json(self, prompt):
        return self._json_response


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


class TestDetectLeaveApprovalIntent:
    @pytest.mark.parametrize(
        "message",
        [
            "Valider le congé de Awa Diallo",
            "Approuve la demande de congé de Awa Diallo",
            "Refuser le congé de Awa Diallo",
            "Rejeter la demande de congé de Awa Diallo",
        ],
    )
    def test_detects_leave_approval_intent(self, message):
        assert detect_action_intent(message) == "leave_approval"

    def test_leave_approval_takes_priority_over_leave_request(self):
        assert detect_action_intent("Valider le congé de Awa Diallo") == "leave_approval"

    def test_plain_leave_request_is_not_an_approval(self):
        assert detect_action_intent("Je veux poser un congé demain") == "leave_request"


class TestExtractLeaveApprovalParameters:
    def test_extracts_employee_name_and_decision(self):
        json_response = '{"employee_name": "Awa Diallo", "decision": "approve"}'
        with patch("smart_hr.ai.llm_providers.get_llm_provider", return_value=_FakeLLMProvider(json_response)):
            params = extract_leave_approval_parameters("Valide le congé de Awa Diallo")
        assert params["employee_name"] == "Awa Diallo"
        assert params["decision"] == "approve"

    def test_invalid_decision_is_normalized_to_none(self):
        json_response = '{"employee_name": "Awa Diallo", "decision": "peut-être"}'
        with patch("smart_hr.ai.llm_providers.get_llm_provider", return_value=_FakeLLMProvider(json_response)):
            params = extract_leave_approval_parameters("Que fait-on du congé de Awa ?")
        assert params["decision"] is None

    def test_falls_back_on_llm_error(self):
        with patch("smart_hr.ai.llm_providers.get_llm_provider", side_effect=Exception("boom")):
            params = extract_leave_approval_parameters("Valide le congé de Awa Diallo")
        assert params == {"employee_name": None, "decision": None}


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
