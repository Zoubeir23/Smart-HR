from __future__ import annotations

import datetime

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient

from smart_hr.formation.models import Formation
from smart_hr.performance.models import PerformanceEvaluation
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.recruitment.models import Application
from smart_hr.recruitment.models import JobOffer
from smart_hr.survey.models import Survey
from smart_hr.survey.models import SurveyAnswer
from smart_hr.survey.models import SurveyQuestion
from smart_hr.survey.models import SurveyResponse
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

ANALYTICS_URL = "/api/v1/stats/overview/"


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def parent_department(db) -> Department:
    return Department.objects.create(name="Direction Générale", unit_type=Department.UnitType.DG)


@pytest.fixture
def child_department(db, parent_department) -> Department:
    return Department.objects.create(name="Support", parent=parent_department)


@pytest.fixture
def employee(db, child_department) -> Employee:
    user = UserFactory.create(role=User.Role.EMPLOYEE)
    return Employee.objects.create(user=user, department=child_department, hire_date=datetime.date(2023, 1, 1))


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestPerformanceSummary:
    def test_computes_average_score_and_distribution(self, rh_user, employee):
        PerformanceEvaluation.objects.create(employee=employee, year=2026, objectives="X", global_score=90)
        PerformanceEvaluation.objects.create(employee=employee, year=2025, objectives="X", global_score=50)

        response = _authenticated_client(rh_user).get(ANALYTICS_URL)

        summary = response.data["performance_summary"]
        assert summary["evaluated_count"] == 2
        assert summary["average_score"] == 70.0
        distribution = {entry["label"]: entry["count"] for entry in summary["distribution"]}
        assert sum(distribution.values()) == 2

    def test_defaults_to_zero_without_evaluations(self, rh_user):
        response = _authenticated_client(rh_user).get(ANALYTICS_URL)

        summary = response.data["performance_summary"]
        assert summary["evaluated_count"] == 0
        assert summary["average_score"] == 0.0


class TestRecruitmentFunnel:
    def test_counts_applications_by_status(self, rh_user):
        candidate = UserFactory.create(role=User.Role.CANDIDATE)
        other_candidate = UserFactory.create(role=User.Role.CANDIDATE)
        job_offer = JobOffer.objects.create(
            title="Dev Backend",
            department="Tech",
            description="Développeur backend",
            status=JobOffer.Status.OPEN,
            created_by=rh_user,
        )
        Application.objects.create(
            job_offer=job_offer,
            candidate=candidate,
            cv=SimpleUploadedFile("cv.pdf", b"%PDF fake", content_type="application/pdf"),
            status=Application.Status.PENDING,
        )
        Application.objects.create(
            job_offer=job_offer,
            candidate=other_candidate,
            cv=SimpleUploadedFile("cv2.pdf", b"%PDF fake", content_type="application/pdf"),
            status=Application.Status.ACCEPTED,
        )

        response = _authenticated_client(rh_user).get(ANALYTICS_URL)

        funnel = {entry["status"]: entry["count"] for entry in response.data["recruitment_funnel"]}
        assert funnel["pending"] == 1
        assert funnel["accepted"] == 1
        assert funnel.get("rejected", 0) == 0

    def test_empty_without_applications(self, rh_user):
        response = _authenticated_client(rh_user).get(ANALYTICS_URL)

        funnel = {entry["status"]: entry["count"] for entry in response.data["recruitment_funnel"]}
        assert all(count == 0 for count in funnel.values())


class TestEngagementSummary:
    def test_averages_rating_answers_across_surveys(self, rh_user, employee):
        survey = Survey.objects.create(title="Engagement 2026", status=Survey.Status.ACTIVE)
        question = SurveyQuestion.objects.create(
            survey=survey,
            text="Recommanderiez-vous l'entreprise ?",
            question_type=SurveyQuestion.QuestionType.RATING,
        )
        response_obj = SurveyResponse.objects.create(survey=survey, respondent=employee.user)
        SurveyAnswer.objects.create(response=response_obj, question=question, text_answer="4")

        second_respondent = UserFactory.create(role=User.Role.EMPLOYEE)
        response_obj_2 = SurveyResponse.objects.create(survey=survey, respondent=second_respondent)
        SurveyAnswer.objects.create(response=response_obj_2, question=question, text_answer="2")

        response = _authenticated_client(rh_user).get(ANALYTICS_URL)

        engagement = response.data["engagement_summary"]
        assert engagement["responses_count"] == 2
        assert engagement["average_rating"] == 3.0

    def test_ignores_non_numeric_rating_answers(self, rh_user, employee):
        """Régression : une réponse RATING non numérique ne doit jamais faire
        planter l'agrégat (même défense que le endpoint résultats de survey)."""
        survey = Survey.objects.create(title="Engagement", status=Survey.Status.ACTIVE)
        question = SurveyQuestion.objects.create(survey=survey, text="Note ?", question_type=SurveyQuestion.QuestionType.RATING)
        response_obj = SurveyResponse.objects.create(survey=survey, respondent=employee.user)
        SurveyAnswer.objects.create(response=response_obj, question=question, text_answer="non applicable")

        response = _authenticated_client(rh_user).get(ANALYTICS_URL)

        assert response.status_code == 200
        assert response.data["engagement_summary"]["responses_count"] == 0

    def test_defaults_to_zero_without_surveys(self, rh_user):
        response = _authenticated_client(rh_user).get(ANALYTICS_URL)

        engagement = response.data["engagement_summary"]
        assert engagement["responses_count"] == 0
        assert engagement["average_rating"] == 0.0


class TestDepartmentHierarchy:
    def test_includes_parent_id_and_employee_count(self, rh_user, parent_department, child_department, employee):
        response = _authenticated_client(rh_user).get(ANALYTICS_URL)

        hierarchy = {entry["name"]: entry for entry in response.data["department_hierarchy"]}
        assert hierarchy["Direction Générale"]["parent_id"] is None
        assert hierarchy["Support"]["parent_id"] == parent_department.id
        assert hierarchy["Support"]["employee_count"] == 1


class TestTrainingSummaryExtended:
    def test_reports_available_courses_and_cost_breakdown(self, rh_user):
        now = timezone.now()
        Formation.objects.create(
            title="Formation future",
            start_date=now,
            end_date=now + datetime.timedelta(days=30),
            instructor="Alice",
            cost=150000,
        )
        Formation.objects.create(
            title="Formation passée",
            start_date=now - datetime.timedelta(days=60),
            end_date=now - datetime.timedelta(days=30),
            instructor="Bob",
            cost=50000,
        )

        response = _authenticated_client(rh_user).get(ANALYTICS_URL)

        training_summary = response.data["training_summary"]
        assert training_summary["available_courses"] == 1
        cost_breakdown = {entry["title"]: entry["cost"] for entry in training_summary["cost_breakdown"]}
        assert cost_breakdown["Formation future"] == 150000.0
        assert cost_breakdown["Formation passée"] == 50000.0
