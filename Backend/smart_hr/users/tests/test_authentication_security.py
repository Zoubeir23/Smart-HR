"""Non-régression des failles d'authentification corrigées (issue #250)."""

import pytest
from django.db.utils import IntegrityError
from django.urls import NoReverseMatch
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.users.models import User

pytestmark = pytest.mark.django_db

LOGIN_URL = "/api/v1/auth/login/"
OPEN_REGISTRATION_URL = "/api/v1/auth/registration/"
EMPLOYEE_DIRECTORY_URL = "/api/v1/personnel/employees/"
STRONG_PASSWORD = "MotDePasseSolide2026!"  # noqa: S105 — identifiant de test, jamais utilisé en production


class TestOpenRegistrationIsClosed:
    """Un anonyme ne doit pas pouvoir s'auto-attribuer un compte interne."""

    def test_registration_endpoint_is_not_routed(self):
        client = APIClient()
        response = client.post(
            OPEN_REGISTRATION_URL,
            {
                "username": "intrus",
                "email": "intrus@example.com",
                "password1": STRONG_PASSWORD,
                "password2": STRONG_PASSWORD,
            },
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert not User.objects.filter(email="intrus@example.com").exists()

    def test_registration_url_name_is_not_reversible(self):
        with pytest.raises(NoReverseMatch):
            reverse("rest_register")

    def test_anonymous_cannot_reach_the_employee_directory(self):
        client = APIClient()
        response = client.get(EMPLOYEE_DIRECTORY_URL)
        assert response.status_code in {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN}


class TestGoogleSingleSignOnRoute:
    """Le bouton Google du frontend postait sur une route inexistante (404)."""

    def test_google_login_route_exists(self):
        client = APIClient()
        response = client.post("/api/v1/auth/google/", {"id_token": "jeton-invalide"}, format="json")

        assert response.status_code != status.HTTP_404_NOT_FOUND
        # Un jeton bidon doit être rejeté, pas ignoré.
        assert response.status_code in {
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        }


class TestLoginDoesNotLeakSession:
    def test_unverified_candidate_gets_no_authenticated_session(self, client):
        candidate = User.objects.create_user(
            username="candidat",
            email="candidat@example.com",
            password=STRONG_PASSWORD,
            role=User.Role.CANDIDATE,
            is_email_verified=False,
        )

        response = client.post(
            LOGIN_URL,
            {"email": candidate.email, "password": STRONG_PASSWORD},
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        # Le 403 ne doit laisser derrière lui ni session Django ni cookie JWT.
        assert client.session.get("_auth_user_id") is None
        assert "smart-hr-refresh-token" not in response.cookies


class TestRefreshTokenCookie:
    def test_refresh_token_is_never_exposed_to_javascript(self, client):
        user = User.objects.create_user(
            username="employe",
            email="employe@example.com",
            password=STRONG_PASSWORD,
            role=User.Role.EMPLOYEE,
            is_email_verified=True,
        )

        response = client.post(
            LOGIN_URL,
            {"email": user.email, "password": STRONG_PASSWORD},
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["access"]
        # Le refresh ne doit exister que dans un cookie HttpOnly.
        assert not response.json().get("refresh")
        refresh_cookie = response.cookies["smart-hr-refresh-token"]
        assert refresh_cookie["httponly"]

    def test_refresh_rotation_works_without_a_request_body(self, client):
        user = User.objects.create_user(
            username="employe2",
            email="employe2@example.com",
            password=STRONG_PASSWORD,
            role=User.Role.EMPLOYEE,
            is_email_verified=True,
        )
        client.post(
            LOGIN_URL,
            {"email": user.email, "password": STRONG_PASSWORD},
            content_type="application/json",
        )

        # Deux rafraîchissements successifs : le cookie tourné doit rester
        # valide, sinon l'utilisateur est déconnecté au bout de 2 cycles.
        first_refresh = client.post("/api/v1/auth/token/refresh/", {}, content_type="application/json")
        second_refresh = client.post("/api/v1/auth/token/refresh/", {}, content_type="application/json")

        assert first_refresh.status_code == status.HTTP_200_OK
        assert second_refresh.status_code == status.HTTP_200_OK
        assert second_refresh.json()["access"]


class TestEmailUniqueness:
    def test_duplicate_email_is_rejected_by_the_database(self):
        User.objects.create_user(username="premier", email="doublon@example.com", password=STRONG_PASSWORD)
        with pytest.raises(IntegrityError):
            User.objects.create_user(username="second", email="DOUBLON@example.com", password=STRONG_PASSWORD)

    def test_accounts_without_email_are_still_allowed(self):
        User.objects.create_user(username="technique1", email="", password=STRONG_PASSWORD)
        User.objects.create_user(username="technique2", email="", password=STRONG_PASSWORD)
        assert User.objects.filter(email="").count() == 2


class TestPasswordEndpointsThrottling:
    def test_password_reset_is_rate_limited(self):
        client = APIClient()
        statuses = [
            client.post("/api/v1/auth/password/reset/", {"email": "cible@example.com"}, format="json").status_code
            for _ in range(5)
        ]
        assert status.HTTP_429_TOO_MANY_REQUESTS in statuses
