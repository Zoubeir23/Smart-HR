from __future__ import annotations

import datetime

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.formation.models import Formation
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

LIST_URL = "/api/v1/formation/formations/"


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


@pytest.fixture
def formation(db) -> Formation:
    return Formation.objects.create(
        title="Formation Django REST",
        description="Approfondissement Django et DRF",
        instructor="Alice Dupont",
        start_date=datetime.datetime(2024, 9, 1, 9, 0, tzinfo=datetime.UTC),
        end_date=datetime.datetime(2024, 9, 3, 17, 0, tzinfo=datetime.UTC),
    )


@pytest.fixture
def second_formation(db) -> Formation:
    return Formation.objects.create(
        title="Formation React",
        description="Initiation React 18",
        instructor="Bob Martin",
        start_date=datetime.datetime(2024, 10, 1, 9, 0, tzinfo=datetime.UTC),
        end_date=datetime.datetime(2024, 10, 5, 17, 0, tzinfo=datetime.UTC),
    )


class TestFormationVisibility:
    def test_rh_can_list_formations(self, db, rh_user, formation, second_formation):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_employee_can_list_formations(self, db, employee_user, formation):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_anonymous_cannot_list_formations(self, db, formation):
        client = APIClient()
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_can_retrieve_formation(self, db, employee_user, formation):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(f"{LIST_URL}{formation.pk}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Formation Django REST"


class TestFormationCRUD:
    def test_rh_can_create_formation(self, db, rh_user):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        payload = {
            "title": "Formation Docker",
            "description": "Conteneurisation et orchestration",
            "start_date": "2024-11-04T09:00:00Z",
            "end_date": "2024-11-06T17:00:00Z",
            "instructor": "Jean-Pierre Martin",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "Formation Docker"

    def test_employee_cannot_create_formation(self, db, employee_user):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        payload = {
            "title": "Formation non autorisée",
            "start_date": "2024-11-04T09:00:00Z",
            "end_date": "2024-11-06T17:00:00Z",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rh_can_update_formation(self, db, rh_user, formation):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.patch(
            f"{LIST_URL}{formation.pk}/",
            {"title": "Formation Django REST avancé"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Formation Django REST avancé"

    def test_employee_cannot_update_formation(self, db, employee_user, formation):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.patch(
            f"{LIST_URL}{formation.pk}/",
            {"title": "Tentative de modification"},
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rh_can_delete_formation(self, db, rh_user, formation):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.delete(f"{LIST_URL}{formation.pk}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
