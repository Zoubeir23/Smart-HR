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


class _FakeSocialLogin:
    """Substitut minimal de allauth.socialaccount.models.SocialLogin.

    populate_user() ne lit que l'attribut `.user` de son deuxième argument —
    inutile de construire une vraie négociation OAuth2 pour tester la logique
    d'attribution du rôle.
    """

    def __init__(self, user: User) -> None:
        self.user = user


class TestGoogleSignupCreatesCandidateOnly:
    """Un nouveau compte créé via Google doit être un CANDIDATE pré-vérifié,
    jamais un compte interne — même si l'inscription libre classique est fermée."""

    def test_populate_user_assigns_candidate_role_and_skips_otp(self):
        from smart_hr.users.adapters import SocialAccountAdapter

        new_user = User()
        sociallogin = _FakeSocialLogin(new_user)
        data = {"email": "candidat.google@example.com", "first_name": "Awa", "last_name": "Diallo"}

        populated_user = SocialAccountAdapter().populate_user(request=None, sociallogin=sociallogin, data=data)

        assert populated_user.role == User.Role.CANDIDATE
        assert populated_user.is_email_verified is True
        assert populated_user.first_name == "Awa"
        assert populated_user.last_name == "Diallo"

    def test_social_signup_stays_open_even_when_form_registration_is_closed(self, settings):
        from smart_hr.users.adapters import SocialAccountAdapter

        settings.ACCOUNT_ALLOW_REGISTRATION = False

        is_open = SocialAccountAdapter().is_open_for_signup(request=None, sociallogin=_FakeSocialLogin(User()))

        assert is_open is True


class TestGoogleConnectsToExistingAccount:
    """dj_rest_auth refuse par défaut toute connexion sociale dont l'email
    correspond à un compte déjà existant (ValidationError "already
    registered"), avant même que l'auto-connexion par email d'allauth ait pu
    s'exécuter — cassant Google pour TOUT utilisateur déjà inscrit (admin, RH,
    employé, candidat). Confirmé en production : un admin ne pouvait plus se
    connecter du tout via Google.

    On ne mocke que la vérification cryptographique du jeton (pas d'appel
    réseau aux certificats Google) : tout le câblage allauth réel (provider,
    SocialAccount, populate_user) s'exécute normalement, pour un test fidèle
    au comportement de production.
    """

    def _mock_google_claims(self, *, email: str, email_verified: bool):
        return {
            "sub": "google-uid-123",
            "email": email,
            "email_verified": email_verified,
            "given_name": "Prénom",
            "family_name": "Nom",
        }

    def test_first_google_login_connects_to_existing_account_of_any_role(self, client):
        from unittest.mock import patch

        existing_admin = User.objects.create_user(
            username="admin_existant",
            email="admin.existant@example.com",
            password=STRONG_PASSWORD,
            role=User.Role.ADMIN,
            is_email_verified=True,
        )

        with patch(
            "allauth.socialaccount.providers.google.views._verify_and_decode",
            return_value=self._mock_google_claims(email=existing_admin.email, email_verified=True),
        ):
            response = client.post(
                "/api/v1/auth/google/",
                {"id_token": "jeton-simule"},
                content_type="application/json",
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["user"]["email"] == existing_admin.email
        # Aucun doublon : on s'est connecté au compte existant, pas créé un nouveau.
        assert User.objects.filter(email__iexact=existing_admin.email).count() == 1
        existing_admin.refresh_from_db()
        assert existing_admin.role == User.Role.ADMIN

    def test_unverified_google_email_does_not_connect_to_existing_account(self, client):
        """Sécurité : seul un email certifié par Google (email_verified) peut
        se connecter à un compte existant — sinon n'importe qui pourrait
        usurper un compte en déclarant simplement son adresse."""
        from unittest.mock import patch

        existing_user = User.objects.create_user(
            username="cible",
            email="cible@example.com",
            password=STRONG_PASSWORD,
            role=User.Role.EMPLOYEE,
            is_email_verified=True,
        )

        with patch(
            "allauth.socialaccount.providers.google.views._verify_and_decode",
            return_value=self._mock_google_claims(email=existing_user.email, email_verified=False),
        ):
            response = client.post(
                "/api/v1/auth/google/",
                {"id_token": "jeton-simule"},
                content_type="application/json",
            )

        # Ne doit pas se connecter silencieusement au compte existant.
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_new_email_still_creates_a_candidate_account(self, client):
        """Non-régression : le fix ne doit pas casser la création de compte
        pour une adresse Google totalement nouvelle."""
        from unittest.mock import patch

        with patch(
            "allauth.socialaccount.providers.google.views._verify_and_decode",
            return_value=self._mock_google_claims(email="nouveau.candidat@example.com", email_verified=True),
        ):
            response = client.post(
                "/api/v1/auth/google/",
                {"id_token": "jeton-simule"},
                content_type="application/json",
            )

        assert response.status_code == status.HTTP_200_OK
        new_user = User.objects.get(email__iexact="nouveau.candidat@example.com")
        assert new_user.role == User.Role.CANDIDATE
        assert new_user.is_email_verified is True


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
