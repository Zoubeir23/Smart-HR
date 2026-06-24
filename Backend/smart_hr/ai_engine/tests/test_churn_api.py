import datetime
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.ai_engine.models import ChurnPrediction
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position
from smart_hr.users.models import User

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/ai-engine/churn-predictions/"
HIGH_RISK_URL = "/api/v1/ai-engine/churn-predictions/high-risk/"


@pytest.fixture()
def rh_user(db):
    return User.objects.create_user(
        username="rh_churn",
        email="rh_churn@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture()
def employee_user(db):
    return User.objects.create_user(
        username="emp_churn",
        email="emp_churn@test.com",
        password="pass1234!",
        role=User.Role.EMPLOYEE,
        is_email_verified=True,
    )


@pytest.fixture()
def department(db):
    return Department.objects.create(name="Tech Churn")


@pytest.fixture()
def position(db):
    return Position.objects.create(title="Développeur Churn")


@pytest.fixture()
def employee(employee_user, department, position):
    return Employee.objects.create(
        user=employee_user,
        department=department,
        position=position,
        hire_date=datetime.date(2020, 1, 1),
        salary=500000,
    )


@pytest.fixture()
def churn_prediction(employee):
    return ChurnPrediction.objects.create(
        employee=employee,
        risk_score=75.0,
        risk_level=ChurnPrediction.RiskLevel.HIGH,
        main_risk_factor="Salaire bas",
        factors=["Salaire bas", "Ancienneté courte"],
        recommendations=["Planifier un entretien individuel."],
    )


@pytest.fixture()
def low_risk_prediction(employee):
    return ChurnPrediction.objects.create(
        employee=employee,
        risk_score=25.0,
        risk_level=ChurnPrediction.RiskLevel.LOW,
        main_risk_factor="Facteur indéterminé",
        factors=[],
        recommendations=[],
    )


def _make_mock_model():
    """Crée un mock de modèle sklearn avec predict_proba et feature_importances_."""
    import numpy as np

    mock_model = MagicMock()
    mock_model.predict_proba.return_value = [[0.25, 0.75]]
    mock_model.feature_importances_ = np.array([0.3, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1])
    return mock_model


class TestChurnPredictionPermissions:
    def test_anonymous_cannot_list(self):
        client = APIClient()
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_employee_cannot_list(self, employee_user):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rh_can_list(self, rh_user, churn_prediction):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK


class TestChurnHighRisk:
    def test_high_risk_returns_only_high_predictions(self, rh_user, churn_prediction, low_risk_prediction):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(HIGH_RISK_URL)
        assert response.status_code == status.HTTP_200_OK
        risk_scores = [item["risk_score"] for item in response.data]
        assert all(score >= 70 for score in risk_scores)

    def test_high_risk_requires_rh(self, employee_user):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        response = client.get(HIGH_RISK_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestChurnPredict:
    def test_predict_employee_not_found_returns_404(self, rh_user):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}predict/99999/"
        response = client.post(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_predict_model_not_available_returns_503(self, rh_user, employee):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        with patch("smart_hr.ai_engine.views.churn._load_model", return_value=None):
            url = f"{LIST_URL}predict/{employee.pk}/"
            response = client.post(url)
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE

    @patch("smart_hr.ai_engine.views.churn._notify_rh_high_churn_risk")
    @patch("smart_hr.ai_engine.views.churn._load_model")
    def test_predict_with_mock_model_creates_prediction(self, mock_load, mock_notify, rh_user, employee):
        mock_load.return_value = _make_mock_model()
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}predict/{employee.pk}/"
        response = client.post(url)
        assert response.status_code == status.HTTP_201_CREATED
        assert "risk_score" in response.data
        assert ChurnPrediction.objects.filter(employee=employee).exists()

    @patch("smart_hr.ai_engine.views.churn._notify_rh_high_churn_risk")
    @patch("smart_hr.ai_engine.views.churn._load_model")
    def test_high_risk_triggers_notification(self, mock_load, mock_notify, rh_user, employee):
        mock_load.return_value = _make_mock_model()
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}predict/{employee.pk}/"
        client.post(url)
        mock_notify.assert_called_once()

    def test_predict_requires_rh(self, employee_user, employee):
        client = APIClient()
        client.force_authenticate(user=employee_user)
        url = f"{LIST_URL}predict/{employee.pk}/"
        response = client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
