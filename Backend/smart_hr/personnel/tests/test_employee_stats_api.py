import datetime

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.users.models import User

pytestmark = pytest.mark.django_db

STATS_URL = "/api/v1/personnel/employees/stats/"


@pytest.fixture
def department(db):
    return Department.objects.create(name="Engineering")


@pytest.fixture
def rh_user(db):
    return User.objects.create_user(
        username="rh_stats",
        email="rh_stats@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture
def employee_user(db):
    return User.objects.create_user(
        username="emp_stats",
        email="emp_stats@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


def make_employee(department, churn_risk, suffix):
    user = User.objects.create_user(
        username=f"emp_{suffix}",
        email=f"emp_{suffix}@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
    )
    return Employee.objects.create(
        user=user,
        department=department,
        hire_date=datetime.date(2023, 1, 1),
        salary=500000,
        churn_risk=churn_risk,
    )


class TestEmployeeStatsPermissions:
    def test_anonymous_cannot_access_stats(self):
        client = APIClient()
        response = client.get(STATS_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_employee_cannot_access_stats(self, employee_user):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(STATS_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestEmployeeStatsChurnRiskBuckets:
    def test_churn_risk_split_into_three_real_buckets(self, rh_user, department):
        make_employee(department, churn_risk=85, suffix="high")
        make_employee(department, churn_risk=45, suffix="medium")
        make_employee(department, churn_risk=10, suffix="low")

        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(STATS_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["churn_risk_high"] == 1
        assert response.data["churn_risk_medium"] == 1
        assert response.data["churn_risk_low"] == 1
        assert response.data["total_employees"] == 3

    def test_employee_without_churn_risk_excluded_from_all_buckets(self, rh_user, department):
        make_employee(department, churn_risk=None, suffix="unscored")

        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(STATS_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["churn_risk_high"] == 0
        assert response.data["churn_risk_medium"] == 0
        assert response.data["churn_risk_low"] == 0
        assert response.data["total_employees"] == 1

    def test_boundary_values_land_in_correct_bucket(self, rh_user, department):
        make_employee(department, churn_risk=70, suffix="boundary_high")
        make_employee(department, churn_risk=30, suffix="boundary_medium")
        make_employee(department, churn_risk=29.9, suffix="boundary_low")

        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(STATS_URL)

        assert response.data["churn_risk_high"] == 1
        assert response.data["churn_risk_medium"] == 1
        assert response.data["churn_risk_low"] == 1
