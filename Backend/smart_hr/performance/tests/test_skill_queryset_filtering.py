"""Régression : le filtrage des compétences par employé ne doit jamais
lever Employee.DoesNotExist pour un utilisateur sans profil employé
(candidat, compte fraîchement créé) — il doit renvoyer une liste vide."""

from __future__ import annotations

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.performance.models import Skill
from smart_hr.personnel.models import Employee
from smart_hr.users.models import User

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/performance/skills/"


def _authenticated_client(as_user: User) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


@pytest.fixture
def candidate_user(db) -> User:
    return User.objects.create_user(
        username="candidate_skills",
        email="candidate_skills@test.com",
        password="pass1234!",
        role=User.Role.CANDIDATE,
        is_email_verified=True,
    )


@pytest.fixture
def employee_user_with_profile(db) -> tuple[User, Employee]:
    user = User.objects.create_user(
        username="employee_skills",
        email="employee_skills@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )
    employee = Employee.objects.create(user=user)
    return user, employee


class TestSkillQuerysetFiltering:
    def test_user_without_employee_profile_gets_empty_list_not_500(self, candidate_user):
        response = _authenticated_client(candidate_user).get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        results = payload.get("results", payload)
        assert results == []

    def test_employee_only_sees_own_skills(self, employee_user_with_profile):
        user, employee = employee_user_with_profile
        other_user = User.objects.create_user(
            username="other_employee_skills",
            email="other_employee_skills@test.com",
            password="pass1234!",
            role=User.Role.EMPLOYEE,
            is_email_verified=True,
        )
        other_employee = Employee.objects.create(user=other_user)
        own_skill = Skill.objects.create(employee=employee, name="Python", category="technical", level=3)
        Skill.objects.create(employee=other_employee, name="Java", category="technical", level=2)

        response = _authenticated_client(user).get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        results = payload.get("results", payload)
        assert [skill["id"] for skill in results] == [own_skill.id]
