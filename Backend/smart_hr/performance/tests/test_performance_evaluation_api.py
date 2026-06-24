from __future__ import annotations

import datetime

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.performance.models import PerformanceEvaluation
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position
from smart_hr.users.models import User

LIST_URL = "/api/v1/performance/evaluations/"


@pytest.fixture
def department(db):
    return Department.objects.create(name="Engineering")


@pytest.fixture
def position(db):
    return Position.objects.create(title="Developer")


@pytest.fixture
def rh_user(db) -> User:
    return User.objects.create_user(
        username="rh_perf",
        email="rh_perf@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture
def employee_user(db) -> User:
    return User.objects.create_user(
        username="emp_perf",
        email="emp_perf@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture
def other_employee_user(db) -> User:
    return User.objects.create_user(
        username="other_perf",
        email="other_perf@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture
def rh_employee(db, rh_user, department) -> Employee:
    return Employee.objects.create(
        user=rh_user,
        department=department,
        hire_date=datetime.date(2022, 1, 1),
        salary=700000,
    )


@pytest.fixture
def employee(db, employee_user, department, position) -> Employee:
    return Employee.objects.create(
        user=employee_user,
        department=department,
        position=position,
        hire_date=datetime.date(2023, 1, 1),
        salary=500000,
    )


@pytest.fixture
def other_employee(db, other_employee_user, department, position) -> Employee:
    return Employee.objects.create(
        user=other_employee_user,
        department=department,
        position=position,
        hire_date=datetime.date(2023, 6, 1),
        salary=450000,
    )


@pytest.fixture
def evaluation(db, employee, rh_employee) -> PerformanceEvaluation:
    return PerformanceEvaluation.objects.create(
        employee=employee,
        reviewer=rh_employee,
        year=2024,
        objectives="Atteindre les KPIs Q4",
        achievements="Objectifs dépassés de 20%",
        global_score=85,
        status=PerformanceEvaluation.EvaluationStatus.APPROVED,
    )


@pytest.fixture
def other_evaluation(db, other_employee, rh_employee) -> PerformanceEvaluation:
    return PerformanceEvaluation.objects.create(
        employee=other_employee,
        reviewer=rh_employee,
        year=2024,
        objectives="Améliorer la qualité du code",
        global_score=70,
        status=PerformanceEvaluation.EvaluationStatus.SUBMITTED,
    )


class TestPerformanceEvaluationVisibility:
    def test_rh_sees_all_evaluations(self, db, rh_user, evaluation, other_evaluation):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_employee_sees_only_own_evaluations(self, db, employee_user, evaluation, other_evaluation):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["year"] == 2024

    def test_anonymous_cannot_list_evaluations(self, db, evaluation):
        client = APIClient()
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_rh_can_filter_by_status(self, db, rh_user, evaluation, other_evaluation):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL, {"status": PerformanceEvaluation.EvaluationStatus.APPROVED})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_rh_can_filter_by_year(self, db, rh_user, evaluation, other_evaluation):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL, {"year": 2024})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2


class TestPerformanceEvaluationCRUD:
    def test_rh_can_create_evaluation(self, db, rh_user, rh_employee, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        payload = {
            "employee": employee.pk,
            "year": 2025,
            "objectives": "Nouveaux objectifs",
            "status": PerformanceEvaluation.EvaluationStatus.DRAFT,
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["year"] == 2025

    def test_employee_cannot_create_evaluation(self, db, employee_user, employee):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        payload = {
            "employee": employee.pk,
            "year": 2025,
            "objectives": "Auto-évaluation",
            "status": PerformanceEvaluation.EvaluationStatus.DRAFT,
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rh_can_update_evaluation(self, db, rh_user, evaluation):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.patch(
            f"{LIST_URL}{evaluation.pk}/",
            {"global_score": 90},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["global_score"] == 90

    def test_rh_can_delete_evaluation(self, db, rh_user, evaluation):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.delete(f"{LIST_URL}{evaluation.pk}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT


class TestPerformanceStats:
    def test_rh_can_access_stats(self, db, rh_user, evaluation, other_evaluation):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(f"{LIST_URL}stats/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["total"] == 2
        assert response.data["average_score"] == 77.5

    def test_employee_cannot_access_stats(self, db, employee_user):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(f"{LIST_URL}stats/")
        assert response.status_code == status.HTTP_403_FORBIDDEN
