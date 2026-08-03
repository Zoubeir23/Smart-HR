from __future__ import annotations

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.test import APIRequestFactory

from smart_hr.core.models import Notification
from smart_hr.messaging.models import Conversation
from smart_hr.messaging.models import Message
from smart_hr.messaging.services import get_or_create_direct_conversation
from smart_hr.messaging.services import post_message
from smart_hr.messaging.throttles import MessageSendThrottle
from smart_hr.messaging.views import ConversationViewSet
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

    def test_unknown_recipient_is_indistinguishable_from_a_forbidden_one(
        self,
        employee_user,
        candidate_user,
    ):
        """Même statut et même message : pas d'énumération des comptes existants."""
        client = authenticated_client(employee_user)
        unknown = client.post(CONVERSATIONS_URL, {"participant_id": 999_999}, format="json")
        forbidden = client.post(CONVERSATIONS_URL, {"participant_id": candidate_user.id}, format="json")

        assert unknown.status_code == status.HTTP_403_FORBIDDEN
        assert forbidden.status_code == status.HTTP_403_FORBIDDEN
        assert unknown.data["detail"] == forbidden.data["detail"]

    def test_subject_is_ignored_when_the_conversation_already_exists(self, rh_user, employee_user):
        client = authenticated_client(rh_user)
        first = client.post(
            CONVERSATIONS_URL,
            {"participant_id": employee_user.id, "subject": "Entretien annuel"},
            format="json",
        )
        second = client.post(
            CONVERSATIONS_URL,
            {"participant_id": employee_user.id, "subject": "Autre sujet"},
            format="json",
        )

        assert first.data["subject"] == "Entretien annuel"
        assert second.data["subject"] == "Entretien annuel"

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


class TestThreadWindowing:
    def test_thread_is_bounded_and_returns_the_most_recent_messages(self, rh_user, employee_user):
        conversation, _ = get_or_create_direct_conversation(rh_user, employee_user)
        for index in range(60):
            post_message(conversation=conversation, sender=rh_user, body=f"message {index}")

        response = authenticated_client(rh_user).get(f"{CONVERSATIONS_URL}{conversation.id}/messages/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 50
        assert response.data["total"] == 60
        assert response.data["has_more"] is True
        # Fenêtre = les plus récents, rendus en ordre chronologique.
        assert response.data["results"][0]["body"] == "message 10"
        assert response.data["results"][-1]["body"] == "message 59"

    def test_limit_parameter_is_capped(self, rh_user, employee_user):
        conversation, _ = get_or_create_direct_conversation(rh_user, employee_user)
        post_message(conversation=conversation, sender=rh_user, body="unique")

        response = authenticated_client(rh_user).get(
            f"{CONVERSATIONS_URL}{conversation.id}/messages/",
            {"limit": "10000"},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["has_more"] is False

    def test_invalid_limit_falls_back_to_the_default(self, rh_user, employee_user):
        conversation, _ = get_or_create_direct_conversation(rh_user, employee_user)
        for index in range(55):
            post_message(conversation=conversation, sender=rh_user, body=f"message {index}")

        response = authenticated_client(rh_user).get(
            f"{CONVERSATIONS_URL}{conversation.id}/messages/",
            {"limit": "beaucoup"},
        )

        assert len(response.data["results"]) == 50


class TestConversationListPagination:
    def test_list_is_paginated_and_still_exposes_the_unread_total(self, rh_user, db):
        for _ in range(3):
            colleague = UserFactory.create(role=User.Role.EMPLOYEE)
            conversation, _ = get_or_create_direct_conversation(rh_user, colleague)
            post_message(conversation=conversation, sender=colleague, body="Bonjour")

        response = authenticated_client(rh_user).get(CONVERSATIONS_URL, {"page_size": 2})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3
        assert len(response.data["results"]) == 2
        assert response.data["next"] is not None
        assert response.data["unread_total"] == 3


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


class TestReadWatermark:
    def test_a_message_posted_after_reading_stays_unread(self, rh_user, employee_user):
        conversation, _ = get_or_create_direct_conversation(rh_user, employee_user)
        post_message(conversation=conversation, sender=rh_user, body="Premier")

        employee_client = authenticated_client(employee_user)
        employee_client.get(f"{CONVERSATIONS_URL}{conversation.id}/messages/")
        post_message(conversation=conversation, sender=rh_user, body="Second")

        assert employee_client.get(f"{CONVERSATIONS_URL}unread-count/").data["unread_total"] == 1

    def test_reading_an_older_window_does_not_rewind_the_watermark(self, rh_user, employee_user):
        """Lire une fenêtre plus ancienne ne doit pas faire réapparaître des messages déjà lus."""
        conversation, _ = get_or_create_direct_conversation(rh_user, employee_user)
        for index in range(3):
            post_message(conversation=conversation, sender=rh_user, body=f"message {index}")

        employee_client = authenticated_client(employee_user)
        employee_client.get(f"{CONVERSATIONS_URL}{conversation.id}/messages/")
        employee_client.get(f"{CONVERSATIONS_URL}{conversation.id}/messages/", {"limit": "1"})

        assert employee_client.get(f"{CONVERSATIONS_URL}unread-count/").data["unread_total"] == 0


class TestSendThrottling:
    def test_opening_a_conversation_uses_the_message_send_throttle(self, rh_user):
        """`create` poste un message : il doit subir la limite anti-spam, pas la limite générique."""
        request = APIRequestFactory().post(CONVERSATIONS_URL)
        request.user = rh_user
        viewset = ConversationViewSet()
        viewset.action = "create"
        viewset.request = request

        assert [type(throttle) for throttle in viewset.get_throttles()] == [MessageSendThrottle]


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
