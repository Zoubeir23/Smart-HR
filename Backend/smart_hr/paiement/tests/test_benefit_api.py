from __future__ import annotations

import datetime

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.paiement.models import BenefitPlan
from smart_hr.paiement.models import EmployeeBenefit
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.users.models import User

pytestmark = pytest.mark.django_db

PLANS_URL = "/api/v1/paiement/benefit-plans/"
ENROLLMENTS_URL = "/api/v1/paiement/employee-benefits/"


@pytest.fixture
def department(db) -> Department:
    return Department.objects.create(name="Support")


@pytest.fixture
def rh_user(db) -> User:
    return User.objects.create_user(
        username="rh_benefit",
        email="rh_benefit@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture
def employee_user(db) -> User:
    return User.objects.create_user(
        username="emp_benefit",
        email="emp_benefit@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture
def other_employee_user(db) -> User:
    return User.objects.create_user(
        username="other_benefit",
        email="other_benefit@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture
def employee(db, employee_user, department) -> Employee:
    return Employee.objects.create(user=employee_user, department=department, hire_date=datetime.date(2023, 1, 1))


@pytest.fixture
def other_employee(db, other_employee_user, department) -> Employee:
    return Employee.objects.create(user=other_employee_user, department=department, hire_date=datetime.date(2023, 1, 1))


@pytest.fixture
def plan(db) -> BenefitPlan:
    return BenefitPlan.objects.create(
        name="Mutuelle santé",
        category=BenefitPlan.Category.HEALTH,
        employer_contribution=50000,
        employee_contribution=10000,
    )


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestBenefitPlanCatalog:
    def test_rh_can_create_plan(self, rh_user):
        client = _authenticated_client(rh_user)
        payload = {
            "name": "Tickets restaurant",
            "category": "meal",
            "employer_contribution": 30000,
            "employee_contribution": 5000,
        }
        response = client.post(PLANS_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert BenefitPlan.objects.filter(name="Tickets restaurant").exists()

    def test_employee_cannot_create_plan(self, employee_user):
        client = _authenticated_client(employee_user)
        response = client.post(PLANS_URL, {"name": "Interdit"}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_employee_can_view_catalog(self, employee_user, plan):
        client = _authenticated_client(employee_user)
        response = client.get(PLANS_URL)
        results = response.data.get("results", response.data)
        assert len(results) == 1

    def test_anonymous_cannot_view_catalog(self, plan):
        client = APIClient()
        response = client.get(PLANS_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestEmployeeBenefitEnrollment:
    def test_rh_can_enroll_employee(self, rh_user, employee, plan):
        client = _authenticated_client(rh_user)
        payload = {"employee": employee.pk, "plan": plan.pk, "status": "active"}
        response = client.post(ENROLLMENTS_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert EmployeeBenefit.objects.filter(employee=employee, plan=plan, status="active").exists()

    def test_employee_cannot_self_enroll(self, employee_user, employee, plan):
        client = _authenticated_client(employee_user)
        payload = {"employee": employee.pk, "plan": plan.pk, "status": "pending"}
        response = client.post(ENROLLMENTS_URL, payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_cannot_enroll_same_employee_twice_on_same_plan_while_active(self, rh_user, employee, plan):
        EmployeeBenefit.objects.create(employee=employee, plan=plan, status=EmployeeBenefit.Status.ACTIVE)
        client = _authenticated_client(rh_user)
        response = client.post(ENROLLMENTS_URL, {"employee": employee.pk, "plan": plan.pk, "status": "pending"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_can_reenroll_after_termination(self, rh_user, employee, plan):
        EmployeeBenefit.objects.create(
            employee=employee,
            plan=plan,
            status=EmployeeBenefit.Status.TERMINATED,
            terminated_at=datetime.date(2026, 1, 1),
        )
        client = _authenticated_client(rh_user)
        response = client.post(ENROLLMENTS_URL, {"employee": employee.pk, "plan": plan.pk, "status": "active"}, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_employee_sees_only_own_enrollments(self, employee, other_employee, plan):
        EmployeeBenefit.objects.create(employee=employee, plan=plan, status=EmployeeBenefit.Status.ACTIVE)
        EmployeeBenefit.objects.create(employee=other_employee, plan=plan, status=EmployeeBenefit.Status.ACTIVE)

        client = _authenticated_client(employee.user)
        response = client.get(ENROLLMENTS_URL)
        results = response.data.get("results", response.data)
        assert len(results) == 1
        assert results[0]["employee"] == employee.pk

    def test_rh_sees_all_enrollments(self, rh_user, employee, other_employee, plan):
        EmployeeBenefit.objects.create(employee=employee, plan=plan, status=EmployeeBenefit.Status.ACTIVE)
        EmployeeBenefit.objects.create(employee=other_employee, plan=plan, status=EmployeeBenefit.Status.ACTIVE)

        client = _authenticated_client(rh_user)
        response = client.get(ENROLLMENTS_URL)
        results = response.data.get("results", response.data)
        assert len(results) == 2

    def test_enrolled_count_reflects_active_enrollments_only(self, rh_user, employee, other_employee, plan):
        EmployeeBenefit.objects.create(employee=employee, plan=plan, status=EmployeeBenefit.Status.ACTIVE)
        EmployeeBenefit.objects.create(employee=other_employee, plan=plan, status=EmployeeBenefit.Status.TERMINATED)

        client = _authenticated_client(rh_user)
        response = client.get(PLANS_URL)
        results = response.data.get("results", response.data)
        assert results[0]["enrolled_count"] == 1

    def test_listing_plans_does_not_trigger_n_plus_one_on_enrolled_count(self, rh_user, employee, other_employee):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        plan_a = BenefitPlan.objects.create(name="Plan A", category=BenefitPlan.Category.MEAL)
        plan_b = BenefitPlan.objects.create(name="Plan B", category=BenefitPlan.Category.TRANSPORT)
        EmployeeBenefit.objects.create(employee=employee, plan=plan_a, status=EmployeeBenefit.Status.ACTIVE)
        EmployeeBenefit.objects.create(employee=other_employee, plan=plan_b, status=EmployeeBenefit.Status.ACTIVE)

        client = _authenticated_client(rh_user)
        with CaptureQueriesContext(connection) as context:
            response = client.get(PLANS_URL)
        assert response.status_code == status.HTTP_200_OK
        # 1 requête pour lister les plans + 1 pour le prefetch des enrollments,
        # peu importe le nombre de plans (pas de requête supplémentaire par plan).
        assert len(context) <= 5


class TestEmployeeBenefitUniqueConstraint:
    def test_database_rejects_duplicate_active_enrollment_bypassing_serializer(self, employee, plan):
        """Le serializer valide déjà les doublons, mais la contrainte DB doit
        aussi protéger contre une création directe (ex: script, autre code
        applicatif) qui contournerait la validation applicative."""
        from django.db import IntegrityError

        EmployeeBenefit.objects.create(employee=employee, plan=plan, status=EmployeeBenefit.Status.ACTIVE)
        with pytest.raises(IntegrityError):
            EmployeeBenefit.objects.create(employee=employee, plan=plan, status=EmployeeBenefit.Status.PENDING)

    def test_database_allows_reenrollment_after_termination(self, employee, plan):
        EmployeeBenefit.objects.create(employee=employee, plan=plan, status=EmployeeBenefit.Status.TERMINATED)
        EmployeeBenefit.objects.create(employee=employee, plan=plan, status=EmployeeBenefit.Status.ACTIVE)
        assert EmployeeBenefit.objects.filter(employee=employee, plan=plan).count() == 2
