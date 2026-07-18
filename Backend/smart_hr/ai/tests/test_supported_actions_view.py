from __future__ import annotations

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

ACTIONS_URL = "/api/v1/ai/actions/"


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestSupportedActionsView:
    def test_rh_sees_job_offer_creation_action(self):
        rh_user = UserFactory.create(role=User.Role.RH)
        response = _authenticated_client(rh_user).get(ACTIONS_URL)

        assert response.status_code == status.HTTP_200_OK
        intents = [action["intent"] for action in response.data["actions"]]
        assert "job_offer_creation" in intents

    def test_employee_does_not_see_job_offer_creation_action(self):
        employee_user = UserFactory.create(role=User.Role.EMPLOYEE)
        response = _authenticated_client(employee_user).get(ACTIONS_URL)

        assert response.status_code == status.HTTP_200_OK
        intents = [action["intent"] for action in response.data["actions"]]
        assert "job_offer_creation" not in intents
        assert "leave_request" in intents

    def test_candidate_sees_empty_actions_list(self):
        candidate_user = UserFactory.create(role=User.Role.CANDIDATE)
        response = _authenticated_client(candidate_user).get(ACTIONS_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["actions"] == []

    def test_unauthenticated_request_is_rejected(self):
        response = APIClient().get(ACTIONS_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
