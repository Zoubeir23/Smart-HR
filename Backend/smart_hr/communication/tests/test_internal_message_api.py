from __future__ import annotations

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.communication.models import InternalMessage
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

LIST_URL = "/api/v1/communication/messages/"


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


@pytest.fixture
def candidate_user(db) -> User:
    return UserFactory.create(role=User.Role.CANDIDATE)


@pytest.fixture
def published_all_message(db, rh_user) -> InternalMessage:
    return InternalMessage.objects.create(
        title="Annonce générale",
        content="Message pour tous",
        message_type=InternalMessage.MessageType.MEMO,
        target_audience=InternalMessage.TargetAudience.ALL,
        author=rh_user,
        is_published=True,
    )


@pytest.fixture
def draft_rh_message(db, rh_user) -> InternalMessage:
    return InternalMessage.objects.create(
        title="Brouillon RH",
        content="Non publié",
        message_type=InternalMessage.MessageType.NOTE_SERVICE,
        target_audience=InternalMessage.TargetAudience.RH,
        author=rh_user,
        is_published=False,
    )


class TestInternalMessageVisibility:
    def test_employee_sees_published_all_messages(self, db, employee_user, published_all_message):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_employee_cannot_see_draft(self, db, employee_user, draft_rh_message):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 0

    def test_rh_sees_all_including_drafts(self, db, rh_user, published_all_message, draft_rh_message):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_candidate_cannot_see_messages(self, db, candidate_user, published_all_message):
        client = APIClient()
        client.force_authenticate(user=candidate_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 0

    def test_anonymous_cannot_list_messages(self, db, published_all_message):
        client = APIClient()
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestInternalMessageCRUD:
    def test_rh_can_create_message(self, db, rh_user):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        payload = {
            "title": "Nouvelle politique",
            "content": "Contenu de la politique",
            "message_type": InternalMessage.MessageType.MEMO,
            "target_audience": InternalMessage.TargetAudience.ALL,
            "is_published": True,
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["author"] == rh_user.id

    def test_employee_cannot_create_message(self, db, employee_user):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        payload = {
            "title": "Tentative",
            "content": "Contenu",
            "message_type": InternalMessage.MessageType.MEMO,
            "target_audience": InternalMessage.TargetAudience.ALL,
            "is_published": True,
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rh_can_update_message(self, db, rh_user, published_all_message):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.patch(
            f"{LIST_URL}{published_all_message.pk}/",
            {"title": "Titre modifié"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Titre modifié"

    def test_rh_can_delete_message(self, db, rh_user, published_all_message):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.delete(f"{LIST_URL}{published_all_message.pk}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_search_messages_by_title(self, db, rh_user, published_all_message, draft_rh_message):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL, {"search": "Annonce"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["title"] == "Annonce générale"

    def test_filter_by_message_type(self, db, rh_user, published_all_message, draft_rh_message):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL, {"message_type": InternalMessage.MessageType.NOTE_SERVICE})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["title"] == "Brouillon RH"


class TestInternalMessageStats:
    def test_rh_can_access_stats(self, db, rh_user, published_all_message, draft_rh_message):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(f"{LIST_URL}stats/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["total"] == 2
        assert response.data["published"] == 1
        assert response.data["drafts"] == 1

    def test_employee_cannot_access_stats(self, db, employee_user):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(f"{LIST_URL}stats/")
        assert response.status_code == status.HTTP_403_FORBIDDEN
