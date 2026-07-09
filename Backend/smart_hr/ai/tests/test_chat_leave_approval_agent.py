from __future__ import annotations

import datetime
from unittest.mock import patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.conge.models import LeaveRequest
from smart_hr.personnel.models import Employee
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

CHAT_URL = "/api/v1/ai/chat/"


class _FakeChatProvider:
    def generate_response(self, system_prompt, history, question):
        return "Voici votre réponse."


class _FakeExtractionProvider:
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


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestLeaveApprovalAgentIntegration:
    def test_chat_message_approves_leave_end_to_end(self, rh_user, employee, pending_leave):
        json_response = '{"employee_name": "Awa Diallo", "decision": "approve"}'
        client = _authenticated_client(rh_user)
        with (
            patch("smart_hr.ai.views.chat.get_llm_provider", return_value=_FakeChatProvider()),
            patch("smart_hr.ai.llm_providers.get_llm_provider", return_value=_FakeExtractionProvider(json_response)),
        ):
            response = client.post(
                CHAT_URL,
                {"question": "Valide le congé de Awa Diallo"},
                format="json",
            )

        assert response.status_code == status.HTTP_201_CREATED
        assert "validée" in response.data["response"]
        assert response.data["action_type"] == "leave_decision_applied"
        pending_leave.refresh_from_db()
        assert pending_leave.status == LeaveRequest.Status.APPROVED

    def test_chat_message_rejects_leave_end_to_end(self, rh_user, employee, pending_leave):
        json_response = '{"employee_name": "Awa Diallo", "decision": "reject"}'
        client = _authenticated_client(rh_user)
        with (
            patch("smart_hr.ai.views.chat.get_llm_provider", return_value=_FakeChatProvider()),
            patch("smart_hr.ai.llm_providers.get_llm_provider", return_value=_FakeExtractionProvider(json_response)),
        ):
            response = client.post(
                CHAT_URL,
                {"question": "Refuse le congé de Awa Diallo"},
                format="json",
            )

        assert response.status_code == status.HTTP_201_CREATED
        assert "refusée" in response.data["response"]
        pending_leave.refresh_from_db()
        assert pending_leave.status == LeaveRequest.Status.REJECTED

    def test_employee_cannot_approve_someone_elses_leave(self, employee_user, employee, pending_leave):
        other_employee_user = UserFactory.create(role=User.Role.EMPLOYEE, first_name="Autre", last_name="Employé")
        json_response = '{"employee_name": "Awa Diallo", "decision": "approve"}'
        client = _authenticated_client(other_employee_user)
        with (
            patch("smart_hr.ai.views.chat.get_llm_provider", return_value=_FakeChatProvider()),
            patch("smart_hr.ai.llm_providers.get_llm_provider", return_value=_FakeExtractionProvider(json_response)),
        ):
            response = client.post(
                CHAT_URL,
                {"question": "Valide le congé de Awa Diallo"},
                format="json",
            )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["action_type"] != "leave_decision_applied"
        pending_leave.refresh_from_db()
        assert pending_leave.status == LeaveRequest.Status.PENDING
