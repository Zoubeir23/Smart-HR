from __future__ import annotations

import datetime

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.performance.models import Feedback360
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.users.models import User

LIST_URL = "/api/v1/performance/feedback-360/"


@pytest.fixture
def department(db):
    return Department.objects.create(name="Audit")


@pytest.fixture
def rh_user(db) -> User:
    return User.objects.create_user(
        username="rh_fb360",
        email="rh_fb360@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture
def author_user(db) -> User:
    return User.objects.create_user(
        username="author_fb360",
        email="author_fb360@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture
def recipient_user(db) -> User:
    return User.objects.create_user(
        username="recipient_fb360",
        email="recipient_fb360@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture
def other_user(db) -> User:
    return User.objects.create_user(
        username="other_fb360",
        email="other_fb360@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture
def author_employee(db, author_user, department) -> Employee:
    return Employee.objects.create(user=author_user, department=department, hire_date=datetime.date(2023, 1, 1))


@pytest.fixture
def recipient_employee(db, recipient_user, department) -> Employee:
    return Employee.objects.create(user=recipient_user, department=department, hire_date=datetime.date(2023, 1, 1))


@pytest.fixture
def other_employee(db, other_user, department) -> Employee:
    return Employee.objects.create(user=other_user, department=department, hire_date=datetime.date(2023, 1, 1))


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestCreateFeedback360:
    def test_employee_can_give_feedback_to_colleague(self, author_employee, recipient_employee):
        client = _authenticated_client(author_employee.user)
        payload = {
            "recipient": recipient_employee.pk,
            "context": "Mission d'audit à l'agence d'Acassato",
            "comment": "J'ai réellement apprécié sa disponibilité et son engagement.",
            "tags": ["availability", "patience"],
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        feedback = Feedback360.objects.get(pk=response.data["id"])
        assert feedback.author == author_employee
        assert feedback.recipient == recipient_employee
        assert feedback.tags == ["availability", "patience"]

    def test_author_is_forced_from_request_not_payload(self, author_employee, recipient_employee, other_employee):
        client = _authenticated_client(author_employee.user)
        payload = {
            "author": other_employee.pk,
            "recipient": recipient_employee.pk,
            "comment": "Bon travail.",
            "tags": [],
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        feedback = Feedback360.objects.get(pk=response.data["id"])
        assert feedback.author == author_employee

    def test_cannot_give_feedback_to_self(self, author_employee):
        client = _authenticated_client(author_employee.user)
        payload = {"recipient": author_employee.pk, "comment": "Bravo à moi-même.", "tags": []}
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_tag_is_rejected(self, author_employee, recipient_employee):
        client = _authenticated_client(author_employee.user)
        payload = {"recipient": recipient_employee.pk, "comment": "Bien.", "tags": ["inexistant"]}
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_anonymous_cannot_create(self, recipient_employee):
        client = APIClient()
        payload = {"recipient": recipient_employee.pk, "comment": "Bien.", "tags": []}
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestListFeedback360:
    def test_employee_sees_only_feedback_given_or_received(self, author_employee, recipient_employee, other_employee, rh_user):
        Feedback360.objects.create(author=author_employee, recipient=recipient_employee, comment="Feedback A→R", tags=["respect"])
        Feedback360.objects.create(author=other_employee, recipient=author_employee, comment="Feedback O→A", tags=["patience"])
        Feedback360.objects.create(
            author=other_employee, recipient=recipient_employee, comment="Feedback O→R (non lié à author)", tags=[]
        )

        client = _authenticated_client(author_employee.user)
        response = client.get(LIST_URL)
        results = response.data.get("results", response.data)
        comments = {item["comment"] for item in results}
        assert comments == {"Feedback A→R", "Feedback O→A"}

    def test_rh_sees_all_feedback(self, author_employee, recipient_employee, other_employee, rh_user):
        Feedback360.objects.create(author=author_employee, recipient=recipient_employee, comment="Feedback 1", tags=[])
        Feedback360.objects.create(author=other_employee, recipient=recipient_employee, comment="Feedback 2", tags=[])

        client = _authenticated_client(rh_user)
        response = client.get(LIST_URL)
        results = response.data.get("results", response.data)
        assert len(results) == 2
