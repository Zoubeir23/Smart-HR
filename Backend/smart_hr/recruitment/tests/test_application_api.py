from unittest.mock import Mock
from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.test import APIClient

from smart_hr.recruitment.models import Application
from smart_hr.recruitment.models import JobOffer
from smart_hr.recruitment.views.application import ApplicationViewSet
from smart_hr.users.models import User
from smart_hr.users.permissions import IsRH

pytestmark = pytest.mark.django_db


@pytest.fixture
def rh_user(db):
    return User.objects.create_user(
        username="rh_app",
        email="rh_app@test.com",
        password="pass1234!",
        role=User.Role.RH,
        is_email_verified=True,
    )


@pytest.fixture
def candidate_user(db):
    return User.objects.create_user(
        username="cand_app",
        email="cand_app@test.com",
        password="pass1234!",
        role=User.Role.CANDIDATE,
        is_email_verified=True,
    )


@pytest.fixture
def other_candidate(db):
    return User.objects.create_user(
        username="cand2_app",
        email="cand2_app@test.com",
        password="pass1234!",
        role=User.Role.CANDIDATE,
        is_email_verified=True,
    )


@pytest.fixture
def open_job(rh_user):
    return JobOffer.objects.create(
        title="Dev Backend",
        department="Tech",
        description="Développeur backend",
        status=JobOffer.Status.OPEN,
        created_by=rh_user,
    )


@pytest.fixture
def fake_cv():
    content = b"%PDF-1.4 fake pdf content for testing purposes"
    return SimpleUploadedFile("cv_test.pdf", content, content_type="application/pdf")


@pytest.fixture
def application(candidate_user, open_job, fake_cv):
    return Application.objects.create(
        job_offer=open_job,
        candidate=candidate_user,
        cv=fake_cv,
        gdpr_consent=True,
        matching_score=75.0,
        skills_extracted=["Python", "Django"],
        ai_summary="Bon profil.",
    )


LIST_URL = "/api/v1/recruitment/applications/"


class TestApplicationPermissions:
    def test_anonymous_cannot_list(self):
        client = APIClient()
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_rh_can_list_all(self, rh_user, application):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1

    def test_candidate_sees_only_own(self, candidate_user, other_candidate, open_job, fake_cv):
        Application.objects.create(
            job_offer=open_job,
            candidate=other_candidate,
            cv=SimpleUploadedFile("cv2.pdf", b"%PDF other", content_type="application/pdf"),
            gdpr_consent=True,
        )
        app_mine = Application.objects.create(
            job_offer=open_job,
            candidate=candidate_user,
            cv=SimpleUploadedFile("cv3.pdf", b"%PDF mine", content_type="application/pdf"),
            gdpr_consent=True,
        )
        client = APIClient()
        client.force_authenticate(user=candidate_user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data["results"]]
        assert app_mine.pk in ids
        assert len(ids) == 1

    def test_candidate_cannot_see_internal_note(self, candidate_user, application):
        client = APIClient()
        client.force_authenticate(user=candidate_user)
        url = f"{LIST_URL}{application.pk}/"
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert "internal_note" not in response.data

    def test_rh_can_see_internal_note(self, rh_user, application):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{application.pk}/"
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert "internal_note" in response.data


class TestApplicationFilters:
    def test_filter_by_min_score(self, rh_user, application):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL + "?min_score=80")
        assert response.status_code == status.HTTP_200_OK
        assert all(item["matching_score"] >= 80 for item in response.data["results"])

    def test_filter_by_min_score_invalid(self, rh_user):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL + "?min_score=abc")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_filter_by_job_offer(self, rh_user, application, open_job):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL + f"?job_offer={open_job.pk}")
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data["results"]]
        assert application.pk in ids

    def test_filter_by_status(self, rh_user, application):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL + "?status=pending")
        assert response.status_code == status.HTTP_200_OK

    def test_filter_by_job_offer_invalid(self, rh_user):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        response = client.get(LIST_URL + "?job_offer=abc")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestGetPermissionsHonorsActionDecorator:
    def test_action_declared_permission_classes_take_priority(self):
        """Régression : get_permissions() décidait uniquement via son switch
        interne (create / list-retrieve / défaut IsRH), en ignorant tout
        permission_classes= déclaré sur le décorateur @action d'une action —
        ce paramètre était du code mort (aucune action existante n'en
        souffrait car leur défaut IsRH coïncidait, mais une nouvelle action
        déclarant une permission différente serait silencieusement retombée
        sur IsRH). Simule une action dont le décorateur déclare une
        permission distincte du défaut et vérifie qu'elle est bien honorée.
        """
        view = ApplicationViewSet()
        view.action = "fake_action"
        view.fake_action = Mock(kwargs={"permission_classes": [IsAuthenticated]})

        permissions = view.get_permissions()

        assert len(permissions) == 1
        assert isinstance(permissions[0], IsAuthenticated)

    def test_action_without_declared_permission_classes_falls_back_to_default(self):
        """Sans permission_classes= sur le décorateur, la règle par défaut
        (IsRH pour les actions hors create/list/retrieve) s'applique toujours."""
        view = ApplicationViewSet()
        view.action = "anonymize"

        permissions = view.get_permissions()

        assert len(permissions) == 1
        assert isinstance(permissions[0], IsRH)


class TestApplicationInternalNote:
    def test_rh_can_add_note(self, rh_user, application):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{application.pk}/add-note/"
        response = client.patch(url, {"internal_note": "Excellent candidat"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        application.refresh_from_db()
        assert application.internal_note == "Excellent candidat"

    def test_candidate_cannot_add_note(self, candidate_user, application):
        client = APIClient()
        client.force_authenticate(user=candidate_user)
        url = f"{LIST_URL}{application.pk}/add-note/"
        response = client.patch(url, {"internal_note": "hack"}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestApplicationStatusUpdate:
    def test_rh_can_update_status(self, rh_user, application):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{application.pk}/update-status/"
        response = client.patch(url, {"status": "reviewing"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        application.refresh_from_db()
        assert application.status == Application.Status.REVIEWING

    def test_invalid_status_rejected(self, rh_user, application):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{application.pk}/update-status/"
        response = client.patch(url, {"status": "invalid_status"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestApplicationAnalyzeCV:
    @patch("smart_hr.recruitment.views.application.analyze_cv_async")
    def test_analyze_cv_triggers_analysis(self, mock_task, rh_user, application):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{application.pk}/analyze-cv/"
        response = client.post(url)
        assert response.status_code == status.HTTP_202_ACCEPTED
        assert response.data["application_id"] == application.pk
        mock_task.delay.assert_called_once_with(application.pk)

    def test_candidate_cannot_trigger_analysis(self, candidate_user, application):
        client = APIClient()
        client.force_authenticate(user=candidate_user)
        url = f"{LIST_URL}{application.pk}/analyze-cv/"
        response = client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestApplicationCreate:
    @staticmethod
    def _payload(job_offer_id, cv):
        return {
            "job_offer": str(job_offer_id),
            "cv": cv,
            "cover_letter": "Ma lettre de motivation",
            "gdpr_consent": "true",
        }

    @patch("smart_hr.recruitment.views.application.analyze_cv_async")
    def test_candidate_can_apply_with_multipart_payload(
        self,
        mock_task,
        candidate_user,
        open_job,
        fake_cv,
    ):
        client = APIClient()
        client.force_authenticate(user=candidate_user)
        response = client.post(
            LIST_URL,
            self._payload(open_job.id, fake_cv),
            format="multipart",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["job_offer"] == open_job.id

    def test_duplicate_application_returns_400_not_500(
        self,
        candidate_user,
        open_job,
        fake_cv,
    ):
        """Régression : candidater deux fois à la même offre levait un
        IntegrityError (unique_together job_offer+candidate) non intercepté
        par le serializer — `candidate` étant read_only, DRF ne génère pas
        automatiquement le UniqueTogetherValidator. Résultat en production :
        un 500 brut au lieu d'un message de validation propre."""
        client = APIClient()
        client.force_authenticate(user=candidate_user)

        first = client.post(
            LIST_URL,
            self._payload(open_job.id, fake_cv),
            format="multipart",
        )
        assert first.status_code == status.HTTP_201_CREATED

        second_cv = SimpleUploadedFile(
            "cv_test_2.pdf",
            b"%PDF-1.4 fake pdf content for testing purposes",
            content_type="application/pdf",
        )
        second = client.post(
            LIST_URL,
            self._payload(open_job.id, second_cv),
            format="multipart",
        )
        assert second.status_code == status.HTTP_400_BAD_REQUEST
        assert "job_offer" in second.data
