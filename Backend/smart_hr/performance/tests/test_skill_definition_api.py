from __future__ import annotations

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.performance.models import SkillDefinition
from smart_hr.users.models import User

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/performance/skill-definitions/"


@pytest.fixture
def rh_user(db) -> User:
    return User.objects.create_user(
        username="rh_skilldef",
        email="rh_skilldef@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture
def employee_user(db) -> User:
    return User.objects.create_user(
        username="employee_skilldef",
        email="employee_skilldef@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestReadAccess:
    def test_anonymous_cannot_list(self):
        client = APIClient()
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_employee_can_list(self, employee_user):
        SkillDefinition.objects.create(name="Python", category="technical")
        client = _authenticated_client(employee_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", response.data)
        assert len(results) == 1


class TestWriteAccess:
    def test_employee_cannot_create(self, employee_user):
        client = _authenticated_client(employee_user)
        response = client.post(LIST_URL, {"name": "Python", "category": "technical"}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rh_can_create(self, rh_user):
        client = _authenticated_client(rh_user)
        response = client.post(
            LIST_URL,
            {"name": "Python", "category": "technical", "description": "Langage de programmation backend"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert SkillDefinition.objects.filter(name="Python").exists()

    def test_rh_cannot_create_duplicate_name(self, rh_user):
        SkillDefinition.objects.create(name="Python", category="technical")
        client = _authenticated_client(rh_user)
        response = client.post(LIST_URL, {"name": "Python", "category": "technical"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_rh_can_delete(self, rh_user):
        skill_definition = SkillDefinition.objects.create(name="Python", category="technical")
        client = _authenticated_client(rh_user)
        response = client.delete(f"{LIST_URL}{skill_definition.pk}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not SkillDefinition.objects.filter(pk=skill_definition.pk).exists()

    def test_employee_cannot_delete(self, rh_user, employee_user):
        skill_definition = SkillDefinition.objects.create(name="Python", category="technical")
        client = _authenticated_client(employee_user)
        response = client.delete(f"{LIST_URL}{skill_definition.pk}/")
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestFilteringAndSearch:
    def test_filter_by_category(self, employee_user):
        SkillDefinition.objects.create(name="Python", category="technical")
        SkillDefinition.objects.create(name="Leadership", category="managerial")
        client = _authenticated_client(employee_user)
        response = client.get(LIST_URL, {"category": "managerial"})
        results = response.data.get("results", response.data)
        assert len(results) == 1
        assert results[0]["name"] == "Leadership"

    def test_search_by_name(self, employee_user):
        SkillDefinition.objects.create(name="Python", category="technical")
        SkillDefinition.objects.create(name="Django", category="technical")
        client = _authenticated_client(employee_user)
        response = client.get(LIST_URL, {"search": "Djan"})
        results = response.data.get("results", response.data)
        assert len(results) == 1
        assert results[0]["name"] == "Django"
