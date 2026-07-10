from __future__ import annotations

import datetime

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient

from smart_hr.formation.models import Formation
from smart_hr.formation.models import Participation
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
EXPORT_URL = "/api/v1/stats/overview/export/"


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def department_tech(db) -> Department:
    return Department.objects.create(name="Tech")


@pytest.fixture
def department_tech_backend(db, department_tech) -> Department:
    return Department.objects.create(name="Backend", parent=department_tech)


@pytest.fixture
def department_sales(db) -> Department:
    return Department.objects.create(name="Sales")


@pytest.fixture
def employee_tech(db, department_tech) -> Employee:
    user = UserFactory.create(role=User.Role.EMPLOYEE)
    return Employee.objects.create(user=user, department=department_tech, hire_date=datetime.date(2023, 1, 1), salary=500000)


@pytest.fixture
def employee_tech_backend(db, department_tech_backend) -> Employee:
    user = UserFactory.create(role=User.Role.EMPLOYEE)
    return Employee.objects.create(
        user=user, department=department_tech_backend, hire_date=datetime.date(2023, 1, 1), salary=500000
    )


@pytest.fixture
def employee_sales(db, department_sales) -> Employee:
    user = UserFactory.create(role=User.Role.EMPLOYEE)
    return Employee.objects.create(user=user, department=department_sales, hire_date=datetime.date(2023, 1, 1), salary=500000)


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestDepartmentFilter:
    def test_narrows_totals_to_selected_department(self, rh_user, employee_tech, employee_sales):
        response = _authenticated_client(rh_user).get(ANALYTICS_URL, {"department_id": employee_tech.department_id})

        assert response.data["totals"]["active_employees"] == 1

    def test_includes_descendant_departments(
        self, rh_user, department_tech, employee_tech, employee_tech_backend, employee_sales
    ):
        response = _authenticated_client(rh_user).get(ANALYTICS_URL, {"department_id": department_tech.id})

        assert response.data["totals"]["active_employees"] == 2

    def test_narrows_performance_summary(self, rh_user, employee_tech, employee_sales):
        PerformanceEvaluation.objects.create(employee=employee_tech, year=2026, objectives="X", global_score=90)
        PerformanceEvaluation.objects.create(employee=employee_sales, year=2026, objectives="X", global_score=10)

        response = _authenticated_client(rh_user).get(ANALYTICS_URL, {"department_id": employee_tech.department_id})

        assert response.data["performance_summary"]["evaluated_count"] == 1
        assert response.data["performance_summary"]["average_score"] == 90.0

    def test_invalid_department_id_is_ignored(self, rh_user, employee_tech, employee_sales):
        response = _authenticated_client(rh_user).get(ANALYTICS_URL, {"department_id": "not-a-number"})

        assert response.status_code == 200
        assert response.data["totals"]["active_employees"] == 2

    def test_no_department_id_returns_all(self, rh_user, employee_tech, employee_sales):
        response = _authenticated_client(rh_user).get(ANALYTICS_URL)

        assert response.data["totals"]["active_employees"] == 2

    def test_narrows_department_hierarchy_to_subtree(self, rh_user, department_tech, department_tech_backend, department_sales):
        response = _authenticated_client(rh_user).get(ANALYTICS_URL, {"department_id": department_tech.id})

        names = {entry["name"] for entry in response.data["department_hierarchy"]}
        assert names == {"Tech", "Backend"}


class TestPeriodFilter:
    def test_monthly_headcount_narrows_window(self, rh_user):
        Employee.objects.create(
            user=UserFactory.create(role=User.Role.EMPLOYEE),
            hire_date=datetime.date(2023, 1, 1),
        )
        old_employee = Employee.objects.create(
            user=UserFactory.create(role=User.Role.EMPLOYEE),
            hire_date=datetime.date(2023, 1, 1),
        )
        old_employee.created_at = timezone.now() - datetime.timedelta(days=200)
        old_employee.save(update_fields=["created_at"])

        response_1m = _authenticated_client(rh_user).get(ANALYTICS_URL, {"period": "1m"})
        total_1m = sum(entry["new_hires"] for entry in response_1m.data["monthly_headcount"])

        response_1y = _authenticated_client(rh_user).get(ANALYTICS_URL, {"period": "1y"})
        total_1y = sum(entry["new_hires"] for entry in response_1y.data["monthly_headcount"])

        assert total_1m == 1
        assert total_1y == 2

    def test_recruitment_funnel_narrows_by_period(self, rh_user):
        candidate = UserFactory.create(role=User.Role.CANDIDATE)
        job_offer = JobOffer.objects.create(
            title="Dev", department="Tech", description="X", status=JobOffer.Status.OPEN, created_by=rh_user
        )
        old_application = Application.objects.create(
            job_offer=job_offer,
            candidate=candidate,
            cv=SimpleUploadedFile("cv.pdf", b"%PDF", content_type="application/pdf"),
            status=Application.Status.PENDING,
        )
        old_application.created_at = timezone.now() - datetime.timedelta(days=200)
        old_application.save(update_fields=["created_at"])

        response_1m = _authenticated_client(rh_user).get(ANALYTICS_URL, {"period": "1m"})
        total_1m = sum(entry["count"] for entry in response_1m.data["recruitment_funnel"])

        response_1y = _authenticated_client(rh_user).get(ANALYTICS_URL, {"period": "1y"})
        total_1y = sum(entry["count"] for entry in response_1y.data["recruitment_funnel"])

        assert total_1m == 0
        assert total_1y == 1

    def test_engagement_summary_narrows_by_period(self, rh_user, employee_tech):
        survey = Survey.objects.create(title="Engagement", status=Survey.Status.ACTIVE)
        question = SurveyQuestion.objects.create(survey=survey, text="Note ?", question_type=SurveyQuestion.QuestionType.RATING)
        response_obj = SurveyResponse.objects.create(survey=survey, respondent=employee_tech.user)
        SurveyAnswer.objects.create(response=response_obj, question=question, text_answer="5")
        response_obj.submitted_at = timezone.now() - datetime.timedelta(days=200)
        response_obj.save(update_fields=["submitted_at"])

        response_1m = _authenticated_client(rh_user).get(ANALYTICS_URL, {"period": "1m"})
        response_1y = _authenticated_client(rh_user).get(ANALYTICS_URL, {"period": "1y"})

        assert response_1m.data["engagement_summary"]["responses_count"] == 0
        assert response_1y.data["engagement_summary"]["responses_count"] == 1

    def test_training_summary_narrows_by_period(self, rh_user, employee_tech):
        now = timezone.now()
        recent_formation = Formation.objects.create(
            title="Recent", start_date=now, end_date=now + datetime.timedelta(days=1), instructor="A", cost=1000
        )
        old_formation = Formation.objects.create(
            title="Old",
            start_date=now - datetime.timedelta(days=200),
            end_date=now - datetime.timedelta(days=199),
            instructor="B",
            cost=2000,
        )
        Participation.objects.create(employee=employee_tech, formation=recent_formation)
        Participation.objects.create(employee=employee_tech, formation=old_formation)

        response_1m = _authenticated_client(rh_user).get(ANALYTICS_URL, {"period": "1m"})
        response_1y = _authenticated_client(rh_user).get(ANALYTICS_URL, {"period": "1y"})

        assert response_1m.data["training_summary"]["total_formations"] == 1
        assert response_1y.data["training_summary"]["total_formations"] == 2

    def test_invalid_period_defaults_to_one_year(self, rh_user):
        response = _authenticated_client(rh_user).get(ANALYTICS_URL, {"period": "bogus"})
        assert response.status_code == 200


class TestExportRespectsFilters:
    def test_export_applies_department_filter(self, rh_user, employee_tech, employee_sales):
        response = _authenticated_client(rh_user).get(EXPORT_URL, {"department_id": employee_tech.department_id})
        assert response.status_code == 200

        import io

        import openpyxl

        workbook = openpyxl.load_workbook(io.BytesIO(response.content))
        rows = list(workbook["Effectifs"].iter_rows(values_only=True))
        header, values = rows[0], rows[1]
        active_employees_index = header.index("active_employees")
        assert values[active_employees_index] == 1
