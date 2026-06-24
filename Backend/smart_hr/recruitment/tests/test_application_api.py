import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.recruitment.models import Application
from smart_hr.recruitment.models import JobOffer
from smart_hr.users.models import User

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
    def test_analyze_cv_triggers_analysis(self, rh_user, application):
        client = APIClient()
        client.force_authenticate(user=rh_user)
        url = f"{LIST_URL}{application.pk}/analyze-cv/"
        response = client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert "matching_score" in response.data

    def test_candidate_cannot_trigger_analysis(self, candidate_user, application):
        client = APIClient()
        client.force_authenticate(user=candidate_user)
        url = f"{LIST_URL}{application.pk}/analyze-cv/"
        response = client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
