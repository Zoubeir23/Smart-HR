from __future__ import annotations

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.personnel.models import CareerPath
from smart_hr.personnel.models import Position
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/personnel/career-paths/"


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


@pytest.fixture
def position_junior(db) -> Position:
    return Position.objects.create(title="Développeur Junior")


@pytest.fixture
def position_senior(db) -> Position:
    return Position.objects.create(title="Développeur Senior")


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestCreateCareerPath:
    def test_rh_can_create_career_path_with_ordered_steps(self, rh_user, position_junior, position_senior):
        client = _authenticated_client(rh_user)
        payload = {
            "title": "Parcours Développeur",
            "description": "Progression technique standard",
            "steps": [{"position": position_junior.pk}, {"position": position_senior.pk}],
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        career_path = CareerPath.objects.get(pk=response.data["id"])
        steps = list(career_path.steps.order_by("order"))
        assert [s.position_id for s in steps] == [position_junior.pk, position_senior.pk]
        assert [s.order for s in steps] == [0, 1]

    def test_employee_cannot_create_career_path(self, employee_user, position_junior):
        client = _authenticated_client(employee_user)
        payload = {"title": "Parcours interdit", "steps": [{"position": position_junior.pk}]}
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_employee_can_view_career_paths(self, employee_user, rh_user, position_junior):
        CareerPath.objects.create(title="Parcours visible")
        client = _authenticated_client(employee_user)
        response = client.get(LIST_URL)
        results = response.data.get("results", response.data)
        assert len(results) == 1

    def test_anonymous_cannot_create(self, position_junior):
        client = APIClient()
        response = client.post(LIST_URL, {"title": "X", "steps": []}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
