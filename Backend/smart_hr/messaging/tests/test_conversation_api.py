from __future__ import annotations

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.core.models import Notification
from smart_hr.messaging.models import Conversation
from smart_hr.messaging.models import Message
from smart_hr.messaging.services import get_or_create_direct_conversation
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

CONTACTS_URL = "/api/v1/messaging/contacts/"
CONVERSATIONS_URL = "/api/v1/messaging/conversations/"


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


@pytest.fixture
def candidate_user(db) -> User:
    return UserFactory.create(role=User.Role.CANDIDATE)


def authenticated_client(user: User) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=user)
    return client


class TestContactList:
    def test_requires_authentication(self, db):
        response = APIClient().get(CONTACTS_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_candidate_cannot_list_employees(self, candidate_user, employee_user, rh_user):
        response = authenticated_client(candidate_user).get(CONTACTS_URL)

        assert response.status_code == status.HTTP_200_OK
        returned_ids = {contact["id"] for contact in response.data["results"]}
        assert employee_user.id not in returned_ids
        assert rh_user.id in returned_ids

    def test_search_filters_on_email(self, rh_user, employee_user):
        response = authenticated_client(rh_user).get(CONTACTS_URL, {"search": employee_user.email})

        assert response.status_code == status.HTTP_200_OK
        assert [contact["id"] for contact in response.data["results"]] == [employee_user.id]


class TestConversationCreation:
    def test_rh_opens_conversation_with_candidate(self, rh_user, candidate_user):
        response = authenticated_client(rh_user).post(
            CONVERSATIONS_URL,
            {"participant_id": candidate_user.id, "body": "Votre candidature est retenue."},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        conversation = Conversation.objects.get(pk=response.data["id"])
        assert conversation.messages.count() == 1
        assert conversation.participants.count() == 2

    def test_employee_cannot_open_conversation_with_candidate(self, employee_user, candidate_user):
        response = authenticated_client(employee_user).post(
            CONVERSATIONS_URL,
            {"participant_id": candidate_user.id},
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert Conversation.objects.count() == 0

    def test_unknown_recipient_returns_404(self, rh_user):
        response = authenticated_client(rh_user).post(
            CONVERSATIONS_URL,
            {"participant_id": 999_999},
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_reopening_reuses_existing_conversation(self, rh_user, employee_user):
        client = authenticated_client(rh_user)
        first = client.post(CONVERSATIONS_URL, {"participant_id": employee_user.id}, format="json")
        second = client.post(CONVERSATIONS_URL, {"participant_id": employee_user.id}, format="json")

        assert first.status_code == status.HTTP_201_CREATED
        assert second.status_code == status.HTTP_200_OK
        assert first.data["id"] == second.data["id"]
        assert Conversation.objects.count() == 1


class TestMessageThread:
    def test_candidate_can_reply_to_conversation_opened_by_rh(self, rh_user, candidate_user):
        conversation, _ = get_or_create_direct_conversation(rh_user, candidate_user)

        response = authenticated_client(candidate_user).post(
            f"{CONVERSATIONS_URL}{conversation.id}/messages/",
            {"body": "Merci, je confirme ma disponibilité."},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["is_mine"] is True
        assert Message.objects.filter(conversation=conversation).count() == 1

    def test_outsider_cannot_read_conversation(self, rh_user, candidate_user, employee_user):
        conversation, _ = get_or_create_direct_conversation(rh_user, candidate_user)

        response = authenticated_client(employee_user).get(f"{CONVERSATIONS_URL}{conversation.id}/messages/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_empty_message_is_rejected(self, rh_user, employee_user):
        conversation, _ = get_or_create_direct_conversation(rh_user, employee_user)

        response = authenticated_client(rh_user).post(
            f"{CONVERSATIONS_URL}{conversation.id}/messages/",
            {"body": "   "},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestUnreadTracking:
    def test_recipient_sees_unread_count_then_zero_after_reading(self, rh_user, employee_user):
        conversation, _ = get_or_create_direct_conversation(rh_user, employee_user)
        authenticated_client(rh_user).post(
            f"{CONVERSATIONS_URL}{conversation.id}/messages/",
            {"body": "Bonjour"},
            format="json",
        )

        employee_client = authenticated_client(employee_user)
        listing = employee_client.get(CONVERSATIONS_URL)
        assert listing.data["unread_total"] == 1
        assert listing.data["results"][0]["unread_count"] == 1

        employee_client.get(f"{CONVERSATIONS_URL}{conversation.id}/messages/")

        assert employee_client.get(f"{CONVERSATIONS_URL}unread-count/").data["unread_total"] == 0

    def test_sender_never_counts_his_own_message_as_unread(self, rh_user, employee_user):
        conversation, _ = get_or_create_direct_conversation(rh_user, employee_user)
        rh_client = authenticated_client(rh_user)
        rh_client.post(
            f"{CONVERSATIONS_URL}{conversation.id}/messages/",
            {"body": "Bonjour"},
            format="json",
        )

        assert rh_client.get(f"{CONVERSATIONS_URL}unread-count/").data["unread_total"] == 0


class TestNotifications:
    def test_message_notifies_the_recipient(self, rh_user, candidate_user, django_capture_on_commit_callbacks):
        conversation, _ = get_or_create_direct_conversation(rh_user, candidate_user)

        with django_capture_on_commit_callbacks(execute=True):
            authenticated_client(rh_user).post(
                f"{CONVERSATIONS_URL}{conversation.id}/messages/",
                {"body": "Votre candidature est acceptée."},
                format="json",
            )

        notification = Notification.objects.get(recipient=candidate_user)
        assert notification.notification_type == Notification.NotificationType.MESSAGE_RECEIVED
        assert notification.target_url == f"/messages?conversation={conversation.id}"
        assert not Notification.objects.filter(recipient=rh_user).exists()
