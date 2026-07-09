from __future__ import annotations

import io

import openpyxl
import pytest
from rest_framework.test import APIClient

from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

EXPORT_URL = "/api/v1/stats/overview/export/"


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


@pytest.fixture
def employee_user(db) -> User:
    return UserFactory.create(role=User.Role.EMPLOYEE)


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


class TestHRAnalyticsExportView:
    def test_rh_can_download_multi_sheet_workbook(self, rh_user):
        response = _authenticated_client(rh_user).get(EXPORT_URL)

        assert response.status_code == 200
        assert "spreadsheetml" in response["Content-Type"]
        assert "people_analytics.xlsx" in response["Content-Disposition"]

        workbook = openpyxl.load_workbook(io.BytesIO(response.content))
        assert "Effectifs" in workbook.sheetnames
        assert "Recrutement" in workbook.sheetnames
        assert "Organigramme" in workbook.sheetnames

    def test_employee_cannot_access_export(self, employee_user):
        response = _authenticated_client(employee_user).get(EXPORT_URL)
        assert response.status_code == 403

    def test_anonymous_cannot_access_export(self):
        response = APIClient().get(EXPORT_URL)
        assert response.status_code == 401
