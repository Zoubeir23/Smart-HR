from unittest.mock import patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.users.models import User
from smart_hr.users.otp_utils import create_otp_for_user

pytestmark = pytest.mark.django_db

REGISTER_URL = "/api/v1/auth/register/candidate/"
VERIFY_OTP_URL = "/api/v1/auth/verify-otp/"
RESEND_OTP_URL = "/api/v1/auth/resend-otp/"


@pytest.fixture
def unverified_candidate(db):
    return User.objects.create_user(
        username="unverified_cand",
        email="unverified@test.com",
        password="StrongPass123!",
        role=User.Role.CANDIDATE,
        is_email_verified=False,
    )


@pytest.fixture
def verified_candidate(db):
    return User.objects.create_user(
        username="verified_cand",
        email="verified@test.com",
        password="StrongPass123!",
        role=User.Role.CANDIDATE,
        is_email_verified=True,
    )


class TestCandidateRegisterView:
    @patch("smart_hr.users.views.registration.send_otp_verification_email")
    def test_new_candidate_registration_succeeds(self, mock_send_email):
        client = APIClient()
        payload = {
            "email": "newcand@test.com",
            "username": "newcand",
            "first_name": "Jean",
            "last_name": "Dupont",
            "password": "StrongPass123!",
            "password2": "StrongPass123!",
        }
        response = client.post(REGISTER_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(email="newcand@test.com").exists()
        new_user = User.objects.get(email="newcand@test.com")
        assert new_user.role == User.Role.CANDIDATE
        assert new_user.is_email_verified is False

    @patch("smart_hr.users.views.registration.send_otp_verification_email")
    def test_existing_unverified_receives_new_otp(self, mock_send_email, unverified_candidate):
        client = APIClient()
        payload = {
            "email": unverified_candidate.email,
            "username": "ignored",
            "password": "StrongPass123!",
            "password2": "StrongPass123!",
        }
        response = client.post(REGISTER_URL, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "code de vérification" in response.data["detail"].lower()

    def test_missing_required_fields_rejected(self):
        client = APIClient()
        response = client.post(REGISTER_URL, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch("smart_hr.users.views.registration.send_otp_verification_email")
    def test_password_mismatch_rejected_for_existing_unverified(self, mock_send_email, unverified_candidate):
        client = APIClient()
        payload = {
            "email": unverified_candidate.email,
            "password": "StrongPass123!",
            "password2": "DifferentPass456!",
        }
        response = client.post(REGISTER_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestVerifyOTPView:
    def test_missing_email_or_code_rejected(self):
        client = APIClient()
        response = client.post(VERIFY_OTP_URL, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_nonexistent_email_returns_404(self):
        client = APIClient()
        response = client.post(VERIFY_OTP_URL, {"email": "ghost@test.com", "code": "123456"}, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_already_verified_returns_200(self, verified_candidate):
        client = APIClient()
        response = client.post(
            VERIFY_OTP_URL,
            {"email": verified_candidate.email, "code": "123456"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK

    def test_invalid_otp_code_rejected(self, unverified_candidate):
        client = APIClient()
        create_otp_for_user(unverified_candidate)
        response = client.post(
            VERIFY_OTP_URL,
            {"email": unverified_candidate.email, "code": "000000"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_valid_otp_verifies_email(self, unverified_candidate):
        client = APIClient()
        _otp, raw_code = create_otp_for_user(unverified_candidate)
        response = client.post(
            VERIFY_OTP_URL,
            {"email": unverified_candidate.email, "code": raw_code},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        unverified_candidate.refresh_from_db()
        assert unverified_candidate.is_email_verified is True


class TestResendOTPView:
    def test_missing_email_rejected(self):
        client = APIClient()
        response = client.post(RESEND_OTP_URL, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_nonexistent_email_returns_neutral_response(self):
        client = APIClient()
        response = client.post(RESEND_OTP_URL, {"email": "nobody@test.com"}, format="json")
        assert response.status_code == status.HTTP_200_OK

    def test_already_verified_returns_400(self, verified_candidate):
        client = APIClient()
        response = client.post(RESEND_OTP_URL, {"email": verified_candidate.email}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch("smart_hr.users.views.registration.OTPResendThrottle.allow_request", return_value=True)
    @patch("smart_hr.users.views.registration.send_otp_verification_email")
    def test_unverified_receives_new_otp(self, mock_send_email, mock_throttle, unverified_candidate):
        client = APIClient()
        response = client.post(RESEND_OTP_URL, {"email": unverified_candidate.email}, format="json")
        assert response.status_code == status.HTTP_200_OK
        mock_send_email.assert_called_once()
