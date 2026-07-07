from __future__ import annotations

from unittest.mock import patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.ai.models import ChatHistory
from smart_hr.ai.models import Conversation
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

CONVERSATIONS_URL = "/api/v1/ai/conversations/"
CHAT_URL = "/api/v1/ai/chat/"

pytestmark = pytest.mark.django_db


@pytest.fixture
def user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


@pytest.fixture
def other_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


@pytest.fixture
def conversation(user) -> Conversation:
    return Conversation.objects.create(user=user, title="Ma première conversation")


class _FakeLLMProvider:
    def generate_response(self, system_prompt, history, question):
        return "Réponse de test."

    def extract_json(self, prompt):
        return "{}"


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestConversationListCreate:
    def test_anonymous_cannot_list(self, db):
        client = APIClient()
        response = client.get(CONVERSATIONS_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_lists_only_own_conversations(self, user, other_user, conversation):
        Conversation.objects.create(user=other_user, title="Conversation d'un autre")
        client = _authenticated_client(user)
        response = client.get(CONVERSATIONS_URL)
        assert response.status_code == status.HTTP_200_OK
        titles = [item["title"] for item in response.data["results"]] if "results" in response.data else [item["title"] for item in response.data]
        assert titles == ["Ma première conversation"]

    def test_create_returns_new_conversation_with_default_title(self, user):
        client = _authenticated_client(user)
        response = client.post(CONVERSATIONS_URL, {}, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"]
        assert Conversation.objects.filter(user=user).count() == 1

    def test_ordered_most_recently_updated_first(self, user):
        older = Conversation.objects.create(user=user, title="Ancienne")
        newer = Conversation.objects.create(user=user, title="Récente")
        client = _authenticated_client(user)
        response = client.get(CONVERSATIONS_URL)
        results = response.data["results"] if "results" in response.data else response.data
        ids = [item["id"] for item in results]
        assert ids.index(newer.id) < ids.index(older.id)


class TestConversationDelete:
    def test_owner_can_delete_own_conversation(self, user, conversation):
        client = _authenticated_client(user)
        response = client.delete(f"{CONVERSATIONS_URL}{conversation.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Conversation.objects.filter(id=conversation.id).exists()

    def test_delete_cascades_to_messages(self, user, conversation):
        ChatHistory.objects.create(user=user, conversation=conversation, question="Q", response="R")
        client = _authenticated_client(user)
        client.delete(f"{CONVERSATIONS_URL}{conversation.id}/")
        assert not ChatHistory.objects.filter(conversation_id=conversation.id).exists()

    def test_cannot_delete_another_users_conversation(self, other_user, conversation):
        client = _authenticated_client(other_user)
        response = client.delete(f"{CONVERSATIONS_URL}{conversation.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert Conversation.objects.filter(id=conversation.id).exists()


class TestConversationMessages:
    def test_lists_messages_in_chronological_order(self, user, conversation):
        first = ChatHistory.objects.create(user=user, conversation=conversation, question="Premier", response="R1")
        second = ChatHistory.objects.create(user=user, conversation=conversation, question="Second", response="R2")
        client = _authenticated_client(user)
        response = client.get(f"{CONVERSATIONS_URL}{conversation.id}/messages/")
        assert response.status_code == status.HTTP_200_OK
        questions = [item["question"] for item in response.data]
        assert questions == ["Premier", "Second"]
        assert first.id != second.id

    def test_cannot_list_messages_of_another_users_conversation(self, other_user, conversation):
        client = _authenticated_client(other_user)
        response = client.get(f"{CONVERSATIONS_URL}{conversation.id}/messages/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestChatCreatesConversationAutomatically:
    def test_first_message_without_conversation_id_creates_one(self, user):
        client = _authenticated_client(user)
        with patch("smart_hr.ai.views.chat.get_llm_provider", return_value=_FakeLLMProvider()):
            response = client.post(CHAT_URL, {"question": "Combien de jours de congé me reste-t-il ?"}, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["conversation"] is not None
        conversation_id = response.data["conversation"]
        created = Conversation.objects.get(id=conversation_id)
        assert created.user == user
        assert created.title.startswith("Combien de jours de congé")

    def test_second_message_reuses_provided_conversation_id(self, user, conversation):
        client = _authenticated_client(user)
        with patch("smart_hr.ai.views.chat.get_llm_provider", return_value=_FakeLLMProvider()):
            response = client.post(
                CHAT_URL,
                {"question": "Et pour la paie ?", "conversation": conversation.id},
                format="json",
            )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["conversation"] == conversation.id
        assert ChatHistory.objects.filter(conversation=conversation).count() == 1

    def test_cannot_post_to_another_users_conversation(self, user, other_user, conversation):
        client = _authenticated_client(other_user)
        response = client.post(
            CHAT_URL,
            {"question": "Question interdite", "conversation": conversation.id},
            format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_history_sent_to_llm_is_scoped_to_conversation(self, user):
        other_conversation = Conversation.objects.create(user=user, title="Autre sujet")
        ChatHistory.objects.create(
            user=user,
            conversation=other_conversation,
            question="Question sans rapport",
            response="Réponse sans rapport",
        )
        target_conversation = Conversation.objects.create(user=user, title="Sujet actuel")

        class _CapturingProvider:
            def __init__(self):
                self.received_history = None

            def generate_response(self, system_prompt, history, question):
                self.received_history = history
                return "OK"

            def extract_json(self, prompt):
                return "{}"

        provider = _CapturingProvider()
        client = _authenticated_client(user)
        with patch("smart_hr.ai.views.chat.get_llm_provider", return_value=provider):
            client.post(
                CHAT_URL,
                {"question": "Nouvelle question", "conversation": target_conversation.id},
                format="json",
            )
        history_text = str(provider.received_history)
        assert "Question sans rapport" not in history_text
