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
        assert response.status_code == status.HTTP_201_CREATED
        assert mock_send_email.called

    def test_missing_required_fields_rejected(self):
        client = APIClient()
        response = client.post(REGISTER_URL, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch("smart_hr.users.views.registration.send_otp_verification_email")
    def test_existing_account_password_is_never_overwritten(self, mock_send_email, unverified_candidate):
        """Un tiers ne doit pas pouvoir imposer son mot de passe à une inscription en attente."""
        client = APIClient()
        payload = {
            "email": unverified_candidate.email,
            "first_name": "Attaquant",
            "password": "MotDePasseAttaquant2026!",
            "password2": "MotDePasseAttaquant2026!",
        }
        response = client.post(REGISTER_URL, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        unverified_candidate.refresh_from_db()
        assert unverified_candidate.check_password("StrongPass123!")
        assert not unverified_candidate.check_password("MotDePasseAttaquant2026!")
        assert unverified_candidate.first_name != "Attaquant"

    @patch("smart_hr.users.views.registration.send_otp_verification_email")
    def test_response_does_not_reveal_existing_account(self, mock_send_email, verified_candidate):
        """La réponse doit être identique pour un email libre et un email déjà pris."""
        client = APIClient()
        credentials = {"password": "StrongPass123!", "password2": "StrongPass123!"}

        taken_email_response = client.post(
            REGISTER_URL,
            {"email": verified_candidate.email, **credentials},
            format="json",
        )
        free_email_response = client.post(
            REGISTER_URL,
            {"email": "libre@test.com", "first_name": "Awa", **credentials},
            format="json",
        )

        assert taken_email_response.status_code == free_email_response.status_code
        assert taken_email_response.data["detail"] == free_email_response.data["detail"]

    @patch("smart_hr.users.views.registration.send_otp_verification_email")
    def test_username_is_generated_server_side_for_homonyms(self, mock_send_email):
        """Deux parties locales identiques ne doivent plus provoquer d'erreur d'unicité."""
        client = APIClient()
        credentials = {"password": "StrongPass123!", "password2": "StrongPass123!"}

        first_response = client.post(
            REGISTER_URL,
            {"email": "jean.dupont@example.com", **credentials},
            format="json",
        )
        second_response = client.post(
            REGISTER_URL,
            {"email": "jean.dupont@autre-domaine.com", **credentials},
            format="json",
        )

        assert first_response.status_code == status.HTTP_201_CREATED
        assert second_response.status_code == status.HTTP_201_CREATED
        usernames = set(User.objects.filter(email__startswith="jean.dupont").values_list("username", flat=True))
        assert len(usernames) == 2


class TestVerifyOTPView:
    def test_missing_email_or_code_rejected(self):
        client = APIClient()
        response = client.post(VERIFY_OTP_URL, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unknown_and_verified_emails_share_the_same_response(self, verified_candidate):
        """Ni l'existence du compte ni son état de vérification ne doivent fuiter."""
        client = APIClient()
        unknown_email_response = client.post(
            VERIFY_OTP_URL,
            {"email": "ghost@test.com", "code": "123456"},
            format="json",
        )
        verified_email_response = client.post(
            VERIFY_OTP_URL,
            {"email": verified_candidate.email, "code": "123456"},
            format="json",
        )

        assert unknown_email_response.status_code == status.HTTP_400_BAD_REQUEST
        assert verified_email_response.status_code == status.HTTP_400_BAD_REQUEST
        assert unknown_email_response.data["detail"] == verified_email_response.data["detail"]

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

    @patch("smart_hr.users.views.registration.send_otp_verification_email")
    def test_already_verified_gets_the_neutral_response(self, mock_send_email, verified_candidate):
        """Un email déjà vérifié ne doit pas se distinguer d'un email inconnu."""
        client = APIClient()
        response = client.post(RESEND_OTP_URL, {"email": verified_candidate.email}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert not mock_send_email.called

    @patch("smart_hr.users.views.registration.OTPResendThrottle.allow_request", return_value=True)
    @patch("smart_hr.users.views.registration.send_otp_verification_email")
    def test_unverified_receives_new_otp(self, mock_send_email, mock_throttle, unverified_candidate):
        client = APIClient()
        response = client.post(RESEND_OTP_URL, {"email": unverified_candidate.email}, format="json")
        assert response.status_code == status.HTTP_200_OK
        mock_send_email.assert_called_once()
